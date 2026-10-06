const { Queue } = require('bullmq');
const { redisConfig, isRedisEnabled, isRedisReachable, recordRedisMetric } = require('../config/redis');

const EMAIL_QUEUE_NAME = 'email-queue';

let emailQueue = null;

const getEmailQueue = () => {
  if (!isRedisEnabled()) {
    return null;
  }

  if (!emailQueue) {
    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        // Auto-remove completed jobs: Status and delivery receipts are permanently stored in MongoDB EmailNotificationLog
        removeOnComplete: true,
        // Retain only last 100 failed jobs for max 24 hours to prevent Redis unbounded key accumulation
        removeOnFail: {
          age: 24 * 3600,
          count: 100
        }
      }
    });

    console.log(`[Queue] Initialized BullMQ queue: ${EMAIL_QUEUE_NAME}`);
  }

  return emailQueue;
};

/**
 * Add a single email job to queue (BullMQ or asynchronous background fallback)
 */
const addEmailJob = async (jobData, customOptions = {}) => {
  const isAvailable = await isRedisReachable();
  const jobName = jobData.type || 'SEND_EMAIL';
  const jobId = customOptions.jobId || (
    jobData.placementDriveId && (jobData.studentId || jobData.userId || jobData.email)
      ? `email_${jobData.type || 'PUBLISH'}_${jobData.placementDriveId}_${jobData.studentId || jobData.userId || jobData.email}`
      : `email_${Date.now()}_${Math.random().toString(36).substring(7)}`
  );

  if (isAvailable) {
    try {
      const queue = getEmailQueue();
      if (queue) {
        recordRedisMetric('EMAIL_QUEUE', 'job', 1);
        recordRedisMetric('EMAIL_QUEUE', 'command', 5);
        const job = await queue.add(jobName, jobData, {
          ...customOptions,
          jobId
        });
        return job;
      }
    } catch (e) {
      console.warn('[Queue] Redis add failed:', e.message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`[Queue Fatal] Failed to enqueue email job to Redis in production: ${e.message}`);
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Queue Fatal] Redis is unreachable or unconfigured in production. Silent in-memory fallback is prohibited.');
  }

  // Fallback: Asynchronous background execution via setImmediate (development only)
  setImmediate(async () => {
    try {
      const { processEmailJob } = require('../workers/emailWorker');
      await processEmailJob(jobData, { id: jobId, attemptsMade: 0 });
    } catch (err) {
      console.error('[AsyncBackgroundEmail] Error processing job:', err.message);
    }
  });

  return { id: jobId, name: jobName, data: jobData };
};

/**
 * Add bulk email jobs efficiently (BullMQ or asynchronous background fallback)
 */
const addEmailJobsBulk = async (jobsArray) => {
  const isAvailable = await isRedisReachable();

  if (isAvailable) {
    try {
      const queue = getEmailQueue();
      if (queue) {
        const formattedJobs = jobsArray.map((item) => {
          const jobData = item.data || item;
          const customOpts = item.opts || {};
          const jobId = customOpts.jobId || (
            jobData.placementDriveId && (jobData.studentId || jobData.userId || jobData.email)
              ? `email_${jobData.type || 'PUBLISH'}_${jobData.placementDriveId}_${jobData.studentId || jobData.userId || jobData.email}`
              : undefined
          );

          return {
            name: jobData.type || 'SEND_EMAIL',
            data: jobData,
            opts: {
              ...customOpts,
              ...(jobId ? { jobId } : {})
            }
          };
        });

        recordRedisMetric('EMAIL_QUEUE', 'job', formattedJobs.length);
        recordRedisMetric('EMAIL_QUEUE', 'command', Math.max(1, Math.ceil(formattedJobs.length * 3.5)));
        const addedJobs = await queue.addBulk(formattedJobs);
        return addedJobs;
      }
    } catch (e) {
      console.warn('[Queue] Redis bulk add failed:', e.message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`[Queue Fatal] Failed to bulk enqueue email jobs to Redis in production: ${e.message}`);
      }
    }
  }


  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Queue Fatal] Redis is unreachable or unconfigured in production. Silent in-memory bulk fallback is prohibited.');
  }

  // Fallback: Asynchronous background execution via setImmediate (development only)
  setImmediate(async () => {
    try {
      const { processEmailJob } = require('../workers/emailWorker');
      for (const item of jobsArray) {
        const jobData = item.data || item;
        const customOpts = item.opts || {};
        try {
          await processEmailJob(jobData, { id: customOpts.jobId, attemptsMade: 0 });
        } catch (err) {
          console.error('[AsyncBackgroundEmail] Error processing bulk item:', err.message);
        }
      }
    } catch (err) {
      console.error('[AsyncBackgroundEmail Bulk Error]', err.stack || err.message);
    }
  });

  return jobsArray.map((item, idx) => {
    const jobData = item.data || item;
    const customOpts = item.opts || {};
    return {
      id: customOpts.jobId || `inmem_${Date.now()}_${idx}`,
      name: jobData.type || 'SEND_EMAIL',
      data: jobData
    };
  });
};

module.exports = {
  EMAIL_QUEUE_NAME,
  getEmailQueue,
  addEmailJob,
  addEmailJobsBulk
};

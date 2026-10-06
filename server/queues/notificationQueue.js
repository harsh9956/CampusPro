const { Queue } = require('bullmq');
const { redisConfig, isRedisEnabled, isRedisReachable, recordRedisMetric } = require('../config/redis');

const NOTIFICATION_QUEUE_NAME = 'notification-queue';

let notificationQueue = null;

const getNotificationQueue = () => {
  if (!isRedisEnabled()) {
    return null;
  }

  if (!notificationQueue) {
    notificationQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        // Auto-remove completed jobs: In-app notifications are directly written to MongoDB Notification collection
        removeOnComplete: true,
        // Retain only last 100 failed jobs for max 24 hours to prevent Redis unbounded key accumulation
        removeOnFail: {
          age: 24 * 3600,
          count: 100
        }
      }
    });

    console.log(`[Queue] Initialized BullMQ queue: ${NOTIFICATION_QUEUE_NAME}`);
  }

  return notificationQueue;
};

/**
 * Add a notification job to queue (BullMQ or asynchronous background fallback)
 */
const addNotificationJob = async (jobData, customOptions = {}) => {
  const isAvailable = await isRedisReachable();
  const jobName = jobData.type || 'NOTIFICATION_JOB';
  const jobId = customOptions.jobId || `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  if (isAvailable) {
    try {
      const queue = getNotificationQueue();
      if (queue) {
        recordRedisMetric('NOTIFICATION_QUEUE', 'job', 1);
        recordRedisMetric('NOTIFICATION_QUEUE', 'command', 5);
        const job = await queue.add(jobName, jobData, { ...customOptions, jobId });
        return job;
      }
    } catch (e) {
      console.warn('[Queue] Redis add notification failed:', e.message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`[Queue Fatal] Failed to enqueue notification job to Redis in production: ${e.message}`);
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Queue Fatal] Redis is unreachable or unconfigured in production. Silent in-memory fallback is prohibited.');
  }

  // Fallback: Asynchronous background execution via setImmediate (development only)
  setImmediate(async () => {
    try {
      const { processNotificationJob } = require('../workers/notificationWorker');
      await processNotificationJob(jobData, { id: jobId, attemptsMade: 0 });
    } catch (err) {
      console.error('[AsyncBackgroundNotification] Error processing job:', err.message);
    }
  });

  return { id: jobId, name: jobName, data: jobData };
};

/**
 * Add bulk notification jobs (BullMQ or asynchronous background fallback)
 */
const addNotificationJobsBulk = async (jobsArray) => {
  const isAvailable = await isRedisReachable();

  if (isAvailable) {
    try {
      const queue = getNotificationQueue();
      if (queue) {
        const formattedJobs = jobsArray.map((item) => ({
          name: item.data?.type || item.type || 'NOTIFICATION_JOB',
          data: item.data || item,
          opts: item.opts || {}
        }));

        recordRedisMetric('NOTIFICATION_QUEUE', 'job', formattedJobs.length);
        recordRedisMetric('NOTIFICATION_QUEUE', 'command', Math.max(1, Math.ceil(formattedJobs.length * 3.5)));
        const addedJobs = await queue.addBulk(formattedJobs);
        return addedJobs;
      }
    } catch (e) {
      console.warn('[Queue] Redis bulk add notifications failed:', e.message);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`[Queue Fatal] Failed to bulk enqueue notification jobs to Redis in production: ${e.message}`);
      }
    }
  }


  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Queue Fatal] Redis is unreachable or unconfigured in production. Silent in-memory bulk fallback is prohibited.');
  }

  // Fallback: Asynchronous background execution via setImmediate (development only)
  setImmediate(async () => {
    try {
      const { processNotificationJob } = require('../workers/notificationWorker');
      for (const item of jobsArray) {
        const jobData = item.data || item;
        const customOpts = item.opts || {};
        try {
          await processNotificationJob(jobData, { id: customOpts.jobId, attemptsMade: 0 });
        } catch (err) {
          console.error('[AsyncBackgroundNotification] Error processing bulk item:', err.message);
        }
      }
    } catch (err) {
      console.error('[AsyncBackgroundNotification Bulk Error]', err.message);
    }
  });

  return jobsArray.map((item, idx) => {
    const jobData = item.data || item;
    const customOpts = item.opts || {};
    return {
      id: customOpts.jobId || `inmem_notif_${Date.now()}_${idx}`,
      name: jobData.type || 'NOTIFICATION_JOB',
      data: jobData
    };
  });
};

module.exports = {
  NOTIFICATION_QUEUE_NAME,
  getNotificationQueue,
  addNotificationJob,
  addNotificationJobsBulk
};

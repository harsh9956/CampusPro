const { Queue } = require('bullmq');
const { redisConfig, isRedisEnabled } = require('../config/redis');

const EXPORT_QUEUE_NAME = 'export-queue';

let exportQueue = null;

const getExportQueue = () => {
  if (!isRedisEnabled()) {
    throw new Error('Redis is not enabled. Cannot initialize exportQueue.');
  }

  if (!exportQueue) {
    exportQueue = new Queue(EXPORT_QUEUE_NAME, {
      connection: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 5000
        },
        removeOnFail: {
          age: 48 * 3600
        }
      }
    });

    console.log(`[Queue] Initialized BullMQ queue: ${EXPORT_QUEUE_NAME}`);
  }

  return exportQueue;
};

/**
 * Add an export job to queue
 */
const addExportJob = async (jobData, customOptions = {}) => {
  const queue = getExportQueue();
  const jobName = jobData.type || 'EXCEL_EXPORT';

  const job = await queue.add(jobName, jobData, {
    ...customOptions,
    jobId: jobData.exportJobId ? `export_${jobData.exportJobId}` : undefined
  });
  return job;
};

module.exports = {
  EXPORT_QUEUE_NAME,
  getExportQueue,
  addExportJob
};

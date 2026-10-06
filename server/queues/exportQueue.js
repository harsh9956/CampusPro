const { Queue } = require('bullmq');
const { redisConfig, isRedisEnabled, recordRedisMetric } = require('../config/redis');

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
        // Auto-remove completed jobs: Export status, download URLs, and metadata are saved in MongoDB ExportJob
        removeOnComplete: true,
        // Retain only last 50 failed jobs for max 24 hours
        removeOnFail: {
          age: 24 * 3600,
          count: 50
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

  recordRedisMetric('EXPORT_QUEUE', 'job', 1);
  recordRedisMetric('EXPORT_QUEUE', 'command', 5);

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

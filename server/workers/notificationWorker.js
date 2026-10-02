const { Worker } = require('bullmq');
const { redisConfig, isRedisEnabled } = require('../config/redis');
const { NOTIFICATION_QUEUE_NAME } = require('../queues/notificationQueue');
const Notification = require('../models/Notification');

const CONCURRENCY = parseInt(process.env.NOTIFICATION_WORKER_CONCURRENCY || '10', 10);
const BATCH_SIZE = 500;

let notificationWorker = null;

const processNotificationJob = async (jobData, jobContext = {}) => {
  const { type, notifications, notification } = jobData;
  const jobId = jobContext.id || `notif_${Date.now()}`;
  console.log(`[NotificationWorker] Processing job ${jobId} (Type: ${type}, Attempt: ${(jobContext.attemptsMade || 0) + 1})`);

  const itemsToInsert = [];

  if (Array.isArray(notifications)) {
    itemsToInsert.push(...notifications);
  } else if (notification) {
    itemsToInsert.push(notification);
  } else if (jobData.user) {
    itemsToInsert.push(jobData);
  }

  if (itemsToInsert.length === 0) {
    console.log(`[NotificationWorker] Job ${jobId} contained 0 notifications to insert.`);
    return { insertedCount: 0 };
  }

  let totalInserted = 0;

  // Process in batched bulkWrite operations to protect MongoDB resources
  for (let i = 0; i < itemsToInsert.length; i += BATCH_SIZE) {
    const batch = itemsToInsert.slice(i, i + BATCH_SIZE);
    const operations = batch.map((item) => ({
      insertOne: {
        document: {
          user: item.user || item.userId,
          title: item.title,
          message: item.message,
          type: item.type || 'PLACEMENT_DRIVE',
          relatedId: item.relatedId || null,
          link: item.link || '',
          isRead: false,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
        }
      }
    }));

    const result = await Notification.bulkWrite(operations, { ordered: false });
    totalInserted += (result.insertedCount || batch.length);
  }

  console.log(`[NotificationWorker] Job ${jobId} finished: inserted ${totalInserted} notifications.`);
  return { success: true, insertedCount: totalInserted };
};

const createNotificationWorker = () => {
  if (!isRedisEnabled()) {
    console.warn('[NotificationWorker] Redis is disabled. Notification worker will not be started.');
    return null;
  }

  notificationWorker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job) => {
      return await processNotificationJob(job.data, {
        id: job.id,
        attemptsMade: job.attemptsMade
      });
    },
    {
      connection: redisConfig,
      concurrency: CONCURRENCY
    }
  );

  notificationWorker.on('completed', (job) => {
    console.log(`[NotificationWorker] Job ${job.id} completed successfully`);
  });

  notificationWorker.on('failed', (job, err) => {
    console.error(`[NotificationWorker] Job ${job?.id} failed: ${err.message}`);
  });

  notificationWorker.on('error', (err) => {
    console.error('[NotificationWorker Error]', err.message);
  });

  console.log(`[Worker] Notification worker started with concurrency ${CONCURRENCY}`);
  return notificationWorker;
};

module.exports = {
  createNotificationWorker,
  getNotificationWorker: () => notificationWorker,
  processNotificationJob
};

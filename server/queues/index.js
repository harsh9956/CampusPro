const { getEmailQueue, EMAIL_QUEUE_NAME, addEmailJob, addEmailJobsBulk } = require('./emailQueue');
const { getNotificationQueue, NOTIFICATION_QUEUE_NAME, addNotificationJob, addNotificationJobsBulk } = require('./notificationQueue');
const { getExportQueue, EXPORT_QUEUE_NAME, addExportJob } = require('./exportQueue');
const { isRedisEnabled } = require('../config/redis');

/**
 * Gracefully close all BullMQ queues
 */
const closeQueues = async () => {
  if (!isRedisEnabled()) return;

  const queuesToClose = [];

  try {
    const eq = getEmailQueue();
    if (eq) queuesToClose.push(eq.close());
  } catch (e) {}

  try {
    const nq = getNotificationQueue();
    if (nq) queuesToClose.push(nq.close());
  } catch (e) {}

  try {
    const xq = getExportQueue();
    if (xq) queuesToClose.push(xq.close());
  } catch (e) {}

  if (queuesToClose.length > 0) {
    console.log(`[Queues] Closing ${queuesToClose.length} BullMQ queue connections...`);
    await Promise.all(queuesToClose);
    console.log('[Queues] All queue connections closed.');
  }
};

module.exports = {
  getEmailQueue,
  EMAIL_QUEUE_NAME,
  addEmailJob,
  addEmailJobsBulk,

  getNotificationQueue,
  NOTIFICATION_QUEUE_NAME,
  addNotificationJob,
  addNotificationJobsBulk,

  getExportQueue,
  EXPORT_QUEUE_NAME,
  addExportJob,

  closeQueues
};

const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const { closeDB } = require('../config/db');
const { closeRedis, validateRedisConfig } = require('../config/redis');
const { validateSmtpConfig } = require('../services/emailService');
const { createEmailWorker, getEmailWorker } = require('./emailWorker');
const { createNotificationWorker, getNotificationWorker } = require('./notificationWorker');
const { createExportWorker, getExportWorker } = require('./exportWorker');

const startWorkers = async () => {
  validateRedisConfig();
  validateSmtpConfig();
  console.log('====================================================');
  console.log('👷 CampusPro Background Worker Process Starting...');
  console.log('====================================================');

  // 1. Connect to MongoDB
  await connectDB();

  // 1.1 Safe Diagnostic SMTP Health Check
  const { verifyTransporterConnection } = require('../services/emailService');
  await verifyTransporterConnection();

  // 2. Initialize BullMQ Workers
  const emailWorker = createEmailWorker();
  const notificationWorker = createNotificationWorker();
  const exportWorker = createExportWorker();

  console.log('====================================================');
  console.log('🚀 CampusPro Workers Initialized and Ready for Jobs');
  console.log('   - Email Worker (Concurrency: ' + (process.env.EMAIL_WORKER_CONCURRENCY || 5) + ')');
  console.log('   - Notification Worker (Concurrency: ' + (process.env.NOTIFICATION_WORKER_CONCURRENCY || 10) + ')');
  console.log('   - Export Worker (Concurrency: ' + (process.env.EXPORT_WORKER_CONCURRENCY || 2) + ')');
  console.log('====================================================');

  // Graceful Shutdown Handler
  const shutdown = async (signal) => {
    console.log(`\n[Worker] ${signal} signal received. Initiating graceful worker shutdown...`);

    const workersToClose = [];
    if (emailWorker) workersToClose.push(emailWorker.close());
    if (notificationWorker) workersToClose.push(notificationWorker.close());
    if (exportWorker) workersToClose.push(exportWorker.close());

    try {
      if (workersToClose.length > 0) {
        console.log(`[Worker] Waiting for active jobs to complete (${workersToClose.length} workers)...`);
        await Promise.all(workersToClose);
        console.log('[Worker] All workers closed cleanly.');
      }

      await closeRedis();
      await closeDB();
      console.log('[Worker] All connections released. Exiting.');
      process.exit(0);
    } catch (err) {
      console.error('[Worker Shutdown Error]', err.message);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (err) => {
    console.error('[Worker Unhandled Rejection]', err.message);
  });
};

// Execute if run directly
if (require.main === module) {
  startWorkers().catch((err) => {
    console.error('[Worker Fatal Startup Error]', err);
    process.exit(1);
  });
}

module.exports = {
  startWorkers
};

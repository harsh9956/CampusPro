const dotenv = require('dotenv');
dotenv.config();

const { validateJwtConfig } = require('./config/jwt');
const { validateCloudinaryConfig } = require('./config/cloudinary');
const { validateRedisConfig } = require('./config/redis');
const { validateSmtpConfig } = require('./services/emailService');
// Validate critical security environment configurations
validateJwtConfig();
validateCloudinaryConfig();
validateRedisConfig();
validateSmtpConfig();

const app = require('./app');
const connectDB = require('./config/db');
const { closeDB } = require('./config/db');

// Connect to MongoDB Database
connectDB();

// Automatically sync indexes on MongoDB Atlas in background
const { syncAllIndexes } = require('./utils/syncIndexes');
syncAllIndexes()
  .then(() => console.log('[Database] MongoDB compound indexes synchronized successfully.'))
  .catch((err) => console.warn('[Database] Background index sync warning:', err.message));

// Start BullMQ workers in-process for single-dyno / Render deployments
const { createEmailWorker } = require('./workers/emailWorker');
const { createNotificationWorker } = require('./workers/notificationWorker');
const { createExportWorker } = require('./workers/exportWorker');
const { isRedisEnabled } = require('./config/redis');

let inProcessWorkers = [];
if (isRedisEnabled()) {
  try {
    const ew = createEmailWorker();
    const nw = createNotificationWorker();
    const xw = createExportWorker();
    inProcessWorkers = [ew, nw, xw].filter(Boolean);
    console.log(`[Workers] ${inProcessWorkers.length} in-process background workers started successfully.`);
  } catch (wErr) {
    console.warn('[Workers] In-process worker startup warning:', wErr.message);
  }
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CampusPro Backend Server is running on port ${PORT}`);
  console.log(`📍 Health Endpoint: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

// Render Free-Tier Anti-Sleep Self-Ping (pings every 12 mins)
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === 'production' && process.env.RENDER ? 'https://campuspro-428p.onrender.com' : null);
if (renderExternalUrl) {
  const pingUrl = `${renderExternalUrl.replace(/\/$/, '')}/api/health/live`;
  console.log(`[KeepAlive] Anti-sleep self-ping enabled for: ${pingUrl}`);
  const https = require('https');
  const http = require('http');
  const httpClient = pingUrl.startsWith('https') ? https : http;

  setInterval(() => {
    try {
      httpClient.get(pingUrl, (res) => {
        // Keep-alive response received
      }).on('error', (err) => {
        console.warn('[KeepAlive] Self-ping warning:', err.message);
      });
    } catch (e) {}
  }, 12 * 60 * 1000).unref();
}

const { closeQueues } = require('./queues');
const { closeRedis } = require('./config/redis');

// Graceful Shutdown Handler
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] ${signal} signal received. Closing HTTP server, job queues, Redis, and database connection...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    try {
      if (inProcessWorkers.length > 0) {
        await Promise.all(inProcessWorkers.map(w => w.close().catch(() => {})));
      }
      await closeQueues();
      await closeRedis();
      await closeDB();
      console.log('[Server] All connections closed successfully.');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during graceful shutdown:', err.message);
      process.exit(1);
    }
  });

  // Force exit if shutdown takes too long (10s timeout)
  setTimeout(() => {
    console.error('[Server] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.message, err.stack);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

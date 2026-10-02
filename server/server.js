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

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CampusPro Backend Server is running on port ${PORT}`);
  console.log(`📍 Health Endpoint: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

const { closeQueues } = require('./queues');
const { closeRedis } = require('./config/redis');

// Graceful Shutdown Handler
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] ${signal} signal received. Closing HTTP server, job queues, Redis, and database connection...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    try {
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

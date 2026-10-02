const mongoose = require('mongoose');
const dns = require('dns');

/**
 * Hardened MongoDB Database Connection for CampusPro
 * Optimized for high-throughput concurrency (~10,000 students)
 */

let isConnected = false;

const connectDB = async () => {
  // If already connected or connecting, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }
  if (mongoose.connection.readyState === 2) {
    // Connection in progress, wait for it
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve(mongoose.connection));
      mongoose.connection.once('error', reject);
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && (!process.env.MONGO_URI || process.env.MONGO_URI.includes('127.0.0.1') || process.env.MONGO_URI.includes('localhost'))) {
    console.error('====================================================');
    console.error('⛔ [SECURITY ERROR] MONGO_URI must be set to a production database URI in production environment.');
    console.error('====================================================');
    process.exit(1);
  }

  const targetDbName = process.env.MONGO_DB_NAME || 'campuspro';
  const forbiddenDbs = ['admin', 'config', 'local', 'test'];
  if (isProduction && forbiddenDbs.includes(targetDbName.toLowerCase())) {
    console.error('====================================================');
    console.error(`⛔ [SECURITY ERROR] Target database cannot be '${targetDbName}'. Production database must be 'campuspro'.`);
    console.error('====================================================');
    process.exit(1);
  }

  // Extract and sanitize MongoDB URI defensively
  let rawUri = process.env.MONGO_URI || '';
  if (typeof rawUri === 'string') {
    rawUri = rawUri.trim();
    // Strip accidental wrapping quotes or backticks
    if ((rawUri.startsWith('"') && rawUri.endsWith('"')) ||
        (rawUri.startsWith("'") && rawUri.endsWith("'")) ||
        (rawUri.startsWith('`') && rawUri.endsWith('`'))) {
      rawUri = rawUri.slice(1, -1).trim();
    }
    // Strip accidental repeated variable assignment prefix (e.g., MONGO_URI=)
    while (rawUri.startsWith('MONGO_URI=')) {
      rawUri = rawUri.slice('MONGO_URI='.length).trim();
    }
  }

  const mongoUri = rawUri || 'mongodb://127.0.0.1:27017/campuspro';

  // Safe diagnostic logging (Never expose URI, credentials, or hostnames)
  const uriScheme = mongoUri.split('://')[0] || 'unknown';
  const hasValidScheme = mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://');
  console.log(`[Database Config] MONGO_URI exists: ${Boolean(process.env.MONGO_URI)}`);
  console.log(`[Database Config] URI scheme: ${uriScheme} (starts with mongodb:// or mongodb+srv://: ${hasValidScheme})`);

  if (!hasValidScheme) {
    console.error('====================================================');
    console.error('⛔ [DATABASE ERROR] Invalid scheme, expected connection string to start with mongodb:// or mongodb+srv://');
    console.error('====================================================');
    process.exit(1);
  }

  // If connecting to MongoDB Atlas SRV cluster, configure reliable DNS resolvers (prevents querySrv ECONNREFUSED on Windows)
  if (mongoUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (e) {
      // Continue with system DNS if custom resolution is restricted
    }
  }

  const connectionOptions = {
    dbName: targetDbName,
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50,
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 5,
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10) || 5000,
    socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 10) || 45000,
    connectTimeoutMS: parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 10) || 10000,
    maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME_MS, 10) || 30000,
    autoIndex: process.env.NODE_ENV !== 'production' // Avoid automatic index builds on production boot
  };

  try {
    const conn = await mongoose.connect(mongoUri, connectionOptions);
    if (isProduction && forbiddenDbs.includes(conn.connection.name.toLowerCase())) {
      console.error('====================================================');
      console.error(`⛔ [SECURITY ERROR] Connected to system database '${conn.connection.name}'. Production database must be '${targetDbName}'.`);
      console.error('====================================================');
      await mongoose.connection.close(false);
      process.exit(1);
    }
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);

    // Monitor connection events
    mongoose.connection.on('error', (err) => {
      console.error('[Database Error] MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB disconnected. Attempting reconnect...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB reconnected successfully.');
      isConnected = true;
    });

    return conn;
  } catch (error) {
    console.error(`[Database Error] MongoDB connection failed: ${error.message}`);
    if (!isProduction) {
      console.error(`[Database Error] Please make sure MongoDB Community Server is running on mongodb://127.0.0.1:27017`);
    }
    process.exit(1);
  }
};

/**
 * Graceful shutdown helper for MongoDB connection
 */
const closeDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log('[Database] MongoDB connection closed gracefully.');
    }
  } catch (err) {
    console.error('[Database Error] Error during connection close:', err.message);
  }
};

module.exports = connectDB;
module.exports.closeDB = closeDB;

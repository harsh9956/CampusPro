const Redis = require('ioredis');

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false' && process.env.REDIS_ENABLED !== '0';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Validates Redis configuration for production environments.
 * Production Redis must be external/managed unless ALLOW_PRODUCTION_LOCAL_REDIS=true is set.
 */
const validateRedisConfig = () => {
  if (isProduction && REDIS_ENABLED) {
    const isLocal = !process.env.REDIS_HOST || process.env.REDIS_HOST === '127.0.0.1' || process.env.REDIS_HOST === 'localhost';
    if (isLocal && process.env.ALLOW_PRODUCTION_LOCAL_REDIS !== 'true') {
      console.error('====================================================');
      console.error('⛔ [SECURITY ERROR] Production Redis must be an external managed service.');
      console.error('REDIS_HOST cannot be localhost or 127.0.0.1 in production unless ALLOW_PRODUCTION_LOCAL_REDIS=true.');
      console.error('====================================================');
      throw new Error('[SECURITY FATAL] Production Redis must be an external managed service.');
    }
  }
};

/**
 * Standard configuration object required by BullMQ connection
 * Note: BullMQ requires maxRetriesPerRequest to be null
 */
const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    // Retry connection with exponential backoff capped at 3 seconds
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect on readonly failover
    }
    return false;
  }
};

let sharedRedisClient = null;

/**
 * Get or initialize a reusable singleton IORedis client instance
 */
const getRedisClient = () => {
  if (!REDIS_ENABLED) {
    return null;
  }

  validateRedisConfig();

  if (sharedRedisClient) {
    return sharedRedisClient;
  }

  sharedRedisClient = new Redis(redisConfig);

  sharedRedisClient.on('connect', () => {
    console.log(`[Redis] Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
  });

  sharedRedisClient.on('ready', () => {
    console.log(`[Redis] Client ready to receive commands`);
  });

  sharedRedisClient.on('error', (err) => {
    console.error(`[Redis Error] Connection failure: ${err.message}`);
  });

  sharedRedisClient.on('close', () => {
    console.warn(`[Redis] Connection closed`);
  });

  sharedRedisClient.on('reconnecting', (time) => {
    console.log(`[Redis] Reconnecting in ${time}ms...`);
  });

  return sharedRedisClient;
};

/**
 * Helper to check if Redis is currently reachable
 */
const checkRedisConnection = async () => {
  if (!REDIS_ENABLED) {
    return { enabled: false, connected: false, reason: 'REDIS_ENABLED is false' };
  }

  try {
    const client = getRedisClient();
    if (!client) {
      return { enabled: false, connected: false, reason: 'Redis client not initialized' };
    }
    const pong = await client.ping();
    return { enabled: true, connected: pong === 'PONG', ping: pong };
  } catch (error) {
    console.error('[Redis Health Check Error]', error.message);
    return { enabled: true, connected: false, error: error.message };
  }
};

/**
 * Gracefully close shared Redis connection
 */
const closeRedis = async () => {
  if (sharedRedisClient) {
    try {
      console.log('[Redis] Closing shared Redis connection...');
      await sharedRedisClient.quit();
      sharedRedisClient = null;
      console.log('[Redis] Shared connection closed.');
    } catch (err) {
      console.error('[Redis] Error during quit, disconnecting forcefully:', err.message);
      if (sharedRedisClient) {
        sharedRedisClient.disconnect();
        sharedRedisClient = null;
      }
    }
  }
};

const net = require('net');

let isRedisReachableCache = null;
let lastCheckTime = 0;

/**
 * Checks if Redis server is reachable via quick TCP socket probe without hanging IORedis
 */
const isRedisReachable = async () => {
  if (!REDIS_ENABLED) return false;
  const now = Date.now();
  if (isRedisReachableCache !== null && now - lastCheckTime < 10000) {
    return isRedisReachableCache;
  }
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.on('connect', () => {
      socket.destroy();
      isRedisReachableCache = true;
      lastCheckTime = Date.now();
      resolve(true);
    });
    const onFail = () => {
      socket.destroy();
      isRedisReachableCache = false;
      lastCheckTime = Date.now();
      resolve(false);
    };
    socket.on('error', onFail);
    socket.on('timeout', onFail);
    socket.connect(REDIS_PORT, REDIS_HOST);
  });
};

module.exports = {
  redisConfig,
  getRedisClient,
  checkRedisConnection,
  closeRedis,
  isRedisEnabled: () => REDIS_ENABLED,
  isRedisReachable,
  validateRedisConfig
};

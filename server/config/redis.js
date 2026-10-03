const Redis = require("ioredis");
const net = require("net");

const REDIS_ENABLED =
  process.env.REDIS_ENABLED !== "false" && process.env.REDIS_ENABLED !== "0";

const REDIS_URL = process.env.REDIS_URL;

const isProduction = process.env.NODE_ENV === "production";

/**
 * Validate Redis configuration.
 */
const validateRedisConfig = () => {
  if (!REDIS_ENABLED) {
    return;
  }

  if (!REDIS_URL) {
    throw new Error("[REDIS CONFIG ERROR] REDIS_URL is missing.");
  }

  if (isProduction && !REDIS_URL.startsWith("rediss://")) {
    throw new Error(
      "[REDIS SECURITY ERROR] Production Redis must use TLS (rediss://).",
    );
  }
};

/**
 * Create BullMQ-compatible Redis configuration.
 *
 * IMPORTANT:
 * BullMQ does NOT use the shared Redis client directly.
 * Therefore the connection details must explicitly be provided here.
 *
 * This prevents BullMQ from falling back to:
 *
 * 127.0.0.1:6379
 *
 * on Render/production.
 */
const createRedisConfig = () => {
  if (!REDIS_ENABLED) {
    return null;
  }

  validateRedisConfig();

  const redisUrl = new URL(REDIS_URL);

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),

    username: redisUrl.username
      ? decodeURIComponent(redisUrl.username)
      : undefined,

    password: redisUrl.password
      ? decodeURIComponent(redisUrl.password)
      : undefined,

    maxRetriesPerRequest: null,

    enableReadyCheck: false,

    // Upstash / production Redis uses TLS.
    ...(redisUrl.protocol === "rediss:" && {
      tls: {},
    }),

    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);

      console.log(`[Redis] Reconnecting in ${delay}ms...`);

      return delay;
    },

    reconnectOnError: (err) => {
      if (err?.message?.includes("READONLY")) {
        return true;
      }

      return false;
    },
  };
};

/**
 * BullMQ Redis configuration.
 */
const redisConfig = createRedisConfig();

let sharedRedisClient = null;

/**
 * Get or initialize the shared Redis client.
 *
 * Used for:
 * - Redis health checks
 * - rate limiting
 * - general Redis operations
 */
const getRedisClient = () => {
  if (!REDIS_ENABLED) {
    return null;
  }

  validateRedisConfig();

  if (sharedRedisClient) {
    return sharedRedisClient;
  }

  sharedRedisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,

    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);

      console.log(`[Redis] Reconnecting in ${delay}ms...`);

      return delay;
    },

    reconnectOnError: (err) => {
      if (err?.message?.includes("READONLY")) {
        return true;
      }

      return false;
    },
  });

  sharedRedisClient.on("connect", () => {
    console.log("[Redis] Connected to Redis using REDIS_URL");
  });

  sharedRedisClient.on("ready", () => {
    console.log("[Redis] Client ready to receive commands");
  });

  sharedRedisClient.on("error", (err) => {
    console.error(`[Redis Error] ${err.message}`);
  });

  sharedRedisClient.on("close", () => {
    console.warn("[Redis] Connection closed");
  });

  sharedRedisClient.on("reconnecting", (time) => {
    console.log(`[Redis] Reconnecting in ${time}ms...`);
  });

  return sharedRedisClient;
};

/**
 * Check Redis connection.
 */
const checkRedisConnection = async () => {
  if (!REDIS_ENABLED) {
    return {
      enabled: false,
      connected: false,
      reason: "REDIS_ENABLED is false",
    };
  }

  try {
    const client = getRedisClient();

    if (!client) {
      return {
        enabled: false,
        connected: false,
        reason: "Redis client not initialized",
      };
    }

    const pong = await client.ping();

    return {
      enabled: true,
      connected: pong === "PONG",
      ping: pong,
    };
  } catch (error) {
    console.error("[Redis Health Check Error]", error.message);

    return {
      enabled: true,
      connected: false,
      error: error.message,
    };
  }
};

/**
 * Gracefully close Redis connection.
 */
const closeRedis = async () => {
  if (!sharedRedisClient) {
    return;
  }

  try {
    console.log("[Redis] Closing shared Redis connection...");

    await sharedRedisClient.quit();

    sharedRedisClient = null;

    console.log("[Redis] Shared connection closed.");
  } catch (err) {
    console.error("[Redis] Error during quit:", err.message);

    if (sharedRedisClient) {
      sharedRedisClient.disconnect();
      sharedRedisClient = null;
    }
  }
};

/**
 * Simple TCP reachability check.
 *
 * NOTE:
 * This checks only network reachability.
 * It does NOT authenticate with Redis.
 *
 * Actual Redis authentication/health is checked by:
 * checkRedisConnection()
 */
let isRedisReachableCache = null;
let lastCheckTime = 0;

const isRedisReachable = async () => {
  if (!REDIS_ENABLED || !REDIS_URL) {
    return false;
  }

  const now = Date.now();

  if (isRedisReachableCache !== null && now - lastCheckTime < 10000) {
    return isRedisReachableCache;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(REDIS_URL);
  } catch (error) {
    isRedisReachableCache = false;
    lastCheckTime = Date.now();

    return false;
  }

  const host = parsedUrl.hostname;
  const port = Number(parsedUrl.port || 6379);

  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1000);

    const onFail = () => {
      socket.destroy();

      isRedisReachableCache = false;
      lastCheckTime = Date.now();

      resolve(false);
    };

    socket.on("connect", () => {
      socket.destroy();

      isRedisReachableCache = true;
      lastCheckTime = Date.now();

      resolve(true);
    });

    socket.on("error", onFail);
    socket.on("timeout", onFail);

    socket.connect(port, host);
  });
};

/**
 * Export Redis utilities.
 */
module.exports = {
  redisConfig,

  getRedisClient,

  checkRedisConnection,

  closeRedis,

  isRedisEnabled: () => REDIS_ENABLED,

  isRedisReachable,

  validateRedisConfig,
};

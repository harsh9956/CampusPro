const Redis = require("ioredis");
const net = require("net");

const REDIS_ENABLED =
  process.env.REDIS_ENABLED !== "false" && process.env.REDIS_ENABLED !== "0";

const REDIS_URL = process.env.REDIS_URL;

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);

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

  if (isProduction) {
    if (
      REDIS_URL.startsWith("redis://") &&
      !REDIS_URL.startsWith("rediss://")
    ) {
      throw new Error(
        "[REDIS SECURITY ERROR] Production Redis must use TLS (rediss://).",
      );
    }
  }
};

/**
 * BullMQ-compatible Redis configuration.
 *
 * This configuration is used by BullMQ queues.
 *
 * maxRetriesPerRequest MUST be null for BullMQ.
 */
const redisConfig = {
  maxRetriesPerRequest: null,

  enableReadyCheck: false,

  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);

    console.log(`[Redis] Reconnecting in ${delay}ms...`);

    return delay;
  },

  reconnectOnError: (err) => {
    if (err.message && err.message.includes("READONLY")) {
      return true;
    }

    return false;
  },
};

let sharedRedisClient = null;

/**
 * Get or initialize the shared Redis client.
 */
const getRedisClient = () => {
  if (!REDIS_ENABLED) {
    return null;
  }

  validateRedisConfig();

  if (sharedRedisClient) {
    return sharedRedisClient;
  }

  /**
   * IMPORTANT:
   *
   * Using the complete REDIS_URL allows ioredis
   * to automatically handle:
   *
   * - rediss://
   * - TLS
   * - username
   * - password/token
   * - host
   * - port
   */
  sharedRedisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,

    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);

      console.log(`[Redis] Reconnecting in ${delay}ms...`);

      return delay;
    },

    reconnectOnError: (err) => {
      if (err.message && err.message.includes("READONLY")) {
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
 * Simple network reachability check.
 *
 * NOTE:
 * This only checks TCP reachability.
 * It does NOT authenticate with Redis.
 *
 * Actual Redis health is checked by
 * checkRedisConnection().
 */
let isRedisReachableCache = null;
let lastCheckTime = 0;

const isRedisReachable = async () => {
  if (!REDIS_ENABLED) {
    return false;
  }

  if (!REDIS_URL) {
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

module.exports = {
  redisConfig,
  getRedisClient,
  checkRedisConnection,
  closeRedis,

  isRedisEnabled: () => REDIS_ENABLED,

  isRedisReachable,

  validateRedisConfig,
};

/**
 * CampusPro Enterprise Hybrid Rate Limiting Architecture
 * 
 * Features:
 * 1. Redis-backed distributed state across clustered Node processes with graceful in-memory fallback.
 * 2. Specialized endpoint protection separating Public Registration, Login, Password Reset, and APIs.
 * 3. Multi-layered Public Registration:
 *    - Layer A: Per-IP burst flood protection (short window).
 *    - Layer B: Per-Identity (email/enrollment) abuse protection.
 *    - Layer C: Sustained IP protection with explicit, admin-managed Campus NAT / Institutional IP allowance.
 * 4. Strict Login Brute-Force & Credential Stuffing Protection (Per-Account & Per-IP limits).
 * 5. Password Reset abuse and email-bomb protection.
 * 6. Secure IP resolution using Express req.ip (no blind trust of client-forged headers).
 */

const { getRedisClient, isRedisEnabled } = require('../config/redis');

// In-memory fallback storage
const memoryStore = new Map();

// Periodic cleanup of stale memory records every 3 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 3 * 60 * 1000).unref();

/**
 * Checks if a given IP address is an explicitly configured Institutional / Campus NAT IP
 */
const isCampusNatIp = (ip) => {
  if (!ip) return false;
  const configuredNats = (process.env.CAMPUS_NAT_IPS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (configuredNats.length === 0) return false;

  const cleanIp = ip.replace(/^::ffff:/, ''); // normalize IPv4-mapped IPv6

  for (const nat of configuredNats) {
    if (nat.includes('/')) {
      // Basic CIDR match if configured (e.g. 198.51.100.0/24)
      const [subnet, bits] = nat.split('/');
      const mask = ~((1 << (32 - parseInt(bits, 10))) - 1);
      const ipNum = ipToLong(cleanIp);
      const subnetNum = ipToLong(subnet);
      if (ipNum && subnetNum && (ipNum & mask) === (subnetNum & mask)) {
        return true;
      }
    } else if (cleanIp === nat) {
      return true;
    }
  }
  return false;
};

function ipToLong(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Core atomic counter implementation supporting Redis with seamless in-memory fallback
 */
async function recordHit(prefix, key, windowMs) {
  const redis = isRedisEnabled() ? getRedisClient() : null;
  const fullKey = `campuspro:rl:${prefix}:${key}`;
  const now = Date.now();

  if (redis && redis.status === 'ready') {
    try {
      const multi = redis.multi();
      multi.incr(fullKey);
      multi.pttl(fullKey);
      const results = await multi.exec();

      if (results && results[0] && results[1]) {
        const count = results[0][1];
        let ttl = results[1][1];

        if (ttl === -1 || count === 1) {
          await redis.pexpire(fullKey, windowMs);
          ttl = windowMs;
        }

        return {
          count,
          resetTime: now + (ttl > 0 ? ttl : windowMs),
          backend: 'redis'
        };
      }
    } catch (err) {
      // Gracefully fall through to memory on Redis failure
      console.warn(`[RateLimit Warning] Redis error (${err.message}), falling back to memory store.`);
    }
  }

  // In-memory fallback
  let record = memoryStore.get(fullKey);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    memoryStore.set(fullKey, record);
    return { ...record, backend: 'memory' };
  }

  record.count++;
  return { ...record, backend: 'memory' };
}

/**
 * Factory creating rate limiting middleware
 */
const createRateLimiter = ({
  prefix = 'gen',
  windowMs = 60 * 1000,
  max = 100,
  keyGenerator = null,
  skip = null,
  message = 'Too many requests, please try again later.'
}) => {
  return async (req, res, next) => {
    try {
      if (typeof skip === 'function' && skip(req)) {
        return next();
      }

      const key = typeof keyGenerator === 'function'
        ? keyGenerator(req)
        : (req.user?._id ? String(req.user._id) : (req.ip || 'unknown'));

      if (!key) return next();

      const calculatedMax = typeof max === 'function' ? max(req) : max;
      const { count, resetTime } = await recordHit(prefix, key, windowMs);

      if (count > calculatedMax) {
        const retryAfterSec = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
        res.setHeader('Retry-After', retryAfterSec);
        res.setHeader('X-RateLimit-Limit', calculatedMax);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

        return res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: typeof message === 'function' ? message(req) : message,
          retryAfter: retryAfterSec
        });
      }

      res.setHeader('X-RateLimit-Limit', calculatedMax);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, calculatedMax - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      next();
    } catch (err) {
      console.error('[RateLimit Middleware Error]', err);
      // In fail-safe mode, allow request to proceed rather than breaking user experience
      next();
    }
  };
};

// =========================================================================
// 1. PUBLIC REGISTRATION LIMITERS (Multi-Tiered Hybrid Strategy)
// =========================================================================

// Tier 1: Per-IP Burst Protection (Prevents automated flooding / threadpool starvation)
const registrationBurstLimiter = createRateLimiter({
  prefix: 'reg:burst',
  windowMs: parseInt(process.env.REGISTRATION_BURST_WINDOW_MS, 10) || 10 * 1000, // 10 seconds
  max: (req) => isCampusNatIp(req.ip)
    ? (parseInt(process.env.CAMPUS_NAT_BURST_MAX, 10) || 250)
    : (parseInt(process.env.REGISTRATION_BURST_MAX, 10) || 15),
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many rapid registration requests from this network. Please wait a few seconds and try again.'
});

// Tier 2: Per-Identity Dedup / Lockout (Protects specific email / enrollment from repeated abuse)
const registrationIdentityLimiter = createRateLimiter({
  prefix: 'reg:id',
  windowMs: parseInt(process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.REGISTRATION_IDENTITY_MAX, 10) || 5, // Max 5 registration attempts per identity
  keyGenerator: (req) => {
    const email = (req.body?.email || '').trim().toLowerCase();
    const enrollment = (req.body?.enrollmentNo || '').trim().toUpperCase();
    if (!email && !enrollment) return null;
    return `${email}:${enrollment}`;
  },
  message: 'Too many registration attempts for this student email or enrollment. Please verify your details or wait 15 minutes.'
});

// Tier 3: Sustained IP Protection with Explicit Campus NAT Allowance
const registrationSustainedLimiter = createRateLimiter({
  prefix: 'reg:sustained',
  windowMs: parseInt(process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    if (isCampusNatIp(req.ip)) {
      // Explicit admin-managed institutional NAT gets high-volume cohort quota
      return parseInt(process.env.CAMPUS_NAT_REGISTRATION_MAX, 10) || 1000;
    }
    // Standard untrusted public IPs get default protection
    return parseInt(process.env.REGISTRATION_RATE_LIMIT_MAX, 10) || 50;
  },
  keyGenerator: (req) => req.ip || 'unknown',
  message: (req) => isCampusNatIp(req.ip)
    ? 'Campus registration quota reached for this session. Please contact the Placement Cell.'
    : 'Registration rate limit reached for this IP address. Please try again after 15 minutes.'
});

// Combined Registration Middleware
const registrationLimiter = [
  registrationBurstLimiter,
  registrationIdentityLimiter,
  registrationSustainedLimiter
];

// =========================================================================
// 2. LOGIN BRUTE-FORCE PROTECTION (Strict Account & IP Throttling)
// =========================================================================

// Account Lockout: Max 5 attempts per targeted email in 15 minutes
const loginAccountLimiter = createRateLimiter({
  prefix: 'login:acct',
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_ACCOUNT_LOCKOUT_MAX, 10) || 5,
  keyGenerator: (req) => (req.body?.email || '').trim().toLowerCase() || null,
  message: 'Too many login attempts for this account. For security, please wait 15 minutes or reset your password.'
});

// IP Lockout: Max 15 attempts per IP in 15 minutes (or 50 if campus NAT)
const loginIpLimiter = createRateLimiter({
  prefix: 'login:ip',
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: (req) => isCampusNatIp(req.ip)
    ? (parseInt(process.env.CAMPUS_NAT_LOGIN_MAX, 10) || 500)
    : (parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 15),
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many login attempts from this network. Please try again after 15 minutes.'
});

const loginLimiter = [
  loginAccountLimiter,
  loginIpLimiter
];

// =========================================================================
// 3. PASSWORD RESET ABUSE PROTECTION (Email Bombing & Token Enumeration)
// =========================================================================

const passwordResetLimiter = createRateLimiter({
  prefix: 'pwd:reset',
  windowMs: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 10) || 5,
  keyGenerator: (req) => {
    const email = (req.body?.email || '').trim().toLowerCase();
    const token = req.params?.token || '';
    return email ? `acct:${email}` : (token ? `token:${token}` : `ip:${req.ip}`);
  },
  message: 'Too many password reset requests. Please check your inbox or wait 15 minutes before requesting again.'
});

// =========================================================================
// 4. EXPORT & GENERAL API LIMITERS
// =========================================================================

// Excel Export: Max 10 per minute per user/IP
const exportLimiter = createRateLimiter({
  prefix: 'export',
  windowMs: 60 * 1000,
  max: parseInt(process.env.EXPORT_RATE_LIMIT_MAX, 10) || 10,
  keyGenerator: (req) => req.user?._id ? `user:${req.user._id}` : (req.ip || 'unknown'),
  message: 'Too many export requests in a short time. Please wait a minute before downloading again.'
});

// General API Limiter: Max 300 requests per minute
// Skips registration route which has its own dedicated multi-tiered rate limiting
const generalLimiter = createRateLimiter({
  prefix: 'general',
  windowMs: 60 * 1000,
  max: parseInt(process.env.GENERAL_RATE_LIMIT_MAX, 10) || 300,
  skip: (req) => {
    const url = req.originalUrl || req.url || '';
    return url.includes('/api/auth/register') || req.path === '/auth/register';
  },
  keyGenerator: (req) => req.user?._id ? `user:${req.user._id}` : (req.ip || 'unknown'),
  message: 'Too many API requests. Please slow down.'
});

// Backward-compatible authLimiter alias
const authLimiter = createRateLimiter({
  prefix: 'auth:legacy',
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 30,
  message: 'Too many authentication attempts. Please try again after 15 minutes.'
});

module.exports = {
  createRateLimiter,
  isCampusNatIp,
  registrationLimiter,
  registrationBurstLimiter,
  registrationIdentityLimiter,
  registrationSustainedLimiter,
  loginLimiter,
  loginAccountLimiter,
  loginIpLimiter,
  passwordResetLimiter,
  exportLimiter,
  generalLimiter,
  authLimiter,
  _memoryStore: memoryStore
};

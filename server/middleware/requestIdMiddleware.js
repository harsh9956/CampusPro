const crypto = require('crypto');

/**
 * Attaches a unique request ID (X-Request-ID) to incoming requests
 * Enables distributed tracing across HTTP requests, background workers, and logs
 */
const requestIdMiddleware = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  const requestId = (incomingId && typeof incomingId === 'string' && incomingId.length <= 64)
    ? incomingId
    : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};

module.exports = { requestIdMiddleware };

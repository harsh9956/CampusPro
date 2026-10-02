/**
 * Centralized Error Handling & Not Found Middleware for CampusPro
 * Enforces predictable API contracts, standard error payloads, and HTTP status codes
 */

const notFound = (req, res, next) => {
  const error = new Error(`Endpoint not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let details = null;

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid format for resource identifier '${err.path}'.`;
  }

  // 2. Mongoose Duplicate Key Error (MongoDB Error 11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const val = err.keyValue ? err.keyValue[field] : '';
    message = `Duplicate value '${val}' for unique field '${field}'.`;
    details = { [field]: `Already exists: ${val}` };
  }

  // 3. Mongoose Schema Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed for one or more fields.';
    details = {};
    Object.values(err.errors || {}).forEach((e) => {
      details[e.path] = e.message;
    });
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token expired. Please log in again.';
  }

  // 5. Multer / Upload Errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    code = err.code || 'UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      code = 'FILE_TOO_LARGE';
      message = 'File size exceeds the 10 MB maximum limit.';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // 6. Malformed JSON Body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Malformed JSON in request body.';
  }

  // 7. Storage Unavailable
  if (err.code === 'STORAGE_UNAVAILABLE') {
    statusCode = 503;
    code = 'STORAGE_UNAVAILABLE';
  }

  // 8. Infer code from status code if generic
  if (code === 'INTERNAL_SERVER_ERROR' || !code) {
    if (statusCode === 400) code = 'BAD_REQUEST';
    else if (statusCode === 401) code = 'UNAUTHORIZED';
    else if (statusCode === 403) code = 'FORBIDDEN';
    else if (statusCode === 404) code = 'NOT_FOUND';
    else if (statusCode === 409) code = 'CONFLICT';
    else if (statusCode === 422) code = 'UNPROCESSABLE_ENTITY';
    else if (statusCode === 429) code = 'RATE_LIMIT_EXCEEDED';
    else if (statusCode === 503) code = 'SERVICE_UNAVAILABLE';
  }

  // 7. Security: In production, mask internal 500 error messages to prevent leaking stack/driver details
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error. Please contact support.';
    details = null;
  }

  // Safe server-side diagnostics
  const reqId = req.id || req.headers['x-request-id'] || 'trace-req';
  console.error(`[Error Handler] [${reqId}] [${req.method} ${req.originalUrl}] [${statusCode} ${code}]:`, message);
  if (statusCode === 500 && process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  // Standardized response payload (preserves 'message' for frontend backward-compatibility, adds 'errors' and 'details')
  const errorPayload = details || err.details || (err.errors ? err.errors : null);

  res.status(statusCode).json({
    success: false,
    message,
    code,
    errors: errorPayload,
    details: errorPayload,
    requestId: reqId,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

module.exports = { errorHandler, notFound };

/**
 * Middleware to sanitize inputs against MongoDB Operator Injection
 * Recursively strips keys containing prohibited characters like '$' or '.'
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeObject(obj[i]);
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else {
      obj[key] = sanitizeObject(obj[key]);
    }
  }

  return obj;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

module.exports = { sanitizeInput, sanitizeObject };

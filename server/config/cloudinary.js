const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME.trim() : '';
const apiKey = process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.trim() : '';
const apiSecret = process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.trim() : '';

const isCloudinaryConfigured = Boolean(
  cloudName &&
  apiKey &&
  apiSecret &&
  cloudName !== 'your_cloudinary_cloud_name' &&
  apiKey !== 'your_cloudinary_api_key'
);

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Validates Cloudinary configuration for production readiness.
 * In production:
 *   - Must have valid Cloudinary credentials
 *   - Silent fallback to local disk is prohibited
 * In development:
 *   - Local disk storage fallback is permitted
 */
const validateCloudinaryConfig = () => {
  if (process.env.NODE_ENV === 'production' && !isCloudinaryConfigured) {
    console.error('====================================================');
    console.error('⛔ [SECURITY ERROR] Production storage configuration missing!');
    console.error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be configured in production.');
    console.error('Silent fallback to local disk storage is prohibited in production.');
    console.error('====================================================');
    throw new Error('[SECURITY FATAL] Cloudinary production storage configuration is required in production environment.');
  }
};

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  console.log('[Cloudinary Config] Cloudinary initialized with cloud_name:', cloudName);
} else {
  if (isProduction) {
    validateCloudinaryConfig();
  } else {
    console.log('[Cloudinary Config] Cloudinary credentials not detected or incomplete. Using local disk storage fallback.');
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  validateCloudinaryConfig
};

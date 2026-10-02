/**
 * JWT Configuration & Secret Validator
 * Enforces production safety while allowing seamless local development.
 */

const KNOWN_PLACEHOLDER_SECRETS = [
  'campuspro_super_secret_jwt_key_2026_tnp',
  'your_jwt_secret_key_here',
  'CHANGE_ME_IN_PRODUCTION',
  'secret',
  'secret123',
  'jwt_secret',
  'change_me',
  'default_secret'
];

/**
 * Returns a validated JWT secret.
 * In production:
 *   - JWT_SECRET must be defined
 *   - JWT_SECRET must not match any known weak/placeholder secret
 *   - JWT_SECRET must be at least 32 characters in length
 * In development:
 *   - Falls back to local development secret if unset
 */
const getJwtSecret = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';

  if (isProduction) {
    if (!secret) {
      throw new Error('[SECURITY FATAL] JWT_SECRET must be defined in production environment.');
    }
    if (KNOWN_PLACEHOLDER_SECRETS.includes(secret) || secret.length < 32) {
      throw new Error('[SECURITY FATAL] Production JWT_SECRET is using an insecure, placeholder, or weak secret (< 32 characters).');
    }
    return secret;
  }

  // Development / Test fallback
  return secret || 'campuspro_super_secret_jwt_key_2026_tnp';
};

const validateJwtConfig = () => {
  // Invokes getter to trigger fail-fast behavior if invalid
  getJwtSecret();
};

module.exports = {
  getJwtSecret,
  validateJwtConfig,
  KNOWN_PLACEHOLDER_SECRETS
};

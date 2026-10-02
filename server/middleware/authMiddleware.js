const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
      code: 'UNAUTHORIZED'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      getJwtSecret()
    );

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token payload',
        code: 'INVALID_TOKEN'
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check account status
    const userStatus = (user.status || 'ACTIVE').toUpperCase();
    if (userStatus !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Account is ${userStatus.toLowerCase()}. Access denied. Please contact administrator.`,
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Ensure normalized uppercase role on req.user
    user.role = (user.role || 'STUDENT').toUpperCase();
    req.user = user;

    return next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error.message);
    const code = error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError' ? 'Authentication token expired. Please log in again.' : 'Not authorized, token failed or expired',
      code
    });
  }
};

module.exports = { protect };

const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  forgotPassword,
  verifyResetToken,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const {
  registrationLimiter,
  loginLimiter,
  passwordResetLimiter
} = require('../middleware/rateLimitMiddleware');

router.post('/register', registrationLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password/:token', passwordResetLimiter, resetPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logoutUser);

module.exports = router;


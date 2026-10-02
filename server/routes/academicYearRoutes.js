const express = require('express');
const router = express.Router();
const {
  getAcademicYears,
  getCurrentYear,
  createYear,
  setYearAsCurrent,
  deleteYearData
} = require('../controllers/academicYearController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Super Admin restriction guard for all Academic Year management operations.
 * Normal ADMIN / TPO ADMIN receives HTTP 403 with code 'SUPER_ADMIN_REQUIRED'.
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid Bearer token.',
      code: 'UNAUTHORIZED'
    });
  }

  const userRole = (req.user.role || '').toUpperCase();
  if (userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      code: 'SUPER_ADMIN_REQUIRED',
      message: 'Only Super Admin can manage academic years.'
    });
  }

  next();
};

// Public / Authenticated read routes (All roles can view registered and current years)
router.get('/', getAcademicYears);
router.get('/current', getCurrentYear);

// System-Level Academic Year Management routes (SUPER_ADMIN ONLY)
router.post('/', protect, requireSuperAdmin, createYear);
router.put('/current', protect, requireSuperAdmin, setYearAsCurrent);
router.patch('/current', protect, requireSuperAdmin, setYearAsCurrent);
router.put('/:id/current', protect, requireSuperAdmin, setYearAsCurrent);
router.patch('/:id/current', protect, requireSuperAdmin, setYearAsCurrent);
router.post('/set-current', protect, requireSuperAdmin, setYearAsCurrent);
router.post('/:id/set-current', protect, requireSuperAdmin, setYearAsCurrent);
router.delete('/:id/data', protect, requireSuperAdmin, deleteYearData);
router.delete('/:id', protect, requireSuperAdmin, deleteYearData);

module.exports = router;

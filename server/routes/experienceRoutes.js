const express = require('express');
const router = express.Router();
const {
  createExperience,
  getExperiences,
  getMyExperiences,
  getExperienceById,
  approveExperience,
  rejectExperience,
  deleteExperience
} = require('../controllers/experienceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Student specific submission history
router.get('/my', protect, authorize('student'), getMyExperiences);

// Public / Filtered experience feed
router.get('/', protect, getExperiences);
router.get('/:id', protect, getExperienceById);

// Student create experience
router.post('/', protect, authorize('student'), createExperience);

// Admin Moderation & Delete endpoints
router.delete('/:id', protect, authorize('admin'), deleteExperience);

router.patch('/:id/approve', protect, authorize('admin'), approveExperience);
router.put('/:id/approve', protect, authorize('admin'), approveExperience);

router.patch('/:id/reject', protect, authorize('admin'), rejectExperience);
router.put('/:id/reject', protect, authorize('admin'), rejectExperience);

module.exports = router;

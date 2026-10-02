const express = require('express');
const router = express.Router();
const {
  createExperience,
  getExperiences,
  getMyExperiences,
  getExperienceById,
  getExperienceStats,
  approveExperience,
  rejectExperience,
  deleteExperience
} = require('../controllers/experienceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Student specific submission history
router.get('/my', protect, authorize('STUDENT'), getMyExperiences);

// Admin aggregate experience statistics
router.get('/stats', protect, authorize('ADMIN'), getExperienceStats);

// Public / Filtered experience feed
router.get('/', protect, getExperiences);
router.get('/:id', protect, validateObjectId('id'), getExperienceById);

// Student create experience
router.post('/', protect, authorize('STUDENT'), createExperience);

// Admin Moderation & Delete endpoints
router.delete('/:id', protect, authorize('ADMIN'), validateObjectId('id'), deleteExperience);
router.patch('/:id/approve', protect, authorize('ADMIN'), validateObjectId('id'), approveExperience);
router.put('/:id/approve', protect, authorize('ADMIN'), validateObjectId('id'), approveExperience);
router.patch('/:id/reject', protect, authorize('ADMIN'), validateObjectId('id'), rejectExperience);
router.put('/:id/reject', protect, authorize('ADMIN'), validateObjectId('id'), rejectExperience);

module.exports = router;

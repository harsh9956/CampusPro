const express = require('express');
const router = express.Router();
const {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection
} = require('../controllers/sectionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Public/Authenticated access for fetching sections
router.get('/active', getSections);
router.get('/', getSections);
router.get('/:id', validateObjectId('id'), getSectionById);

// Admin-only management endpoints
router.post('/', protect, authorize('ADMIN'), createSection);
router.put('/:id', protect, authorize('ADMIN'), validateObjectId('id'), updateSection);
router.delete('/:id', protect, authorize('ADMIN'), validateObjectId('id'), deleteSection);

module.exports = router;

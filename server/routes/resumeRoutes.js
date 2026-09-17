const express = require('express');
const router = express.Router();
const {
  createResume,
  getResumes,
  getResumeById,
  updateResume,
  deleteResume,
  duplicateResume
} = require('../controllers/resumeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, authorize('student'), createResume);
router.get('/', protect, authorize('student'), getResumes);
router.get('/:id', protect, authorize('student'), getResumeById);
router.put('/:id', protect, authorize('student'), updateResume);
router.delete('/:id', protect, authorize('student'), deleteResume);
router.post('/:id/duplicate', protect, authorize('student'), duplicateResume);

module.exports = router;

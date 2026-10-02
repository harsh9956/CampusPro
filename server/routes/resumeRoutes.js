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
const { validateObjectId } = require('../middleware/validateObjectId');

router.post('/', protect, authorize('STUDENT'), createResume);
router.get('/', protect, authorize('STUDENT'), getResumes);
router.get('/:id', protect, authorize('STUDENT'), validateObjectId('id'), getResumeById);
router.put('/:id', protect, authorize('STUDENT'), validateObjectId('id'), updateResume);
router.delete('/:id', protect, authorize('STUDENT'), validateObjectId('id'), deleteResume);
router.post('/:id/duplicate', protect, authorize('STUDENT'), validateObjectId('id'), duplicateResume);

module.exports = router;

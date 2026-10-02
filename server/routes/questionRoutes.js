const express = require('express');
const router = express.Router();
const {
  getQuestions,
  getQuestionStats,
  getQuestionMeta,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion
} = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Statistics & Metadata
router.get('/stats', protect, getQuestionStats);
router.get('/meta', protect, getQuestionMeta);

// Questions listing & single question details
router.get('/', protect, getQuestions);
router.get('/questions', protect, getQuestions);
router.get('/:id', protect, validateObjectId('id'), getQuestionById);

// Faculty & Admin Question Management
router.post('/', protect, authorize('FACULTY', 'ADMIN'), createQuestion);
router.post('/questions', protect, authorize('FACULTY', 'ADMIN'), createQuestion);
router.put('/:id', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), updateQuestion);
router.delete('/:id', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), deleteQuestion);

module.exports = router;

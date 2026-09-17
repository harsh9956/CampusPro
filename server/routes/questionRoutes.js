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

// Statistics & Metadata
router.get('/stats', protect, getQuestionStats);
router.get('/meta', protect, getQuestionMeta);

// Questions listing & single question details
router.get('/', protect, getQuestions);
router.get('/questions', protect, getQuestions);
router.get('/:id', protect, getQuestionById);

// Faculty & Admin CRUD operations
router.post('/', protect, authorize('faculty', 'admin'), createQuestion);
router.post('/questions', protect, authorize('faculty', 'admin'), createQuestion);
router.put('/:id', protect, authorize('faculty', 'admin'), updateQuestion);
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteQuestion);

module.exports = router;

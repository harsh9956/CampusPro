const express = require('express');
const router = express.Router();
const {
  getMockTests,
  getFacultyMockTests,
  getMockTestById,
  createMockTest,
  updateMockTest,
  publishMockTest,
  unpublishMockTest,
  deleteMockTest,
  submitMockTest,
  getMockTestResults,
  exportMockTestResults,
  getMyResults
} = require('../controllers/mockTestController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Faculty / Admin test management feed
router.get('/faculty', protect, authorize('faculty', 'admin'), getFacultyMockTests);

// Student results history
router.get('/my-results', protect, authorize('student'), getMyResults);

// Public / Published feed for students
router.get('/published', protect, getMockTests);
router.get('/', protect, getMockTests);
router.get('/:id', protect, getMockTestById);

// Faculty / Admin CRUD operations
router.post('/', protect, authorize('faculty', 'admin'), createMockTest);
router.put('/:id', protect, authorize('faculty', 'admin'), updateMockTest);
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteMockTest);

// Publish / Unpublish endpoints
router.patch('/:id/publish', protect, authorize('faculty', 'admin'), publishMockTest);
router.put('/:id/publish', protect, authorize('faculty', 'admin'), publishMockTest);

router.patch('/:id/unpublish', protect, authorize('faculty', 'admin'), unpublishMockTest);
router.put('/:id/unpublish', protect, authorize('faculty', 'admin'), unpublishMockTest);

// Test submission, attempts view & Excel export
router.post('/:id/submit', protect, authorize('student'), submitMockTest);
router.get('/:id/results/export', protect, authorize('faculty', 'admin'), exportMockTestResults);
router.get('/:id/results', protect, authorize('faculty', 'admin'), getMockTestResults);

module.exports = router;

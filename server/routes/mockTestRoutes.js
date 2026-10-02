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
  getMyResults,
  getMockResultById
} = require('../controllers/mockTestController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Faculty / Admin test management feed
router.get('/faculty', protect, authorize('FACULTY', 'ADMIN'), getFacultyMockTests);

// Student results history (both /my-results and /results/my supported)
router.get('/my-results', protect, authorize('STUDENT'), getMyResults);
router.get('/results/my', protect, authorize('STUDENT'), getMyResults);

// Specific test result by ID (Object-level authorization enforced)
router.get('/results/:resultId', protect, validateObjectId('resultId'), getMockResultById);

// Public / Published feed for students
router.get('/published', protect, getMockTests);
router.get('/', protect, getMockTests);
router.get('/:id', protect, validateObjectId('id'), getMockTestById);

// Faculty / Admin CRUD operations
router.post('/', protect, authorize('FACULTY', 'ADMIN'), createMockTest);
router.put('/:id', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), updateMockTest);
router.delete('/:id', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), deleteMockTest);

// Publish / Unpublish endpoints
router.patch('/:id/publish', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), publishMockTest);
router.put('/:id/publish', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), publishMockTest);

router.patch('/:id/unpublish', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), unpublishMockTest);
router.put('/:id/unpublish', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), unpublishMockTest);

// Test submission, attempts view & Excel export
router.post('/:id/submit', protect, authorize('STUDENT'), validateObjectId('id'), submitMockTest);
router.get('/:id/results/export', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), exportMockTestResults);
router.get('/:id/results', protect, authorize('FACULTY', 'ADMIN'), validateObjectId('id'), getMockTestResults);

module.exports = router;

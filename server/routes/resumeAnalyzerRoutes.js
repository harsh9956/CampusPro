const express = require('express');
const router = express.Router();
const {
  analyzeResume,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis
} = require('../controllers/resumeAnalyzerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');
const {
  resumeUpload,
  validateMagicBytesMiddleware,
  handleUploadError
} = require('../middleware/uploadMiddleware');

router.post(
  '/analyze',
  protect,
  authorize('STUDENT'),
  handleUploadError(resumeUpload),
  validateMagicBytesMiddleware,
  analyzeResume
);
router.get('/history', protect, authorize('STUDENT'), getAnalysisHistory);
router.get('/:id', protect, validateObjectId('id'), getAnalysisById);
router.delete('/:id', protect, validateObjectId('id'), deleteAnalysis);

module.exports = router;

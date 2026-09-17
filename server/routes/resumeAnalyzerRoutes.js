const express = require('express');
const router = express.Router();
const { analyzeResume, getAnalysisHistory } = require('../controllers/resumeAnalyzerController');
const { protect } = require('../middleware/authMiddleware');
const { resumeUpload } = require('../middleware/uploadMiddleware');

router.post('/analyze', protect, resumeUpload, analyzeResume);
router.get('/history', protect, getAnalysisHistory);

module.exports = router;

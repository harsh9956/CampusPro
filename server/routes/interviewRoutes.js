const express = require('express');
const router = express.Router();
const {
  getDriveInterviews,
  getApplicationRoundHistory,
  saveRoundResult,
  advanceCandidateRound,
  bulkUpdateRoundResults
} = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Get all applications, drive rounds, and existing results for a drive
router.get('/drive/:driveId', protect, authorize('admin', 'faculty'), getDriveInterviews);

// Get round history for a specific application
router.get('/application/:applicationId', protect, getApplicationRoundHistory);

// Save / update individual round result
router.post('/result', protect, authorize('admin', 'faculty'), saveRoundResult);

// Advance candidate to next round or final selection / rejection
router.post('/advance', protect, authorize('admin', 'faculty'), advanceCandidateRound);

// Bulk update round results
router.post('/bulk-result', protect, authorize('admin', 'faculty'), bulkUpdateRoundResults);

module.exports = router;

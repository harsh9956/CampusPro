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
const { validateObjectId } = require('../middleware/validateObjectId');

// Get all applications, drive rounds, and existing results for a drive
router.get('/drive/:driveId', protect, authorize('ADMIN', 'FACULTY'), validateObjectId('driveId'), getDriveInterviews);

// Get round history for a specific application
router.get('/application/:applicationId', protect, validateObjectId('applicationId'), getApplicationRoundHistory);

// Save / update individual round result
router.post('/result', protect, authorize('ADMIN', 'FACULTY'), saveRoundResult);

// Advance candidate to next round or final selection / rejection
router.post('/advance', protect, authorize('ADMIN', 'FACULTY'), advanceCandidateRound);

// Bulk update round results
router.post('/bulk-result', protect, authorize('ADMIN', 'FACULTY'), bulkUpdateRoundResults);

module.exports = router;

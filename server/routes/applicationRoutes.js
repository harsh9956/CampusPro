const express = require('express');
const router = express.Router();
const {
  applyToDrive,
  getMyApplications,
  getDriveApplications,
  updateApplicationStatus
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/:driveId/apply', protect, authorize('student'), applyToDrive);
router.get('/my', protect, authorize('student'), getMyApplications);
router.get('/drive/:driveId', protect, authorize('admin', 'faculty'), getDriveApplications);
router.put('/:id/status', protect, authorize('admin', 'faculty'), updateApplicationStatus);

module.exports = router;

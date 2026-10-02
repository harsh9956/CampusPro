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
const { validateObjectId } = require('../middleware/validateObjectId');

router.post('/:driveId/apply', protect, authorize('STUDENT'), validateObjectId('driveId'), applyToDrive);
router.get('/my', protect, authorize('STUDENT'), getMyApplications);
router.get('/drive/:driveId', protect, authorize('ADMIN', 'FACULTY'), validateObjectId('driveId'), getDriveApplications);
router.put('/:id/status', protect, authorize('ADMIN', 'FACULTY'), validateObjectId('id'), updateApplicationStatus);

module.exports = router;

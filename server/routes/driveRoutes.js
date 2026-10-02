const express = require('express');
const router = express.Router();
const {
  uploadJdPdf,
  getDrives,
  getDriveById,
  getDriveJd,
  createDrive,
  updateDrive,
  publishDrive,
  getDriveNotificationStatus,
  retryFailedNotifications,
  deleteDrive,
  testEmailDelivery,
  getDriveMatchingCount,
  previewTargetAudienceCount
} = require('../controllers/driveController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');
const {
  jdPdfUpload,
  validateMagicBytesMiddleware,
  handleUploadError
} = require('../middleware/uploadMiddleware');

// Diagnostic Email Test (Admin only, isolates Nodemailer from BullMQ)
router.post('/test-email', protect, authorize('ADMIN'), testEmailDelivery);

// Preview Target Audience Count (Admin only, live form evaluation)
router.post('/preview-target-count', protect, authorize('ADMIN'), previewTargetAudienceCount);

// Upload JD Document (Admin & Faculty, max 10MB, PDF/DOC/DOCX/TXT)
router.post(
  '/upload-jd',
  protect,
  authorize('ADMIN', 'FACULTY'),
  handleUploadError(jdPdfUpload),
  validateMagicBytesMiddleware,
  uploadJdPdf
);

// Drive listing & details (Authenticated users)
router.get('/', protect, getDrives);
router.get('/:id/matching-count', protect, authorize('ADMIN'), validateObjectId('id'), getDriveMatchingCount);
router.get('/:id', protect, validateObjectId('id'), getDriveById);
router.get('/:id/jd', protect, validateObjectId('id'), getDriveJd);

// Drive Management - Admin only
router.post('/', protect, authorize('ADMIN'), createDrive);
router.put('/:id', protect, authorize('ADMIN'), validateObjectId('id'), updateDrive);
router.post('/:id/publish', protect, authorize('ADMIN'), validateObjectId('id'), publishDrive);
router.get('/:id/notifications/status', protect, authorize('ADMIN'), validateObjectId('id'), getDriveNotificationStatus);
router.post('/:id/notifications/retry-failed', protect, authorize('ADMIN'), validateObjectId('id'), retryFailedNotifications);
router.delete('/:id', protect, authorize('ADMIN'), validateObjectId('id'), deleteDrive);

module.exports = router;

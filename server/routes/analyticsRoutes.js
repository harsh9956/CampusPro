const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getFacultyDashboardStats,
  getAuditLogs,
  getAnnouncements,
  createAnnouncement,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  uploadJd,
  generateAiRoadmap,
  getActiveRoadmap,
  updateRoadmapTask,
  analyzeResume
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');
const {
  jdDocumentUpload,
  validateMagicBytesMiddleware,
  handleUploadError
} = require('../middleware/uploadMiddleware');

router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/faculty-stats', protect, authorize('FACULTY', 'ADMIN'), getFacultyDashboardStats);
router.get('/audit-logs', protect, authorize('ADMIN'), getAuditLogs);
router.get('/announcements', protect, getAnnouncements);
router.post('/announcements', protect, authorize('ADMIN', 'FACULTY'), createAnnouncement);
router.get('/notifications', protect, getNotifications);
router.get('/notifications/unread-count', protect, getUnreadNotificationCount);
router.put('/notifications/read-all', protect, markAllNotificationsRead);
router.put('/notifications/:id/read', protect, validateObjectId('id'), markNotificationRead);

// AI Preparation Roadmap Routes (Student access)
router.post(
  '/ai-roadmap/upload-jd',
  protect,
  authorize('STUDENT'),
  handleUploadError(jdDocumentUpload),
  validateMagicBytesMiddleware,
  uploadJd
);
router.post('/ai-roadmap', protect, authorize('STUDENT'), generateAiRoadmap);
router.get('/ai-roadmap/active', protect, authorize('STUDENT'), getActiveRoadmap);
router.patch('/ai-roadmap/:id/task', protect, authorize('STUDENT'), validateObjectId('id'), updateRoadmapTask);
router.post('/resume-analyzer', protect, authorize('STUDENT'), analyzeResume);

module.exports = router;

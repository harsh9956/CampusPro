const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getAuditLogs,
  getAnnouncements,
  createAnnouncement,
  getNotifications,
  markNotificationRead,
  generateAiRoadmap,
  getActiveRoadmap,
  updateRoadmapTask,
  analyzeResume
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);
router.get('/announcements', protect, getAnnouncements);
router.post('/announcements', protect, authorize('admin', 'faculty'), createAnnouncement);
router.get('/notifications', protect, getNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);
router.post('/ai-roadmap', protect, generateAiRoadmap);
router.get('/ai-roadmap/active', protect, getActiveRoadmap);
router.patch('/ai-roadmap/:id/task', protect, updateRoadmapTask);
router.post('/resume-analyzer', protect, analyzeResume);

module.exports = router;

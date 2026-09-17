const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditLogById } = require('../controllers/auditLogController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Protected GET routes accessible only to ADMIN role
router.get('/', protect, authorize('admin'), getAuditLogs);
router.get('/:id', protect, authorize('admin'), getAuditLogById);

module.exports = router;

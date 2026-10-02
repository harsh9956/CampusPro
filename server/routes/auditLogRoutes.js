const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditLogById } = require('../controllers/auditLogController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Protected GET routes accessible only to ADMIN role
router.get('/', protect, authorize('ADMIN'), getAuditLogs);
router.get('/:id', protect, authorize('ADMIN'), validateObjectId('id'), getAuditLogById);

module.exports = router;

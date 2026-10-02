const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'FACULTY', 'STUDENT', 'SUPER_ADMIN', 'admin', 'faculty', 'Student', 'student', 'super_admin'],
    required: true
  },
  actionType: {
    type: String,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE', 'PUBLISH', 'UNPUBLISH', 'EXPORT', 'UPLOAD', 'LOGIN',
      'UPLOAD_RESUME', 'DELETE_RESUME', 'DELETE_INTERVIEW_EXPERIENCE', 'DELETE_ACADEMIC_YEAR_DATA',
      'DRIVE_PUBLISHED', 'DRIVE_NOTIFICATION_STARTED', 'DRIVE_NOTIFICATION_COMPLETED', 'DRIVE_NOTIFICATION_QUEUED',
      'EMAIL_RETRY', 'EMAIL_RETRY_QUEUED', 'EXPORT_QUEUED', 'EXPORT_COMPLETED'
    ],
    required: true
  },
  targetEntity: {
    type: String,
    enum: ['Company', 'Placement Drive', 'Application', 'Mock Test', 'Question', 'Interview', 'Result', 'Student', 'Faculty', 'Admin', 'User', 'JD', 'Interview Experience', 'Student Resume', 'Company JD', 'Academic Year', 'Section', 'Department'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  targetName: {
    type: String,
    default: ''
  },
  details: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  }
}, {
  timestamps: true
});

// Database Indexing for High Performance Querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetEntity: 1, createdAt: -1 });
auditLogSchema.index({ actionType: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

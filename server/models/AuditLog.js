const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'FACULTY', 'admin', 'faculty', 'Student', 'student'],
    required: true
  },
  actionType: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH', 'EXPORT', 'UPLOAD', 'LOGIN'],
    required: true
  },
  targetEntity: {
    type: String,
    enum: ['Company', 'Placement Drive', 'Application', 'Mock Test', 'Question', 'Interview', 'Result', 'Student', 'Faculty', 'Admin', 'User', 'JD', 'Interview Experience'],
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
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ actionType: 1 });
auditLogSchema.index({ targetEntity: 1 });
auditLogSchema.index({ role: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

const mongoose = require('mongoose');

const emailNotificationLogSchema = new mongoose.Schema({
  placementDrive: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlacementDrive',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  notificationType: {
    type: String,
    enum: ['PLACEMENT_DRIVE_PUBLISH', 'PLACEMENT_DRIVE_UPDATE'],
    default: 'PLACEMENT_DRIVE_PUBLISH'
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'SKIPPED'],
    default: 'PENDING'
  },
  sentAt: {
    type: Date,
    default: null
  },
  failedAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: ''
  },
  attemptCount: {
    type: Number,
    default: 1
  },
  lastAttemptAt: {
    type: Date,
    default: Date.now
  },
  messageId: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound indexes to quickly query delivery status and enforce strict delivery idempotency
emailNotificationLogSchema.index({ placementDrive: 1, user: 1, notificationType: 1 }, { unique: true });
emailNotificationLogSchema.index({ placementDrive: 1, email: 1, notificationType: 1 }, { unique: true });
emailNotificationLogSchema.index({ placementDrive: 1, student: 1, notificationType: 1 });
emailNotificationLogSchema.index({ placementDrive: 1, status: 1 });
emailNotificationLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EmailNotificationLog', emailNotificationLogSchema);

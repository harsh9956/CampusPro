const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['DRIVE', 'PLACEMENT_DRIVE', 'INTERVIEW', 'RESULT', 'ANNOUNCEMENT', 'GENERAL'], default: 'GENERAL' },
  relatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  academicYear: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Performance Indexes for ~100,000+ Notifications
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ academicYear: 1, user: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);


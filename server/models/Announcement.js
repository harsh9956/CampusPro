const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  department: { type: String, default: 'ALL' }, // 'ALL' or specific dept like 'CSE'
  targetRole: { type: String, enum: ['ALL', 'STUDENT', 'FACULTY'], default: 'ALL' },
  createdBy: { type: String, required: true, default: 'TPO Admin' },
  academicYear: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

// Performance Indexes
announcementSchema.index({ academicYear: 1, createdAt: -1 });
announcementSchema.index({ targetRole: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);


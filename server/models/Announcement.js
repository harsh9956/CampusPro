const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  department: { type: String, default: 'ALL' }, // 'ALL' or specific dept like 'CSE'
  targetRole: { type: String, enum: ['ALL', 'STUDENT', 'FACULTY'], default: 'ALL' },
  createdBy: { type: String, required: true, default: 'TPO Admin' },
  academicYear: { type: String, default: '2026-27' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);

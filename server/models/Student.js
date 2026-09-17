const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrollmentNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  department: { type: String, required: true }, // e.g. CSE, IT, ECE
  branch: { type: String, required: true },       // e.g. Computer Science & Engineering
  year: { type: Number, required: true, default: 4 }, // 1, 2, 3, 4
  cgpa: { type: Number, required: true, min: 0, max: 10 },
  backlogs: { type: Number, required: true, default: 0 },
  skills: [{ type: String }],
  phone: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  bio: { type: String, default: '' },
  academicYear: { type: String, default: '2026-27' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', studentSchema);

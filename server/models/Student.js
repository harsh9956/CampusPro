const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enrollmentNo: { type: String, required: true, uppercase: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  branch: { type: String, required: true },       // e.g. Computer Science & Engineering
  year: { type: Number, required: true, default: 4 }, // 1, 2, 3, 4
  cgpa: {
    type: Number,
    required: [true, 'Current CGPA is required'],
    min: [0, 'CGPA must be between 0 and 10.'],
    max: [10, 'CGPA must be between 0 and 10.']
  },
  tenthPercentage: {
    type: Number,
    min: [1, '10th percentage must be between 1 and 100.'],
    max: [100, '10th percentage must be between 1 and 100.']
  },
  twelfthPercentage: {
    type: Number,
    min: [1, '12th percentage must be between 1 and 100.'],
    max: [100, '12th percentage must be between 1 and 100.']
  },
  backlogs: {
    type: Number,
    required: [true, 'Active backlogs is required'],
    default: 0,
    min: [0, 'Active backlogs must be an integer between 0 and 20.'],
    max: [20, 'Active backlogs must be an integer between 0 and 20.'],
    validate: {
      validator: Number.isInteger,
      message: 'Active backlogs must be an integer between 0 and 20.'
    }
  },
  dateOfBirth: { type: Date },
  studentMobileNumber: { type: String, trim: true },
  parentMobileNumber: { type: String, trim: true },
  permanentAddress: { type: String, trim: true },
  permanentPinCode: { type: String, trim: true },
  temporaryAddress: { type: String, trim: true },
  temporaryPinCode: { type: String, trim: true },
  pinCode: { type: String, trim: true },
  skills: [{ type: String }],
  profileLinks: {
    github: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    leetcode: { type: String, trim: true, default: '' },
    geeksforgeeks: { type: String, trim: true, default: '' },
    custom: [
      {
        label: { type: String, trim: true, default: '' },
        url: { type: String, trim: true, default: '' }
      }
    ]
  },
  phone: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  resumePublicId: { type: String, default: '' },
  resumeFileName: { type: String, default: '' },
  resumeFileSize: { type: Number, default: 0 },
  resumeUploadedAt: { type: Date, default: null },
  resumeFileType: { type: String, default: '' },
  bio: { type: String, default: '' },
  academicYear: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

// Performance Indexes for ~10,000 students
studentSchema.index({ enrollmentNo: 1, academicYear: 1 }, { unique: true });
studentSchema.index({ user: 1 });
studentSchema.index({ department: 1, section: 1, createdAt: -1 });
studentSchema.index({ department: 1, createdAt: -1 });
studentSchema.index({ section: 1, createdAt: -1 });
studentSchema.index({ department: 1, cgpa: -1 });
studentSchema.index({ cgpa: 1 });
studentSchema.index({ academicYear: 1, createdAt: -1 });
studentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Student', studentSchema);


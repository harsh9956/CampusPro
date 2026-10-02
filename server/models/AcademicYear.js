const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    year: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2026-27)'],
      unique: true,
      trim: true
    },
    isCurrent: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'UPCOMING', 'ARCHIVED'],
      default: 'ACTIVE'
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    description: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

academicYearSchema.index({ isCurrent: 1 });
academicYearSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AcademicYear', academicYearSchema);

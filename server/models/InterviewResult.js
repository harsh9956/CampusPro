const mongoose = require('mongoose');

const interviewResultSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlacementDrive',
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    companyName: {
      type: String,
      default: ''
    },
    roundName: {
      type: String,
      required: true
    },
    roundOrder: {
      type: Number,
      required: true,
      default: 1
    },
    roundType: {
      type: String,
      default: 'Other'
    },
    status: {
      type: String,
      enum: ['PENDING', 'PASSED', 'FAILED', 'NOT_ATTEMPTED'],
      default: 'PENDING'
    },
    score: {
      type: Number,
      default: null
    },
    feedback: {
      type: String,
      default: ''
    },
    interviewDate: {
      type: Date,
      default: null
    },
    evaluatedAt: {
      type: Date,
      default: Date.now
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    evaluatedByName: {
      type: String,
      default: ''
    },
    academicYear: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure one evaluation record per application per roundOrder
interviewResultSchema.index({ application: 1, roundOrder: 1 }, { unique: true });

// Performance Indexes for Interview Evaluations
interviewResultSchema.index({ academicYear: 1, status: 1 });
interviewResultSchema.index({ drive: 1, roundOrder: 1 });
interviewResultSchema.index({ drive: 1, status: 1 });
interviewResultSchema.index({ student: 1 });
interviewResultSchema.index({ user: 1 });
interviewResultSchema.index({ status: 1 });

module.exports = mongoose.model('InterviewResult', interviewResultSchema);


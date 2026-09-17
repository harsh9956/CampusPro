const mongoose = require('mongoose');

const interviewExperienceSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required']
    },
    jobRole: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD', 'Easy', 'Medium', 'Hard'],
      required: [true, 'Difficulty level is required'],
      uppercase: true
    },
    questions: [
      {
        type: String,
        trim: true
      }
    ],
    narrative: {
      type: String,
      required: [true, 'Experience narrative is required']
    },
    advice: {
      type: String,
      default: ''
    },
    interviewDate: {
      type: Date,
      default: Date.now
    },
    interviewMode: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'ONLINE'
    },
    selectionStatus: {
      type: String,
      enum: ['SELECTED', 'NOT_SELECTED', 'WAITING', 'NOT_DISCLOSED'],
      default: 'NOT_DISCLOSED'
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual aliases for backward compatibility
interviewExperienceSchema.virtual('role').get(function () {
  return this.jobRole;
});

interviewExperienceSchema.virtual('questionsAsked').get(function () {
  return this.questions;
});

interviewExperienceSchema.virtual('experienceText').get(function () {
  return this.narrative;
});

interviewExperienceSchema.virtual('isApproved').get(function () {
  return this.approvalStatus === 'APPROVED';
});

module.exports = mongoose.model('InterviewExperience', interviewExperienceSchema);

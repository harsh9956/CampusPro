const mongoose = require('mongoose');

const applicationTimelineSchema = new mongoose.Schema({
  stage: { type: String, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
  drive: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementDrive', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentRound: { type: String, default: '' },
  currentRoundOrder: { type: Number, default: 1 },
  status: {
    type: String,
    enum: [
      'REGISTERED',
      'IN_PROGRESS',
      'SHORTLISTED',
      'APTITUDE_CLEARED',
      'CODING_CLEARED',
      'TECHNICAL_CLEARED',
      'HR_CLEARED',
      'SELECTED',
      'REJECTED',
      'WITHDRAWN'
    ],
    default: 'REGISTERED'
  },
  timeline: [applicationTimelineSchema],
  appliedAt: { type: Date, default: Date.now }
});

// Ensure a student can apply to a drive only once
applicationSchema.index({ drive: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);

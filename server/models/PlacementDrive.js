const mongoose = require('mongoose');

const selectionProcessSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  roundName: { type: String, required: true },
  roundType: { type: String, default: 'Other' },
  description: { type: String, default: '' },
  mode: { type: String, enum: ['Online', 'Offline', 'Hybrid', 'ONLINE', 'OFFLINE', 'HYBRID'], default: 'Online' },
  duration: { type: Number, default: null }, // in minutes
  date: { type: Date, default: null }
});

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  name: { type: String, required: true },
  mode: { type: String, enum: ['Online', 'Offline', 'Hybrid'], default: 'Offline' },
  venue: { type: String, default: 'Placement Hall / Virtual Link' },
  date: { type: Date }
});

const placementDriveSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  jobRole: { type: String, required: true },
  package: { type: String, required: true },
  location: { type: String, required: true },
  driveDate: { type: Date, required: true },
  deadline: { type: Date, required: true },
  
  // Eligibility Engine parameters
  minCgpa: { type: Number, required: true, default: 6.0 },
  maxBacklogs: { type: Number, required: true, default: 0 },
  eligibleBranches: [{ type: String, required: true }],
  eligiblePassingYears: [{ type: Number, default: [2027] }],
  
  // Job Description (text OR metadata object for PDF file)
  jobDescriptionText: { type: String, default: '' },
  jobDescription: { type: mongoose.Schema.Types.Mixed, default: null },

  // Official Company Application Link
  applyLink: {
    type: String,
    trim: true,
    default: ''
  },

  selectionProcess: [selectionProcessSchema],
  selectionRounds: [roundSchema],
  status: { type: String, enum: ['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'ACTIVE' },
  academicYear: { type: String, default: '2026-27' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);

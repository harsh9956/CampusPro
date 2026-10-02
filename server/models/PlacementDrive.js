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

  // Dynamic Academic Eligibility Criteria
  eligibilityCriteria: {
    minimumAcademic: {
      enabled: { type: Boolean, default: true },
      type: { type: String, enum: ['CGPA', 'PERCENTAGE'], default: 'CGPA' },
      value: { type: Number, default: 6.0 }
    },
    highSchool: {
      enabled: { type: Boolean, default: false },
      minimumPercentage: { type: Number, default: 60 }
    },
    intermediate: {
      enabled: { type: Boolean, default: false },
      minimumPercentage: { type: Number, default: 60 }
    }
  },
  
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
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'DRAFT' },
  notificationSettings: {
    sendEmailNotification: { type: Boolean, default: true },
    createInAppNotification: { type: Boolean, default: true },
    targetAudience: {
      type: String,
      enum: ['ALL_ACTIVE_STUDENTS', 'ELIGIBLE_STUDENTS_ONLY', 'SPECIFIC_SECTIONS', 'ALL_ACTIVE', 'ELIGIBLE_ONLY'],
      default: 'ALL_ACTIVE_STUDENTS'
    },
    targetSections: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section'
    }]
  },
  targetAudience: {
    type: {
      type: String,
      enum: ['ALL_ACTIVE_STUDENTS', 'ELIGIBLE_STUDENTS_ONLY', 'SPECIFIC_SECTIONS', 'ALL_ACTIVE', 'ELIGIBLE_ONLY'],
      default: 'ALL_ACTIVE_STUDENTS'
    },
    sectionIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section'
    }]
  },
  publishedAt: { type: Date, default: null },
  academicYear: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save middleware to synchronize targetAudience and notificationSettings
placementDriveSchema.pre('save', function (next) {
  // Normalize audience types
  let audienceType = 'ALL_ACTIVE_STUDENTS';
  if (this.targetAudience?.type) {
    audienceType = this.targetAudience.type;
  } else if (this.notificationSettings?.targetAudience) {
    audienceType = this.notificationSettings.targetAudience;
  }

  // Handle aliases
  if (audienceType === 'ALL_ACTIVE') audienceType = 'ALL_ACTIVE_STUDENTS';
  if (audienceType === 'ELIGIBLE_ONLY') audienceType = 'ELIGIBLE_STUDENTS_ONLY';

  // Gather section IDs
  let sections = [];
  if (Array.isArray(this.targetAudience?.sectionIds) && this.targetAudience.sectionIds.length > 0) {
    sections = this.targetAudience.sectionIds;
  } else if (Array.isArray(this.notificationSettings?.targetSections) && this.notificationSettings.targetSections.length > 0) {
    sections = this.notificationSettings.targetSections;
  }

  // For non-specific section modes, clear section IDs
  if (audienceType !== 'SPECIFIC_SECTIONS') {
    sections = [];
  }

  // Keep both structures synchronized
  if (!this.targetAudience) this.targetAudience = {};
  this.targetAudience.type = audienceType;
  this.targetAudience.sectionIds = sections;

  if (!this.notificationSettings) this.notificationSettings = {};
  this.notificationSettings.targetAudience = audienceType;
  this.notificationSettings.targetSections = sections;

  next();
});

// Performance Indexes for Placement Drives
placementDriveSchema.index({ academicYear: 1, status: 1, driveDate: 1 });
placementDriveSchema.index({ status: 1, driveDate: 1 });
placementDriveSchema.index({ status: 1, createdAt: -1 });
placementDriveSchema.index({ status: 1, deadline: 1 });
placementDriveSchema.index({ company: 1, status: 1 });
placementDriveSchema.index({ deadline: 1 });
placementDriveSchema.index({ 'targetAudience.sectionIds': 1 });
placementDriveSchema.index({ 'notificationSettings.targetSections': 1 });
placementDriveSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);


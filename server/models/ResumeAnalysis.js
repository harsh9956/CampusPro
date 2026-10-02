const mongoose = require('mongoose');

const resumeAnalysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeFileName: {
    type: String,
    default: 'Uploaded_Resume.pdf'
  },
  resumeUrl: {
    type: String,
    default: ''
  },
  resumePublicId: {
    type: String,
    default: ''
  },
  jdFileName: {
    type: String,
    default: 'Job_Description.txt'
  },
  jobRole: {
    type: String,
    default: 'Software Engineer'
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  matchLevel: {
    type: String,
    enum: ['Very Strong Match', 'Excellent Match', 'Good Match', 'Moderate Match', 'Needs Improvement'],
    default: 'Good Match'
  },
  scoreBreakdown: {
    requiredSkills: { type: Number, default: 0 },
    jdKeywords: { type: Number, default: 0 },
    roleRelevance: { type: Number, default: 0 },
    education: { type: Number, default: 0 },
    projectsExperience: { type: Number, default: 0 },
    preferredSkills: { type: Number, default: 0 },
    softSkills: { type: Number, default: 0 }
  },
  requiredSkills: [{ type: String }],
  preferredSkills: [{ type: String }],
  matchedSkills: [{ type: String }],
  missingRequiredSkills: [{
    name: String,
    priority: { type: String, default: 'HIGH' },
    requirement: { type: String, default: 'Required' },
    reason: String,
    action: String
  }],
  missingPreferredSkills: [{
    name: String,
    priority: { type: String, default: 'MEDIUM' },
    requirement: { type: String, default: 'Preferred' },
    reason: String,
    action: String
  }],
  softSkills: [{ type: String }],
  educationRequirements: [{ type: String }],
  experienceRequirements: [{ type: String }],
  matchedKeywords: [{ type: String }],
  missingKeywords: [{ type: String }],
  skillGap: {
    totalRequired: { type: Number, default: 0 },
    matchedCount: { type: Number, default: 0 },
    missingCount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    alreadyHave: [{ type: String }],
    needToLearn: [{ type: String }]
  },
  suggestions: [{ type: String }],
  preparationChecklist: {
    mustHave: [{ type: String }],
    stronglyRecommended: [{ type: String }],
    resumeImprovement: [{ type: String }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Performance Indexes
resumeAnalysisSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);


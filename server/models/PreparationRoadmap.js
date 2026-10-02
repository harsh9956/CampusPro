const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  reason: { type: String, default: '' },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'NOT_STARTED'
  }
});

const dayPlanSchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true },
  focus: { type: String, required: true },
  topics: [{ type: String }],
  tasks: [taskSchema],
  estimatedHours: { type: Number, default: 5 },
  priority: { type: String, default: 'HIGH' },
  expectedOutcome: { type: String, default: '' }
});

const preparationRoadmapSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true },
    jobRole: { type: String, required: true },
    days: { type: Number, required: true, default: 3 },
    generationSeed: { type: String, required: true },
    strategyName: { type: String, required: true },
    researchSummary: { type: String, default: '' },
    preparationStrategy: { type: String, default: '' },
    priorityAreas: [{ type: String }],
    finalRecommendations: [{ type: String }],
    daysPlan: [dayPlanSchema],
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    progressPercentage: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    // Job Description optional fields
    hasJd: { type: Boolean, default: false },
    fileName: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    extractedText: { type: String, default: '' },
    jdAnalysis: { type: Object, default: null },
    jdWarning: { type: String, default: '' }
  },
  {
    timestamps: true
  }
);

// Performance Indexes
preparationRoadmapSchema.index({ user: 1, isActive: 1 });
preparationRoadmapSchema.index({ student: 1, isActive: 1 });
preparationRoadmapSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PreparationRoadmap', preparationRoadmapSchema);

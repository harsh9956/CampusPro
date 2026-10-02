const mongoose = require('mongoose');

const testQuestionSchema = new mongoose.Schema({
  questionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
  questionText: { type: String, required: [true, 'Question text is required'] },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: [true, 'Correct answer index is required'] },
  explanation: { type: String, default: '' },
  topic: { type: String, default: 'General' },
  questionType: {
    type: String,
    enum: ['Multiple Choice', 'True/False', 'Coding', 'Short Answer'],
    default: 'Multiple Choice'
  },
  marks: { type: Number, default: 1 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }
});

const mockTestSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Test title is required'], trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General Placement Mock Test' },
    testType: { type: String, default: 'General Placement' },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    companyName: { type: String, default: 'General' },
    durationMinutes: { type: Number, required: [true, 'Duration in minutes is required'], default: 30 },
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    passingMarks: { type: Number, default: 0 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', 'Mixed'], default: 'Medium' },
    academicYear: { type: String, trim: true },
    topicsCovered: [{ type: String }],
    questions: [testQuestionSchema],
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'], default: 'DRAFT' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, default: 'Faculty Coordinator' }
  },
  {
    timestamps: true
  }
);

// Performance Indexes for Mock Tests
mockTestSchema.index({ status: 1, createdAt: -1 });
mockTestSchema.index({ company: 1, status: 1 });
mockTestSchema.index({ testType: 1, status: 1 });
mockTestSchema.index({ createdBy: 1, createdAt: -1 });
mockTestSchema.index({ academicYear: 1 });

module.exports = mongoose.model('MockTest', mockTestSchema);


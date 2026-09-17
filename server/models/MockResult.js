const mongoose = require('mongoose');

const topicScoreSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  correct: { type: Number, required: true },
  total: { type: Number, required: true },
  percentage: { type: Number, required: true }
});

const answerDetailSchema = new mongoose.Schema({
  questionId: { type: String },
  selectedOptionIndex: { type: Number },
  isCorrect: { type: Boolean, default: false },
  marksObtained: { type: Number, default: 0 }
});

const mockResultSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mockTest: { type: mongoose.Schema.Types.ObjectId, ref: 'MockTest', required: true },
    testTitle: { type: String, required: true },
    companyName: { type: String, default: 'General' },
    score: { type: Number, required: true },
    totalScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    correctAnswers: { type: Number, default: 0 },
    incorrectAnswers: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    resultStatus: { type: String, enum: ['PASS', 'FAIL'], default: 'PASS' },
    status: { type: String, default: 'COMPLETED' },
    timeTakenMinutes: { type: Number, default: 0 },
    topicBreakdown: [topicScoreSchema],
    answers: [answerDetailSchema],
    completedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

mockResultSchema.virtual('totalMarks').get(function () {
  return this.totalScore;
});

mockResultSchema.virtual('wrongAnswers').get(function () {
  return this.incorrectAnswers;
});

mockResultSchema.virtual('unattempted').get(function () {
  return this.unanswered;
});

mockResultSchema.virtual('submittedAt').get(function () {
  return this.completedAt;
});

module.exports = mongoose.model('MockResult', mockResultSchema);

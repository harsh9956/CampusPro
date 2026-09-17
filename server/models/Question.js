const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, trim: true },
    question: { type: String, trim: true },
    answer: { type: String, required: [true, 'Answer is required'] },
    explanation: { type: String, default: '' },
    companies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    companyNames: [{ type: String }],
    companyName: { type: String, default: '' },
    topic: { type: String, required: [true, 'Topic is required'], trim: true },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'EASY', 'MEDIUM', 'HARD'],
      default: 'Medium'
    },
    roundType: { type: String, default: 'Technical' },
    frequency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'LOW', 'MEDIUM', 'HIGH'],
      default: 'High'
    },
    tags: [{ type: String }],
    yearAsked: { type: Number, default: 2026 },
    askedInYear: { type: Number, default: 2026 },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'Draft', 'Published'],
      default: 'PUBLISHED'
    },
    options: [{ type: String }],
    correctOptionIndex: { type: Number, default: null },
    questionType: { type: String, default: 'Multiple Choice' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String, default: 'Faculty Coordinator' }
  },
  {
    timestamps: true
  }
);

questionSchema.pre('save', function (next) {
  // Sync questionText & question
  if (this.questionText && !this.question) {
    this.question = this.questionText;
  } else if (this.question && !this.questionText) {
    this.questionText = this.question;
  }
  if (!this.questionText && !this.question) {
    return next(new Error('Question text is required'));
  }

  // Normalize status
  if (this.status) {
    this.status = this.status.toUpperCase();
  }

  // Normalize difficulty
  if (this.difficulty) {
    const d = this.difficulty.toUpperCase();
    if (d === 'EASY') this.difficulty = 'Easy';
    else if (d === 'MEDIUM') this.difficulty = 'Medium';
    else if (d === 'HARD') this.difficulty = 'Hard';
  }

  // Normalize frequency
  if (this.frequency) {
    const f = this.frequency.toUpperCase();
    if (f === 'LOW') this.frequency = 'Low';
    else if (f === 'MEDIUM') this.frequency = 'Medium';
    else if (f === 'HIGH') this.frequency = 'High';
  }

  // Sync yearAsked & askedInYear
  if (this.yearAsked && !this.askedInYear) {
    this.askedInYear = this.yearAsked;
  } else if (this.askedInYear && !this.yearAsked) {
    this.yearAsked = this.askedInYear;
  }

  // Sync companyName & companyNames
  if (this.companyName && (!this.companyNames || this.companyNames.length === 0)) {
    this.companyNames = [this.companyName];
  } else if (this.companyNames && this.companyNames.length > 0) {
    this.companyName = this.companyNames.join(', ');
  }

  next();
});

module.exports = mongoose.model('Question', questionSchema);

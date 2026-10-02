const mongoose = require('mongoose');

const exportJobSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['STUDENTS_EXCEL', 'DRIVES_EXCEL', 'APPLICATIONS_EXCEL'],
    default: 'STUDENTS_EXCEL'
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'QUEUED'
  },
  fileName: {
    type: String,
    default: ''
  },
  filePath: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String,
    default: ''
  },
  totalRecords: {
    type: Number,
    default: 0
  },
  processedRecords: {
    type: Number,
    default: 0
  },
  errorMessage: {
    type: String,
    default: ''
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for user queries and status checking
exportJobSchema.index({ user: 1, status: 1, createdAt: -1 });
exportJobSchema.index({ status: 1, createdAt: -1 });
exportJobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ExportJob', exportJobSchema);

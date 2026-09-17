const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // e.g., CSE, IT, ECE, ME, CE, AI-ML
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Department', departmentSchema);

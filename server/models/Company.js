const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  website: { type: String, default: '' },
  industry: { type: String, required: true }, // e.g. IT Services, Product, Consulting
  location: { type: String, required: true },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Company', companySchema);

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
  companyJd: {
    fileName: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    publicId: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null }
  },
  createdAt: { type: Date, default: Date.now }
});

// Performance Indexes
companySchema.index({ name: 1 });
companySchema.index({ status: 1 });

module.exports = mongoose.model('Company', companySchema);


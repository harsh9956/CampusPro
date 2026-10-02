const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true
    },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware to keep isActive & status in sync and auto-generate code if missing
sectionSchema.pre('save', function (next) {
  if (this.name) {
    this.name = this.name.trim();
  }

  // Keep isActive and status in sync
  if (this.isModified('isActive') && !this.isModified('status')) {
    this.status = this.isActive ? 'active' : 'inactive';
  } else if (this.isModified('status') && !this.isModified('isActive')) {
    this.isActive = this.status === 'active';
  } else {
    this.status = this.isActive ? 'active' : 'inactive';
  }

  // Auto-generate code if missing
  if (!this.code && this.name) {
    this.code = this.name.toUpperCase();
  }

  next();
});

// Performance Indexes (Scoped by Academic Year with Compound Uniqueness)
sectionSchema.index({ name: 1, academicYear: 1 }, { unique: true });
sectionSchema.index({ code: 1, academicYear: 1 }, { unique: true });
sectionSchema.index({ academicYear: 1, status: 1 });
sectionSchema.index({ isActive: 1, status: 1 });

module.exports = mongoose.model('Section', sectionSchema);


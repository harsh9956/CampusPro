const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true
    },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      default: ''
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true
    },
    academicYearRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware to keep isActive & status in sync and auto-generate code if missing
departmentSchema.pre('save', function (next) {
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

  // Auto-generate uppercase code if missing
  if (!this.code && this.name) {
    const words = this.name.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      this.code = this.name.slice(0, 4).toUpperCase();
    } else {
      this.code = words.map(w => w[0]).join('').toUpperCase();
    }
  }

  next();
});

// Performance Indexes (Scoped by Academic Year with Compound Uniqueness)
departmentSchema.index({ name: 1, academicYear: 1 }, { unique: true });
departmentSchema.index({ code: 1, academicYear: 1 }, { unique: true });
departmentSchema.index({ academicYear: 1, status: 1 });
departmentSchema.index({ academicYear: 1, isActive: 1 });
departmentSchema.index({ isActive: 1, status: 1 });

module.exports = mongoose.model('Department', departmentSchema);


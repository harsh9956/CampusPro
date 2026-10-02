const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['ADMIN', 'FACULTY', 'STUDENT', 'SUPER_ADMIN'],
      message: '{VALUE} is not a valid role. Allowed roles: ADMIN, FACULTY, STUDENT, SUPER_ADMIN'
    },
    default: 'STUDENT',
    uppercase: true,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
      message: '{VALUE} is not a valid status. Allowed values: ACTIVE, INACTIVE, BLOCKED'
    },
    default: 'ACTIVE',
    uppercase: true,
    trim: true
  },
  academicYear: {
    type: String,
    trim: true
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook: ensure role/status are uppercase and hash password if modified
userSchema.pre('save', async function (next) {
  if (this.role) this.role = this.role.toUpperCase();
  if (this.status) this.status = this.status.toUpperCase();
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
  // Generate random 32-byte token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token and store in document
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiration: 1 hour (60 minutes)
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

  return resetToken;
};

// Performance Indexes for ~10,000 users
userSchema.index({ role: 1, status: 1 });
userSchema.index({ status: 1 });
userSchema.index({ name: 1 });
userSchema.index({ academicYear: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);



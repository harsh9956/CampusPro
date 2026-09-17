const mongoose = require('mongoose');

const testTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Test type name is required'],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TestType', testTypeSchema);

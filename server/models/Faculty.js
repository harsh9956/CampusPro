const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: String, required: true, unique: true, uppercase: true },
  department: { type: String, required: true },
  designation: { type: String, default: 'Placement Coordinator' },
  phone: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Faculty', facultySchema);

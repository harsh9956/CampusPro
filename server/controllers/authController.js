const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { createAuditLog } = require('../services/auditLogService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'campuspro_super_secret_jwt_key_2026_tnp', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user (Student / Faculty / Admin)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, enrollmentNo, department, branch, year, cgpa, backlogs, employeeId } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student'
    });

    let profile = null;

    if (user.role === 'student') {
      profile = await Student.create({
        user: user._id,
        enrollmentNo: enrollmentNo || `EN${Date.now().toString().slice(-6)}`,
        department: department || 'CSE',
        branch: branch || 'Computer Science & Engineering',
        year: year || 4,
        cgpa: cgpa !== undefined ? Number(cgpa) : 7.5,
        backlogs: backlogs !== undefined ? Number(backlogs) : 0,
        skills: ['Java', 'React', 'SQL', 'DSA']
      });
    } else if (user.role === 'faculty') {
      profile = await Faculty.create({
        user: user._id,
        employeeId: employeeId || `EMP${Date.now().toString().slice(-5)}`,
        department: department || 'CSE',
        designation: 'Placement Coordinator'
      });
    }

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        academicYear: user.academicYear
      },
      profile
    });
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let profile = null;
    if (user.role === 'student') {
      profile = await Student.findOne({ user: user._id });
    } else if (user.role === 'faculty') {
      profile = await Faculty.findOne({ user: user._id });
    }

    if (user.role === 'admin' || user.role === 'faculty') {
      await createAuditLog({
        user,
        actionType: 'LOGIN',
        targetEntity: user.role === 'admin' ? 'Student' : 'Faculty',
        targetId: user._id,
        targetName: user.name,
        details: `${user.role.toUpperCase()} logged in successfully`,
        status: 'SUCCESS'
      });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        academicYear: user.academicYear
      },
      profile
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = req.user;
    let profile = null;
    if (user.role === 'student') {
      profile = await Student.findOne({ user: user._id });
    } else if (user.role === 'faculty') {
      profile = await Faculty.findOne({ user: user._id });
    }

    res.json({
      user,
      profile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, getMe };

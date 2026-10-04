const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Section = require('../models/Section');
const mongoose = require('mongoose');
const { createAuditLog } = require('../services/auditLogService');
const { getCurrentAcademicYear } = require('../services/academicYearService');
const { getJwtSecret } = require('../config/jwt');
const { sendPasswordResetEmail } = require('../services/emailService');

const generateToken = (id, role) => {
  return jwt.sign(
    {
      userId: id,
      id,
      role: (role || 'STUDENT').toUpperCase()
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

// @desc    Register a new student (Public registration ONLY creates STUDENT role)
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      dateOfBirth,
      studentMobileNumber,
      parentMobileNumber,
      phone,
      permanentAddress,
      permanentPinCode,
      temporaryAddress,
      temporaryPinCode,
      pinCode,
      enrollmentNo,
      department,
      section,
      branch,
      year,
      cgpa,
      tenthPercentage,
      twelfthPercentage,
      backlogs
    } = req.body;

    // 1. Full Name Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      return res.status(400).json({ message: 'Full name must be at least 2 characters long' });
    }

    // 2. Email Validation
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Registered college email is required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid college email address' });
    }

    // 3. Password Validation
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // 4. Date of Birth Validation
    if (!dateOfBirth) {
      return res.status(400).json({ message: 'Date of Birth is required' });
    }
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return res.status(400).json({ message: 'Please provide a valid Date of Birth' });
    }
    const today = new Date();
    if (dobDate > today) {
      return res.status(400).json({ message: 'Date of Birth cannot be in the future' });
    }
    if (dobDate.getFullYear() < 1950) {
      return res.status(400).json({ message: 'Please enter a valid Date of Birth' });
    }

    // 5. Student Mobile Number Validation
    const rawStudentMobile = studentMobileNumber || phone;
    if (!rawStudentMobile || !String(rawStudentMobile).trim()) {
      return res.status(400).json({ message: 'Student Mobile Number is required' });
    }
    const cleanStudentMobile = String(rawStudentMobile).trim();
    if (!/^\d{10}$/.test(cleanStudentMobile)) {
      return res.status(400).json({ message: 'Student Mobile Number must be exactly 10 numeric digits' });
    }

    // 6. Parent Mobile Number Validation
    if (!parentMobileNumber || !String(parentMobileNumber).trim()) {
      return res.status(400).json({ message: 'Parent Mobile Number is required' });
    }
    const cleanParentMobile = String(parentMobileNumber).trim();
    if (!/^\d{10}$/.test(cleanParentMobile)) {
      return res.status(400).json({ message: 'Parent Mobile Number must be exactly 10 numeric digits' });
    }

    // 7. Permanent Address Validation
    if (!permanentAddress || !permanentAddress.trim()) {
      return res.status(400).json({ message: 'Permanent Address is required' });
    }

    // 8. Permanent PIN Code Validation
    const rawPermPin = permanentPinCode || pinCode;
    if (!rawPermPin || !String(rawPermPin).trim()) {
      return res.status(400).json({ message: 'Permanent PIN Code is required' });
    }
    const cleanPermPin = String(rawPermPin).trim();
    if (!/^\d{6}$/.test(cleanPermPin)) {
      return res.status(400).json({ message: 'Permanent PIN Code must be exactly 6 numeric digits' });
    }

    // 9. Temporary Address Validation
    if (!temporaryAddress || !temporaryAddress.trim()) {
      return res.status(400).json({ message: 'Temporary Address is required' });
    }

    // 10. Temporary PIN Code Validation
    const rawTempPin = temporaryPinCode || rawPermPin;
    if (!rawTempPin || !String(rawTempPin).trim()) {
      return res.status(400).json({ message: 'Temporary PIN Code is required' });
    }
    const cleanTempPin = String(rawTempPin).trim();
    if (!/^\d{6}$/.test(cleanTempPin)) {
      return res.status(400).json({ message: 'Temporary PIN Code must be exactly 6 numeric digits' });
    }

    // 9. Enrollment Number Validation
    if (!enrollmentNo || !enrollmentNo.trim()) {
      return res.status(400).json({ message: 'Enrollment number is required' });
    }
    const cleanEnrollment = enrollmentNo.trim().toUpperCase();

    // 10. Department Validation
    if (!department) {
      return res.status(400).json({ message: 'Department selection is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(department)) {
      return res.status(400).json({ message: 'Invalid department ID selected' });
    }
    // Fetch dynamic system current academic year
    const currentYear = await getCurrentAcademicYear();

    const deptDoc = await Department.findById(department);
    if (!deptDoc) {
      return res.status(400).json({ message: 'The selected department does not exist' });
    }
    if (!deptDoc.isActive || deptDoc.status === 'inactive') {
      return res.status(400).json({ message: 'The selected department is inactive. Please select an active department.' });
    }
    if (deptDoc.academicYear && deptDoc.academicYear !== currentYear) {
      return res.status(400).json({ message: `The selected department belongs to academic year ${deptDoc.academicYear}, not current year ${currentYear}.` });
    }

    // 11. Section Validation
    if (!section) {
      return res.status(400).json({ message: 'Section selection is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(section)) {
      return res.status(400).json({ message: 'Invalid section ID selected' });
    }
    const secDoc = await Section.findById(section);
    if (!secDoc) {
      return res.status(400).json({ message: 'The selected section does not exist' });
    }
    if (!secDoc.isActive || secDoc.status === 'inactive') {
      return res.status(400).json({ message: 'The selected section is inactive. Please select an active section.' });
    }
    if (secDoc.academicYear && secDoc.academicYear !== currentYear) {
      return res.status(400).json({ message: `The selected section belongs to academic year ${secDoc.academicYear}, not current year ${currentYear}.` });
    }

    // 12. Current CGPA Validation
    if (cgpa === undefined || cgpa === null || (typeof cgpa === 'string' && cgpa.trim() === '')) {
      return res.status(400).json({ message: 'Current CGPA is required' });
    }
    const numCgpa = typeof cgpa === 'boolean' ? NaN : Number(cgpa);
    if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
      return res.status(400).json({ message: 'CGPA must be between 0 and 10.' });
    }

    // 13. 10th Percentage Validation
    if (tenthPercentage === undefined || tenthPercentage === null || (typeof tenthPercentage === 'string' && tenthPercentage.trim() === '')) {
      return res.status(400).json({ message: '10th Percentage is required' });
    }
    const numTenth = typeof tenthPercentage === 'boolean' ? NaN : Number(tenthPercentage);
    if (isNaN(numTenth) || numTenth < 1 || numTenth > 100) {
      return res.status(400).json({ message: '10th percentage must be between 1 and 100.' });
    }

    // 14. 12th Percentage Validation
    if (twelfthPercentage === undefined || twelfthPercentage === null || (typeof twelfthPercentage === 'string' && twelfthPercentage.trim() === '')) {
      return res.status(400).json({ message: '12th Percentage is required' });
    }
    const numTwelfth = typeof twelfthPercentage === 'boolean' ? NaN : Number(twelfthPercentage);
    if (isNaN(numTwelfth) || numTwelfth < 1 || numTwelfth > 100) {
      return res.status(400).json({ message: '12th percentage must be between 1 and 100.' });
    }

    // 15. Active Backlogs Validation
    if (backlogs === undefined || backlogs === null || (typeof backlogs === 'string' && backlogs.trim() === '')) {
      return res.status(400).json({ message: 'Active backlogs is required' });
    }
    const rawBacklogsStr = String(backlogs).trim();
    const numBacklogs = typeof backlogs === 'boolean' ? NaN : Number(rawBacklogsStr);
    if (isNaN(numBacklogs) || rawBacklogsStr.includes('.') || !Number.isInteger(numBacklogs) || numBacklogs < 0 || numBacklogs > 20) {
      return res.status(400).json({ message: 'Active backlogs must be an integer between 0 and 20.' });
    }

    // Check duplicate email
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(409).json({ message: 'A user is already registered with this email address' });
    }

    // Check duplicate enrollment number within current academic year
    const existingEnrollment = await Student.findOne({
      academicYear: currentYear,
      enrollmentNo: cleanEnrollment
    });
    if (existingEnrollment) {
      return res.status(409).json({ message: `Enrollment number is already in use for Academic Year ${currentYear}` });
    }

    // Security Rule: Public registration is strictly forced to STUDENT role.
    const user = await User.create({
      name: cleanName,
      email: normalizedEmail,
      password,
      role: 'STUDENT',
      status: 'ACTIVE',
      academicYear: currentYear
    });

    const studentProfile = await Student.create({
      user: user._id,
      enrollmentNo: cleanEnrollment,
      department: deptDoc._id,
      section: secDoc._id,
      branch: branch || deptDoc.name,
      year: year ? Number(year) : 4,
      cgpa: numCgpa,
      tenthPercentage: numTenth,
      twelfthPercentage: numTwelfth,
      backlogs: numBacklogs,
      dateOfBirth: dobDate,
      studentMobileNumber: cleanStudentMobile,
      parentMobileNumber: cleanParentMobile,
      phone: cleanStudentMobile,
      permanentAddress: permanentAddress.trim(),
      permanentPinCode: cleanPermPin,
      temporaryAddress: temporaryAddress.trim(),
      temporaryPinCode: cleanTempPin,
      pinCode: cleanPermPin,
      skills: [],
      academicYear: currentYear
    });

    const populatedProfile = await Student.findById(studentProfile._id)
      .populate('department', 'name code isActive status')
      .populate('section', 'name code isActive status');

    res.status(201).json({
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        academicYear: user.academicYear
      },
      profile: populatedProfile
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

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check account status
    const userStatus = (user.status || 'ACTIVE').toUpperCase();
    if (userStatus !== 'ACTIVE') {
      return res.status(403).json({
        message: `Account is ${userStatus.toLowerCase()}. Please contact the administrator.`
      });
    }

    const userRole = (user.role || 'STUDENT').toUpperCase();

    let profile = null;
    if (userRole === 'STUDENT') {
      profile = await Student.findOne({ user: user._id })
        .populate('department', 'name code isActive status')
        .populate('section', 'name code isActive status');
    } else if (userRole === 'FACULTY') {
      profile = await Faculty.findOne({ user: user._id }).populate('department', 'name code isActive status');
    }

    if (userRole === 'ADMIN' || userRole === 'FACULTY') {
      await createAuditLog({
        user,
        actionType: 'LOGIN',
        targetEntity: userRole === 'ADMIN' ? 'Admin' : 'Faculty',
        targetId: user._id,
        targetName: user.name,
        details: `${userRole} logged in successfully`,
        status: 'SUCCESS'
      });
    }

    res.json({
      token: generateToken(user._id, userRole),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        status: userStatus,
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
    const userRole = (user.role || 'STUDENT').toUpperCase();

    let profile = null;
    if (userRole === 'STUDENT') {
      profile = await Student.findOne({ user: user._id })
        .populate('department', 'name code isActive status')
        .populate('section', 'name code isActive status');
    } else if (userRole === 'FACULTY') {
      profile = await Faculty.findOne({ user: user._id }).populate('department', 'name code isActive status');
    }

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        status: (user.status || 'ACTIVE').toUpperCase(),
        avatar: user.avatar,
        academicYear: user.academicYear
      },
      profile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logoutUser = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Send password reset token / link to user's registered email
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Please provide your registered email address' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: 'No registered account found with this email address. Please check your spelling.'
      });
    }

    const userStatus = (user.status || 'ACTIVE').toUpperCase();
    if (userStatus === 'BLOCKED') {
      return res.status(403).json({
        message: 'This account has been suspended or blocked. Please contact the TPO administrator.'
      });
    }

    // Generate secure random reset token and expiration
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Client URL configuration: dynamically detect frontend origin from request if available
    let clientUrl = process.env.CLIENT_URL || '';
    const origin = req.get('origin') || req.get('referer');
    if (origin) {
      try {
        const parsed = new URL(origin);
        clientUrl = `${parsed.protocol}//${parsed.host}`;
      } catch (e) {}
    }
    if (!clientUrl) {
      clientUrl = 'http://localhost:3000';
    }
    const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password/${resetToken}`;

    // Send email using Nodemailer
    const emailResult = await sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetUrl
    });

    if (emailResult.skipped) {
      return res.status(503).json({
        message: 'Email delivery is currently disabled by system administrator.'
      });
    }

    if (!emailResult.success) {
      console.error(`[Forgot Password] SMTP dispatch failed for ${user.email}:`, emailResult.reason);
      return res.status(500).json({
        message: emailResult.reason || 'Failed to send password reset email. Please try again or contact support.'
      });
    }

    res.json({
      success: true,
      message: `Password reset link sent to registered email: ${user.email}`,
      email: user.email
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ message: error.message || 'Server error processing password reset request' });
  }
};

// @desc    Verify if a reset token is valid and unexpired
// @route   GET /api/auth/verify-reset-token/:token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, message: 'Reset token is required' });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        valid: false,
        message: 'Password reset link is invalid or has expired. Please request a new link.'
      });
    }

    res.json({
      valid: true,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('[Verify Reset Token Error]', error);
    res.status(500).json({ valid: false, message: error.message || 'Token verification failed' });
  }
};

// @desc    Reset password using valid reset token
// @route   POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        message: 'Password reset link is invalid or has expired. Please request a new link.'
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Audit log for faculty / admin
    const userRole = (user.role || 'STUDENT').toUpperCase();
    if (userRole === 'ADMIN' || userRole === 'FACULTY') {
      await createAuditLog({
        user,
        actionType: 'UPDATE',
        targetEntity: userRole === 'ADMIN' ? 'Admin' : 'Faculty',
        targetId: user._id,
        targetName: user.name,
        details: `${userRole} password successfully reset via token`,
        status: 'SUCCESS'
      });
    }

    res.json({
      success: true,
      message: 'Password updated successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ message: error.message || 'Server error updating password' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  forgotPassword,
  verifyResetToken,
  resetPassword
};


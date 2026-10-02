const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Section = require('../models/Section');
const Application = require('../models/Application');
const InterviewResult = require('../models/InterviewResult');
const MockResult = require('../models/MockResult');
const PreparationRoadmap = require('../models/PreparationRoadmap');
const InterviewExperience = require('../models/InterviewExperience');
const Resume = require('../models/Resume');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const Notification = require('../models/Notification');
const EmailNotificationLog = require('../models/EmailNotificationLog');
const ExportJob = require('../models/ExportJob');
const { addExportJob } = require('../queues/exportQueue');
const { isRedisEnabled } = require('../config/redis');
const { createAuditLog } = require('../services/auditLogService');
const { uploadBuffer, deleteAsset, rollbackUpload, CLOUDINARY_FOLDERS } = require('../services/cloudinaryService');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { getPaginationParams, formatPaginationResponse } = require('../utils/pagination');
const { getCurrentAcademicYear } = require('../services/academicYearService');

const { buildStudentFilterQuery } = require('../utils/studentFilter');
const { checkHistoricalOperation } = require('../middleware/historicalGuard');

// @desc Get all students (with multi-criteria dynamic filtering & server-side pagination)
// @route GET /api/users/students
const getStudents = async (req, res) => {
  try {
    const query = await buildStudentFilterQuery(req.query, req.user);
    const { page, limit, skip } = getPaginationParams(req.query);

    // Safe bounded server-side pagination (limit capped at 100 via getPaginationParams)
    const [total, students] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .select('-__v')
        .populate('user', 'name email status role avatar academicYear')
        .populate('department', 'name code isActive status')
        .populate('section', 'name code isActive status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const response = formatPaginationResponse(students, total, page, limit);
    res.json(response);
  } catch (error) {
    console.error('[Get Students Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Initiate background Excel export for filtered students
// @route GET/POST /api/users/students/export
// @access Private (Admin only)
const exportStudentsExcel = async (req, res) => {
  try {
    if (!isRedisEnabled()) {
      return res.status(503).json({
        message: 'Redis job queue is not enabled or unavailable. Cannot initiate background export.'
      });
    }

    const rawFilters = {
      ...(req.query || {}),
      ...(req.body && typeof req.body === 'object' ? req.body : {})
    };

    const sanitizedFilters = {};
    if (rawFilters.academicYear && rawFilters.academicYear !== 'ALL') sanitizedFilters.academicYear = String(rawFilters.academicYear).trim();
    if (rawFilters.department && rawFilters.department !== 'ALL') sanitizedFilters.department = String(rawFilters.department).trim();
    if (rawFilters.section && rawFilters.section !== 'ALL') sanitizedFilters.section = String(rawFilters.section).trim();
    if (rawFilters.minCgpa && rawFilters.minCgpa !== '0') sanitizedFilters.minCgpa = String(rawFilters.minCgpa).trim();
    if (rawFilters.maxCgpa && rawFilters.maxCgpa !== '10') sanitizedFilters.maxCgpa = String(rawFilters.maxCgpa).trim();
    if (rawFilters.backlogs && rawFilters.backlogs !== 'ALL') sanitizedFilters.backlogs = String(rawFilters.backlogs).trim();
    if (rawFilters.status && rawFilters.status !== 'ALL') sanitizedFilters.status = String(rawFilters.status).trim();
    if (rawFilters.search && rawFilters.search.trim()) sanitizedFilters.search = String(rawFilters.search).trim();
    if (rawFilters.enrollmentNoPrefix) sanitizedFilters.enrollmentNoPrefix = String(rawFilters.enrollmentNoPrefix).trim();

    // Build human-readable filter summary for metadata
    const filtersUsed = [];
    let deptName = '';
    let secName = '';

    if (sanitizedFilters.department) {
      const deptDoc = await Department.findById(sanitizedFilters.department).catch(() => null);
      deptName = deptDoc ? (deptDoc.code || deptDoc.name) : sanitizedFilters.department;
      filtersUsed.push(`Department: ${deptDoc ? deptDoc.name : sanitizedFilters.department}`);
    } else {
      filtersUsed.push('Department: All');
    }

    if (sanitizedFilters.section) {
      const secDoc = await Section.findById(sanitizedFilters.section).catch(() => null);
      secName = secDoc ? (secDoc.code || secDoc.name) : sanitizedFilters.section;
      filtersUsed.push(`Section: ${secDoc ? secDoc.name : sanitizedFilters.section}`);
    } else {
      filtersUsed.push('Section: All');
    }

    if (sanitizedFilters.minCgpa) {
      filtersUsed.push(`Min CGPA: ${sanitizedFilters.minCgpa}+`);
    }

    if (sanitizedFilters.search) {
      filtersUsed.push(`Search: "${sanitizedFilters.search}"`);
    }

    if (sanitizedFilters.backlogs) {
      filtersUsed.push(`Backlogs: ${sanitizedFilters.backlogs === '0' ? 'Zero (0)' : 'Active Backlogs'}`);
    }

    const filterSummary = filtersUsed.join(' | ');
    const academicYearStr = sanitizedFilters.academicYear || 'All Academic Years';

    let filenameParts = ['CampusPro'];
    if (deptName && secName) {
      filenameParts.push(deptName, secName, 'Students');
    } else if (deptName) {
      filenameParts.push(deptName, 'Students');
    } else if (sanitizedFilters.search || sanitizedFilters.minCgpa || sanitizedFilters.backlogs) {
      filenameParts.push('Filtered_Students');
    } else {
      filenameParts.push('All_Students');
    }
    const cleanYear = (academicYearStr || (await getCurrentAcademicYear())).replace(/[^a-zA-Z0-9-]/g, '_');
    filenameParts.push(cleanYear);
    const filenamePrefix = filenameParts.join('_').replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    // Create ExportJob record in MongoDB with sanitizedFilters as source of truth
    const exportJobDoc = await ExportJob.create({
      user: req.user._id,
      type: 'STUDENTS_EXCEL',
      filters: sanitizedFilters,
      status: 'QUEUED'
    });

    // Enqueue job into BullMQ exportQueue passing raw sanitized filters (NO directQuery!)
    await addExportJob({
      exportJobId: exportJobDoc._id.toString(),
      type: 'STUDENTS_EXCEL',
      filters: sanitizedFilters,
      user: {
        _id: req.user._id,
        role: req.user.role,
        department: req.user.department
      },
      academicYear: academicYearStr,
      filterMeta: {
        summary: filterSummary,
        academicYear: academicYearStr,
        filenamePrefix
      }
    });

    // Audit log
    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'EXPORT_QUEUED',
        targetEntity: 'Student',
        targetId: exportJobDoc._id,
        targetName: 'Student Directory Excel Export',
        details: `Enqueued background Excel export (Job ID: ${exportJobDoc._id})`
      });
    }

    return res.status(202).json({
      success: true,
      jobId: exportJobDoc._id,
      status: 'QUEUED',
      message: 'Export job queued successfully. Processing in background.'
    });
  } catch (error) {
    console.error('[Initiate Export Students Error]', error);
    res.status(500).json({ message: error.message || 'Failed to queue export job.' });
  }
};

// @desc Get export job status
// @route GET /api/users/students/export/status/:jobId
// @access Private (Admin only)
const getExportJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid export job ID.' });
    }

    const job = await ExportJob.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ message: 'Export job not found.' });
    }

    if (job.user && !job.user.equals(req.user._id) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FILE_ACCESS_DENIED',
        message: 'Access denied. You can only view status of export jobs initiated by your account.'
      });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error('[Get Export Job Status Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Download generated Excel file
// @route GET /api/users/students/export/download/:jobId
// @access Private (Admin only)
const downloadExportFile = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid export job ID.' });
    }

    const job = await ExportJob.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Export job not found.' });
    }

    if (job.user && !job.user.equals(req.user._id) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FILE_ACCESS_DENIED',
        message: 'Access denied. You can only download export files initiated by your account.'
      });
    }

    if (job.status !== 'COMPLETED') {
      return res.status(400).json({
        message: `File is not ready yet. Current status: ${job.status}`,
        status: job.status
      });
    }

    const filePath = job.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Exported file not found on disk or expired.' });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(filePath, job.fileName || 'CampusPro_Students.xlsx');
  } catch (error) {
    console.error('[Download Export File Error]', error);
    res.status(500).json({ message: error.message });
  }
};


// @desc Get single student full details (Admin only)
// @route GET /api/users/students/:id
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const student = await Student.findById(id)
      .populate('user', 'name email phone status role avatar academicYear createdAt')
      .populate('department', 'name code isActive status')
      .populate('section', 'name code isActive status');

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Look up social and coding profiles from Resume if student has created one
    let resumeProfiles = {
      linkedin: 'N/A',
      github: 'N/A',
      leetcode: 'N/A',
      geeksforgeeks: 'N/A',
      portfolio: 'N/A'
    };

    if (student.user?._id) {
      const resumeDoc = await Resume.findOne({ user: student.user._id });
      if (resumeDoc) {
        if (resumeDoc.professionalLinks?.linkedin) resumeProfiles.linkedin = resumeDoc.professionalLinks.linkedin;
        if (resumeDoc.professionalLinks?.github) resumeProfiles.github = resumeDoc.professionalLinks.github;
        if (resumeDoc.codingProfiles?.leetcode) resumeProfiles.leetcode = resumeDoc.codingProfiles.leetcode;
        if (resumeDoc.codingProfiles?.geeksforgeeks) resumeProfiles.geeksforgeeks = resumeDoc.codingProfiles.geeksforgeeks;
        if (resumeDoc.professionalLinks?.portfolio) resumeProfiles.portfolio = resumeDoc.professionalLinks.portfolio;
      }
    }

    // Fetch related record metrics
    const [appCount, mockResultCount, roadmapCount, expCount] = await Promise.all([
      Application.countDocuments({ student: student._id }),
      MockResult.countDocuments({ student: student._id }),
      PreparationRoadmap.countDocuments({ student: student._id }),
      InterviewExperience.countDocuments({ student: student._id })
    ]);

    res.json({
      student,
      profiles: resumeProfiles,
      stats: {
        applications: appCount,
        mockTestsTaken: mockResultCount,
        roadmaps: roadmapCount,
        experiences: expCount
      }
    });
  } catch (error) {
    console.error('[Get Student Details Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Admin update student profile & account
// @route PUT /api/users/students/:id
const updateStudentAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const student = await Student.findById(id).populate('user');
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const user = await User.findById(student.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Linked user account not found' });
    }

    // Disallow role escalation
    if (user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only student accounts can be managed here' });
    }

    const targetYear = student.academicYear || user.academicYear;
    const histCheck = await checkHistoricalOperation(req, targetYear, 'Student');
    if (!histCheck.allowed) {
      return res.status(histCheck.status || 403).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: true
      });
    }

    if (req.body.academicYear && req.body.academicYear !== targetYear) {
      const newYearCheck = await checkHistoricalOperation(req, req.body.academicYear, 'Student');
      if (!newYearCheck.allowed) {
        return res.status(newYearCheck.status || 403).json({
          code: newYearCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
          message: newYearCheck.message,
          isHistoricalReadOnly: true
        });
      }
    }

    const {
      name,
      email,
      phone,
      studentMobileNumber,
      enrollmentNo,
      department,
      section,
      cgpa,
      tenthPercentage,
      twelfthPercentage,
      backlogs,
      skills,
      academicYear,
      status,
      bio,
      dateOfBirth,
      parentMobileNumber,
      permanentAddress,
      permanentPinCode,
      temporaryAddress,
      temporaryPinCode,
      pinCode
    } = req.body;

    // Validate email if changed
    if (email && email.trim().toLowerCase() !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
      }
      const existingUser = await User.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email address is already in use by another user' });
      }
      user.email = email.trim().toLowerCase();
    }

    // Validate enrollment number if changed
    if (enrollmentNo && enrollmentNo.trim().toUpperCase() !== student.enrollmentNo) {
      const cleanEnrollment = enrollmentNo.trim().toUpperCase();
      const existingStudent = await Student.findOne({
        academicYear: targetYear,
        enrollmentNo: cleanEnrollment,
        _id: { $ne: student._id }
      });
      if (existingStudent) {
        return res.status(400).json({ message: `Enrollment number is already in use for Academic Year ${targetYear}` });
      }
      student.enrollmentNo = cleanEnrollment;
    }

    if (name && name.trim()) user.name = name.trim();
    if (status && ['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(status.toUpperCase())) {
      user.status = status.toUpperCase();
    }
    if (academicYear) {
      user.academicYear = academicYear.trim();
      student.academicYear = academicYear.trim();
    }

    if (department) {
      if (!mongoose.Types.ObjectId.isValid(department)) {
        return res.status(400).json({ message: 'Invalid department ID' });
      }
      const deptDoc = await Department.findById(department);
      if (!deptDoc) {
        return res.status(400).json({ message: 'Selected department does not exist' });
      }
      student.department = deptDoc._id;
      student.branch = deptDoc.name;
    }

    if (section !== undefined) {
      if (section && section !== 'ALL') {
        if (!mongoose.Types.ObjectId.isValid(section)) {
          return res.status(400).json({ message: 'Invalid section ID' });
        }
        const secDoc = await Section.findById(section);
        if (!secDoc) {
          return res.status(400).json({ message: 'Selected section does not exist' });
        }
        student.section = secDoc._id;
      } else {
        student.section = null;
      }
    }

    const targetStudentMobile = studentMobileNumber !== undefined ? studentMobileNumber : phone;
    if (targetStudentMobile !== undefined) {
      const cleanMobile = String(targetStudentMobile).trim();
      if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
        return res.status(400).json({ message: 'Student Mobile Number must be exactly 10 numeric digits' });
      }
      student.studentMobileNumber = cleanMobile;
      student.phone = cleanMobile;
    }
    if (bio !== undefined) student.bio = bio.trim();

    if (cgpa !== undefined && cgpa !== '') {
      const numCgpa = parseFloat(cgpa);
      if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
        return res.status(400).json({ message: 'CGPA must be between 0 and 10.' });
      }
      student.cgpa = numCgpa;
    }

    if (tenthPercentage !== undefined && tenthPercentage !== '') {
      const numTenth = parseFloat(tenthPercentage);
      if (isNaN(numTenth) || numTenth < 1 || numTenth > 100) {
        return res.status(400).json({ message: '10th percentage must be between 1 and 100.' });
      }
      student.tenthPercentage = numTenth;
    }

    if (twelfthPercentage !== undefined && twelfthPercentage !== '') {
      const numTwelfth = parseFloat(twelfthPercentage);
      if (isNaN(numTwelfth) || numTwelfth < 1 || numTwelfth > 100) {
        return res.status(400).json({ message: '12th percentage must be between 1 and 100.' });
      }
      student.twelfthPercentage = numTwelfth;
    }

    if (backlogs !== undefined && backlogs !== '') {
      const rawBacklogsStr = String(backlogs).trim();
      const numBacklogs = Number(rawBacklogsStr);
      if (isNaN(numBacklogs) || rawBacklogsStr.includes('.') || !Number.isInteger(numBacklogs) || numBacklogs < 0 || numBacklogs > 20) {
        return res.status(400).json({ message: 'Active backlogs must be an integer between 0 and 20.' });
      }
      student.backlogs = numBacklogs;
    }

    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        student.skills = skills.map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof skills === 'string') {
        student.skills = skills.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    if (dateOfBirth !== undefined && dateOfBirth !== '') {
      const dobDate = new Date(dateOfBirth);
      if (isNaN(dobDate.getTime())) {
        return res.status(400).json({ message: 'Please provide a valid Date of Birth' });
      }
      if (dobDate > new Date()) {
        return res.status(400).json({ message: 'Date of Birth cannot be in the future' });
      }
      student.dateOfBirth = dobDate;
    }

    if (parentMobileNumber !== undefined) {
      const cleanMobile = String(parentMobileNumber).trim();
      if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
        return res.status(400).json({ message: 'Parent Mobile Number must be exactly 10 numeric digits' });
      }
      student.parentMobileNumber = cleanMobile;
    }

    if (permanentAddress !== undefined) {
      student.permanentAddress = String(permanentAddress).trim();
    }

    if (temporaryAddress !== undefined) {
      student.temporaryAddress = String(temporaryAddress).trim();
    }

    const targetPermPin = permanentPinCode !== undefined ? permanentPinCode : pinCode;
    if (targetPermPin !== undefined) {
      const cleanPin = String(targetPermPin).trim();
      if (cleanPin && !/^\d{6}$/.test(cleanPin)) {
        return res.status(400).json({ message: 'Permanent PIN Code must be exactly 6 numeric digits' });
      }
      student.permanentPinCode = cleanPin;
      student.pinCode = cleanPin;
    }

    if (temporaryPinCode !== undefined) {
      const cleanTempPin = String(temporaryPinCode).trim();
      if (cleanTempPin && !/^\d{6}$/.test(cleanTempPin)) {
        return res.status(400).json({ message: 'Temporary PIN Code must be exactly 6 numeric digits' });
      }
      student.temporaryPinCode = cleanTempPin;
    }

    await user.save();
    await student.save();

    const updated = await Student.findById(student._id)
      .populate('user', 'name email status role avatar academicYear')
      .populate('department', 'name code isActive status')
      .populate('section', 'name code isActive status');

    await createAuditLog({
      user: req.user,
      actionType: 'UPDATE',
      targetEntity: 'Student',
      targetId: student._id,
      targetName: user.name,
      details: `Admin updated student profile for ${user.name} (${student.enrollmentNo})`,
      status: 'SUCCESS'
    });

    res.json({ message: 'Student updated successfully', student: updated });
  } catch (error) {
    console.error('[Update Student Admin Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Deactivate or Activate a student (Admin only)
// @route PATCH /api/users/students/:id/status
const toggleStudentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const student = await Student.findById(id).populate('user');
    if (!student || !student.user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const user = await User.findById(student.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only student accounts can be managed here' });
    }

    const targetYear = student.academicYear || user.academicYear;
    const histCheck = await checkHistoricalOperation(req, targetYear, 'Student');
    if (!histCheck.allowed) {
      return res.status(histCheck.status || 403).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: true
      });
    }

    const targetStatus = status ? status.toUpperCase() : user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!['ACTIVE', 'INACTIVE'].includes(targetStatus)) {
      return res.status(400).json({ message: 'Status must be ACTIVE or INACTIVE' });
    }

    user.status = targetStatus;
    await user.save();

    await createAuditLog({
      user: req.user,
      actionType: 'UPDATE',
      targetEntity: 'Student',
      targetId: student._id,
      targetName: user.name,
      details: `Admin changed student ${user.name} (${student.enrollmentNo}) status to ${targetStatus}`,
      status: 'SUCCESS'
    });

    res.json({
      message: targetStatus === 'INACTIVE' ? 'Student deactivated successfully.' : 'Student activated successfully.',
      status: targetStatus,
      studentId: student._id
    });
  } catch (error) {
    console.error('[Toggle Student Status Error]', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Safely cascades permanent deletion of student and student-owned records
 * Master data (Department, Section, Company, Drive, Questions, MockTests, AuditLogs) is preserved.
 */
const performStudentCascadeDelete = async (studentId, adminUser) => {
  const student = await Student.findById(studentId).populate('user');
  if (!student) {
    throw new Error('Student not found');
  }

  const linkedUser = student.user ? await User.findById(student.user._id) : null;

  // Prevent self deletion
  if (linkedUser && String(adminUser._id) === String(linkedUser._id)) {
    throw new Error('You cannot delete your own admin account.');
  }

  // Prevent deleting non-student accounts
  if (linkedUser && linkedUser.role !== 'STUDENT') {
    throw new Error('Only student accounts can be deleted through Student Management.');
  }

  const studentOid = student._id;
  const userOid = linkedUser ? linkedUser._id : null;

  // Collect student file references for non-blocking storage cleanup
  const filesToClean = [];
  if (student.resumePublicId) {
    filesToClean.push(student.resumePublicId);
  }
  if (userOid) {
    try {
      const analyses = await ResumeAnalysis.find({ user: userOid }).select('resumePublicId jdPublicId').lean();
      for (const a of analyses) {
        if (a.resumePublicId) filesToClean.push(a.resumePublicId);
        if (a.jdPublicId) filesToClean.push(a.jdPublicId);
      }
    } catch (collectErr) {
      console.warn('[Student Delete] Could not collect analysis files:', collectErr.message);
    }
  }

  const executeDeleteRecords = async (sessionOpts) => {
    // 1. Applications
    await Application.deleteMany({ student: studentOid }, sessionOpts);

    // 2. Interview Results
    await InterviewResult.deleteMany({ student: studentOid }, sessionOpts);

    // 3. Mock Test Results
    await MockResult.deleteMany({ student: studentOid }, sessionOpts);

    // 4. Preparation Roadmaps
    await PreparationRoadmap.deleteMany({ student: studentOid }, sessionOpts);

    // 5. Interview Experiences authored by this student
    await InterviewExperience.deleteMany({ student: studentOid }, sessionOpts);

    // 6. User-specific records if linkedUser exists
    if (userOid) {
      await Resume.deleteMany({ user: userOid }, sessionOpts);
      await ResumeAnalysis.deleteMany({ user: userOid }, sessionOpts);
      await Notification.deleteMany({ user: userOid }, sessionOpts);
      await EmailNotificationLog.deleteMany({ $or: [{ student: studentOid }, { user: userOid }] }, sessionOpts);
      await User.findByIdAndDelete(userOid, sessionOpts);
    }

    // 7. Student Document
    await Student.findByIdAndDelete(studentOid, sessionOpts);
  };

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    await executeDeleteRecords({ session });
    await session.commitTransaction();
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch (abortErr) {}
      try { session.endSession(); } catch (endErr) {}
      session = null;
    }

    // If standalone MongoDB does not support transactions, execute sequentially without session
    if (err.message && (
      err.message.includes('Transaction numbers are only allowed') ||
      err.message.includes('replica set')
    )) {
      await executeDeleteRecords({});
    } else {
      throw err;
    }
  } finally {
    if (session) {
      session.endSession();
    }
  }

  // Asynchronous non-blocking file asset cleanup (does not delay or block HTTP response)
  if (filesToClean.length > 0) {
    const { deleteAsset } = require('../services/cloudinaryService');
    setImmediate(async () => {
      for (const pid of filesToClean) {
        try {
          await deleteAsset(pid);
        } catch (cleanErr) {
          console.warn(`[Student File Cleanup Warning] Could not remove file ${pid}:`, cleanErr.message);
        }
      }
    });
  }

  // Institutional Audit Log (Preserved, records deletion action)
  await createAuditLog({
    user: adminUser,
    actionType: 'DELETE',
    targetEntity: 'Student',
    targetId: studentOid,
    targetName: linkedUser ? linkedUser.name : student.enrollmentNo,
    details: `Admin permanently deleted student ${linkedUser?.name || 'N/A'} (Enrollment: ${student.enrollmentNo}, Email: ${linkedUser?.email || 'N/A'}) and student-owned records.`,
    status: 'SUCCESS'
  });

  return {
    studentId: studentOid,
    name: linkedUser?.name || student.enrollmentNo,
    enrollmentNo: student.enrollmentNo
  };
};

// @desc Permanently delete single student and cascade student-owned records (Admin only)
// @route DELETE /api/users/students/:id
const deleteStudentPermanently = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const student = await Student.findById(id).populate('user');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const targetYear = student.academicYear || student.user?.academicYear;
    const histCheck = await checkHistoricalOperation(req, targetYear, 'Student');
    if (!histCheck.allowed) {
      return res.status(histCheck.status || 403).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: true
      });
    }

    const result = await performStudentCascadeDelete(id, req.user);
    res.json({
      message: 'Student deleted permanently.',
      deletedStudent: result
    });
  } catch (error) {
    console.error('[Delete Student Permanently Error]', error);
    const msg = error.message || 'Unable to delete student. No data was removed.';
    if (msg.includes('not found')) {
      return res.status(404).json({ message: msg });
    }
    if (msg.includes('cannot delete') || msg.includes('Only student')) {
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: msg });
  }
};

// @desc Bulk permanently delete multiple students (Admin only)
// @route DELETE /api/users/students/bulk
const bulkDeleteStudents = async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of student IDs to delete' });
    }

    // Limit batch size to 50
    if (studentIds.length > 50) {
      return res.status(400).json({ message: 'Please delete in batches of 50 or fewer.' });
    }

    // Check if any student belongs to a historical academic year
    const validIds = studentIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length > 0) {
      const studentsToCheck = await Student.find({ _id: { $in: validIds } }).populate('user');
      for (const s of studentsToCheck) {
        const sYear = s.academicYear || s.user?.academicYear;
        const histCheck = await checkHistoricalOperation(req, sYear, 'Student');
        if (!histCheck.allowed) {
          return res.status(histCheck.status || 403).json({
            code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
            message: histCheck.message,
            isHistoricalReadOnly: true
          });
        }
      }
    }

    const deleted = [];
    const failures = [];

    for (const id of studentIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        failures.push({ id, error: 'Invalid ObjectId' });
        continue;
      }
      try {
        const delRes = await performStudentCascadeDelete(id, req.user);
        deleted.push(delRes);
      } catch (err) {
        failures.push({ id, error: err.message });
      }
    }

    let summaryMessage = '';
    if (failures.length === 0) {
      summaryMessage = `${deleted.length} ${deleted.length === 1 ? 'student' : 'students'} deleted successfully.`;
    } else if (deleted.length === 0) {
      summaryMessage = `Unable to delete selected students. All ${failures.length} operations failed.`;
    } else {
      summaryMessage = `${deleted.length} students deleted. ${failures.length} student${failures.length === 1 ? '' : 's'} could not be deleted.`;
    }

    res.json({
      message: summaryMessage,
      deletedCount: deleted.length,
      failedCount: failures.length,
      deleted,
      failures
    });
  } catch (error) {
    console.error('[Bulk Delete Students Error]', error);
    res.status(500).json({ message: error.message || 'Bulk deletion failed' });
  }
};

// @desc Get all faculty
// @route GET /api/users/faculty
const getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find()
      .populate('user', 'name email status role avatar')
      .populate('department', 'name code isActive status')
      .lean();
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create a faculty account (Admin only)
// @route POST /api/users/faculty
const createFaculty = async (req, res) => {
  try {
    const { name, email, password, department, employeeId, designation, phone } = req.body;

    if (!name || !name.trim() || !email || !email.trim() || !password || !department) {
      return res.status(400).json({
        message: 'Name, email, password, and department are required to create a faculty account.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    // Strict Department Validation
    let deptDoc = null;
    if (mongoose.Types.ObjectId.isValid(department)) {
      deptDoc = await Department.findById(department);
    } else {
      deptDoc = await Department.findOne({
        $or: [
          { code: new RegExp(`^${department.trim()}$`, 'i') },
          { name: new RegExp(`^${department.trim()}$`, 'i') }
        ]
      });
    }

    if (!deptDoc) {
      return res.status(400).json({ message: 'The selected department does not exist' });
    }

    if (!deptDoc.isActive || deptDoc.status === 'inactive') {
      return res.status(400).json({ message: 'The selected department is inactive. Please select an active department.' });
    }

    // Check duplicate employee ID
    const deptPrefix = (deptDoc.code || deptDoc.name || 'FAC').toUpperCase().slice(0, 4);
    const cleanEmpId = (employeeId && employeeId.trim())
      ? employeeId.trim().toUpperCase()
      : `EMP-${deptPrefix}-${Date.now().toString().slice(-4)}`;

    const existingFaculty = await Faculty.findOne({ employeeId: cleanEmpId });
    if (existingFaculty) {
      return res.status(409).json({ message: 'Employee ID is already assigned to another faculty member' });
    }

    // Create Faculty User (strictly FACULTY role)
    const facultyUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: 'FACULTY',
      status: 'ACTIVE'
    });

    const facultyProfile = await Faculty.create({
      user: facultyUser._id,
      employeeId: cleanEmpId,
      department: deptDoc._id,
      designation: designation || 'Department Placement Coordinator',
      phone: phone || ''
    });

    const populatedFaculty = await Faculty.findById(facultyProfile._id)
      .populate('user', 'name email status role')
      .populate('department', 'name code isActive status');

    // Audit log
    await createAuditLog({
      user: req.user,
      actionType: 'CREATE',
      targetEntity: 'Faculty',
      targetId: facultyUser._id,
      targetName: facultyUser.name,
      details: `Admin created faculty coordinator account for ${facultyUser.email} (${cleanEmpId}) in ${deptDoc.name}`,
      status: 'SUCCESS'
    });

    res.status(201).json({
      message: 'Faculty account created successfully',
      user: {
        _id: facultyUser._id,
        name: facultyUser.name,
        email: facultyUser.email,
        role: facultyUser.role,
        status: facultyUser.status
      },
      profile: populatedFaculty
    });
  } catch (error) {
    console.error('[Create Faculty Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete a user (Admin only)
// @route DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const histCheck = await checkHistoricalOperation(req, targetUser.academicYear, 'User');
    if (!histCheck.allowed) {
      return res.status(histCheck.status || 403).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: true
      });
    }

    if (targetUser.role === 'STUDENT') {
      await Student.deleteOne({ user: targetUser._id });
    } else if (targetUser.role === 'FACULTY') {
      await Faculty.deleteOne({ user: targetUser._id });
    }

    await User.findByIdAndDelete(id);

    await createAuditLog({
      user: req.user,
      actionType: 'DELETE',
      targetEntity: 'User',
      targetId: targetUser._id,
      targetName: targetUser.name,
      details: `Admin deleted user ${targetUser.email} (Role: ${targetUser.role})`,
      status: 'SUCCESS'
    });

    res.json({ message: `User ${targetUser.name} (${targetUser.role}) deleted successfully` });
  } catch (error) {
    console.error('[Delete User Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Get student profile (for logged in student)
// @route GET /api/users/student-profile
const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id })
      .populate('user', 'name email avatar role status academicYear createdAt')
      .populate('department', 'name code isActive status')
      .populate('section', 'name code isActive status');

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    if (!student.profileLinks) {
      student.profileLinks = { github: '', linkedin: '', leetcode: '', geeksforgeeks: '', custom: [] };
    }

    // Legacy migration check: if profileLinks are empty, check existing Resume
    const pl = student.profileLinks;
    const hasAnyLink = pl.github || pl.linkedin || pl.leetcode || pl.geeksforgeeks || (Array.isArray(pl.custom) && pl.custom.length > 0);

    if (!hasAnyLink) {
      const resume = await Resume.findOne({ user: req.user._id });
      if (resume) {
        let changed = false;
        if (resume.professionalLinks?.github && !resume.professionalLinks.github.includes('/username')) {
          pl.github = resume.professionalLinks.github.trim();
          changed = true;
        }
        if (resume.professionalLinks?.linkedin && !resume.professionalLinks.linkedin.includes('/username')) {
          pl.linkedin = resume.professionalLinks.linkedin.trim();
          changed = true;
        }
        if (resume.codingProfiles?.leetcode && !resume.codingProfiles.leetcode.includes('/username')) {
          pl.leetcode = resume.codingProfiles.leetcode.trim();
          changed = true;
        }
        if (resume.codingProfiles?.geeksforgeeks && !resume.codingProfiles.geeksforgeeks.includes('/username')) {
          pl.geeksforgeeks = resume.codingProfiles.geeksforgeeks.trim();
          changed = true;
        }
        if (Array.isArray(resume.links)) {
          resume.links.forEach(l => {
            if (!l.url || l.url.includes('/username')) return;
            const nl = (l.name || '').toLowerCase();
            if (nl.includes('github') && !pl.github) { pl.github = l.url.trim(); changed = true; }
            else if (nl.includes('linkedin') && !pl.linkedin) { pl.linkedin = l.url.trim(); changed = true; }
            else if (nl.includes('leetcode') && !pl.leetcode) { pl.leetcode = l.url.trim(); changed = true; }
            else if ((nl.includes('geeksforgeeks') || nl.includes('gfg')) && !pl.geeksforgeeks) { pl.geeksforgeeks = l.url.trim(); changed = true; }
            else if (!['github', 'linkedin', 'leetcode', 'geeksforgeeks', 'gfg'].some(k => nl.includes(k))) {
              if (!Array.isArray(pl.custom)) pl.custom = [];
              if (!pl.custom.some(c => c.url === l.url)) {
                pl.custom.push({ label: l.name || 'Custom Link', url: l.url.trim() });
                changed = true;
              }
            }
          });
        }
        if (changed) {
          student.profileLinks = pl;
          await student.save();
        }
      }
    }

    res.json({
      student,
      profileLinks: student.profileLinks
    });
  } catch (error) {
    console.error('[Get Student Profile Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Update student profile (for logged in student)
// @route PUT /api/users/student-profile
const updateStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const {
      name,
      cgpa,
      tenthPercentage,
      twelfthPercentage,
      backlogs,
      skills,
      phone,
      studentMobileNumber,
      resumeUrl,
      bio,
      dateOfBirth,
      parentMobileNumber,
      permanentAddress,
      permanentPinCode,
      temporaryAddress,
      temporaryPinCode,
      pinCode,
      profileLinks
    } = req.body;

    // Security Boundary: Sensitive academic & role fields (department, section, enrollmentNo, role, status, academicYear)
    // are strictly read-only for students and cannot be modified via self-profile update.

    // 1. Full Name sync (User model)
    let updatedUserDoc = null;
    if (name !== undefined && typeof name === 'string' && name.trim()) {
      const cleanName = name.trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long' });
      }
      const user = await User.findById(req.user._id);
      if (user) {
        user.name = cleanName;
        await user.save();
        updatedUserDoc = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          avatar: user.avatar,
          academicYear: user.academicYear
        };
      }
    }

    // 2. Academic: CGPA (0 - 10)
    if (cgpa !== undefined && cgpa !== null && cgpa !== '') {
      const numCgpa = parseFloat(cgpa);
      if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
        return res.status(400).json({ success: false, message: 'CGPA must be between 0 and 10.' });
      }
      student.cgpa = numCgpa;
    }

    // 3. Academic: 10th Percentage (1 - 100)
    if (tenthPercentage !== undefined) {
      if (tenthPercentage === '' || tenthPercentage === null) {
        student.tenthPercentage = null;
      } else {
        const numTenth = parseFloat(tenthPercentage);
        if (isNaN(numTenth) || numTenth < 1 || numTenth > 100) {
          return res.status(400).json({ success: false, message: '10th percentage must be between 1 and 100.' });
        }
        student.tenthPercentage = numTenth;
      }
    }

    // 4. Academic: 12th Percentage (1 - 100)
    if (twelfthPercentage !== undefined) {
      if (twelfthPercentage === '' || twelfthPercentage === null) {
        student.twelfthPercentage = null;
      } else {
        const numTwelfth = parseFloat(twelfthPercentage);
        if (isNaN(numTwelfth) || numTwelfth < 1 || numTwelfth > 100) {
          return res.status(400).json({ success: false, message: '12th percentage must be between 1 and 100.' });
        }
        student.twelfthPercentage = numTwelfth;
      }
    }

    // 5. Academic: Active Backlogs (0 - 20, integer)
    if (backlogs !== undefined && backlogs !== null && backlogs !== '') {
      const rawBacklogsStr = String(backlogs).trim();
      const numBacklogs = Number(rawBacklogsStr);
      if (isNaN(numBacklogs) || rawBacklogsStr.includes('.') || !Number.isInteger(numBacklogs) || numBacklogs < 0 || numBacklogs > 20) {
        return res.status(400).json({ success: false, message: 'Active backlogs must be an integer between 0 and 20.' });
      }
      student.backlogs = numBacklogs;
    }

    // 6. Date of Birth
    if (dateOfBirth !== undefined) {
      if (dateOfBirth === '' || dateOfBirth === null) {
        student.dateOfBirth = null;
      } else {
        const dobDate = new Date(dateOfBirth);
        if (isNaN(dobDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Please provide a valid Date of Birth' });
        }
        if (dobDate > new Date()) {
          return res.status(400).json({ success: false, message: 'Date of Birth cannot be in the future' });
        }
        student.dateOfBirth = dobDate;
      }
    }

    // 7. Student Mobile Number / Phone
    const targetStudentMobile = studentMobileNumber !== undefined ? studentMobileNumber : phone;
    if (targetStudentMobile !== undefined) {
      if (targetStudentMobile === null || targetStudentMobile === '') {
        student.studentMobileNumber = '';
        student.phone = '';
      } else {
        const cleanMobile = String(targetStudentMobile).trim();
        if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
          return res.status(400).json({ success: false, message: 'Student Mobile Number must be exactly 10 numeric digits' });
        }
        student.studentMobileNumber = cleanMobile;
        student.phone = cleanMobile;
      }
    }

    // 8. Parent Mobile Number
    if (parentMobileNumber !== undefined) {
      if (parentMobileNumber === null || parentMobileNumber === '') {
        student.parentMobileNumber = '';
      } else {
        const cleanMobile = String(parentMobileNumber).trim();
        if (cleanMobile && !/^\d{10}$/.test(cleanMobile)) {
          return res.status(400).json({ success: false, message: 'Parent Mobile Number must be exactly 10 numeric digits' });
        }
        student.parentMobileNumber = cleanMobile;
      }
    }

    // 9. Addresses
    if (permanentAddress !== undefined) {
      student.permanentAddress = permanentAddress ? String(permanentAddress).trim() : '';
    }
    if (temporaryAddress !== undefined) {
      student.temporaryAddress = temporaryAddress ? String(temporaryAddress).trim() : '';
    }

    // 10. Permanent PIN Code
    const targetPermPin = permanentPinCode !== undefined ? permanentPinCode : pinCode;
    if (targetPermPin !== undefined) {
      if (targetPermPin === null || targetPermPin === '') {
        student.permanentPinCode = '';
        student.pinCode = '';
      } else {
        const cleanPin = String(targetPermPin).trim();
        if (cleanPin && !/^\d{6}$/.test(cleanPin)) {
          return res.status(400).json({ success: false, message: 'Permanent PIN Code must be exactly 6 numeric digits' });
        }
        student.permanentPinCode = cleanPin;
        student.pinCode = cleanPin;
      }
    }

    // 11. Temporary PIN Code
    if (temporaryPinCode !== undefined) {
      if (temporaryPinCode === null || temporaryPinCode === '') {
        student.temporaryPinCode = '';
      } else {
        const cleanTempPin = String(temporaryPinCode).trim();
        if (cleanTempPin && !/^\d{6}$/.test(cleanTempPin)) {
          return res.status(400).json({ success: false, message: 'Temporary PIN Code must be exactly 6 numeric digits' });
        }
        student.temporaryPinCode = cleanTempPin;
      }
    }

    // 12. Skills & Bio & Resume
    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        student.skills = skills.map((s) => String(s).trim()).filter(Boolean);
      } else if (typeof skills === 'string') {
        student.skills = skills.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        student.skills = [];
      }
    }
    if (resumeUrl !== undefined) student.resumeUrl = resumeUrl ? String(resumeUrl).trim() : '';
    if (bio !== undefined) student.bio = bio ? String(bio).trim() : '';

    // 13. Validate and update professional links
    const isValidUrl = (str) => {
      if (!str || typeof str !== 'string') return true;
      const trimmed = str.trim();
      if (!trimmed) return true;
      try {
        const parsed = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
        return Boolean(parsed.hostname);
      } catch (e) {
        return false;
      }
    };
    const formatUrl = (str) => {
      if (!str || typeof str !== 'string') return '';
      const trimmed = str.trim();
      if (!trimmed) return '';
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    };

    if (profileLinks !== undefined) {
      if (typeof profileLinks !== 'object' || profileLinks === null) {
        return res.status(400).json({ success: false, message: 'Invalid profileLinks format' });
      }

      if (profileLinks.github && !isValidUrl(profileLinks.github)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid GitHub URL' });
      }
      if (profileLinks.linkedin && !isValidUrl(profileLinks.linkedin)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid LinkedIn URL' });
      }
      if (profileLinks.leetcode && !isValidUrl(profileLinks.leetcode)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid LeetCode URL' });
      }
      if (profileLinks.geeksforgeeks && !isValidUrl(profileLinks.geeksforgeeks)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid GeeksforGeeks URL' });
      }

      const cleanCustom = [];
      if (Array.isArray(profileLinks.custom)) {
        for (const item of profileLinks.custom) {
          if (item && item.url && String(item.url).trim()) {
            const rawUrl = String(item.url).trim();
            if (!isValidUrl(rawUrl)) {
              return res.status(400).json({ success: false, message: `Invalid custom URL for "${item.label || 'Link'}"` });
            }
            cleanCustom.push({
              label: (item.label && String(item.label).trim()) || 'Custom Link',
              url: formatUrl(rawUrl)
            });
          }
        }
      }

      student.profileLinks = {
        github: formatUrl(profileLinks.github),
        linkedin: formatUrl(profileLinks.linkedin),
        leetcode: formatUrl(profileLinks.leetcode),
        geeksforgeeks: formatUrl(profileLinks.geeksforgeeks),
        custom: cleanCustom
      };
    }

    await student.save();

    // Sync canonical profileLinks into any existing Resume documents
    if (profileLinks !== undefined) {
      try {
        const studentResumes = await Resume.find({ user: req.user._id });
        for (const resDoc of studentResumes) {
          if (!resDoc.professionalLinks) resDoc.professionalLinks = {};
          if (!resDoc.codingProfiles) resDoc.codingProfiles = {};

          resDoc.professionalLinks.github = student.profileLinks.github || '';
          resDoc.professionalLinks.linkedin = student.profileLinks.linkedin || '';
          resDoc.codingProfiles.leetcode = student.profileLinks.leetcode || '';
          resDoc.codingProfiles.geeksforgeeks = student.profileLinks.geeksforgeeks || '';

          if (!Array.isArray(resDoc.links)) resDoc.links = [];

          // Update URLs in links array preserving visibility, display name, and order
          resDoc.links.forEach(l => {
            const nl = (l.name || '').toLowerCase();
            if (nl.includes('github') && student.profileLinks.github) {
              l.url = student.profileLinks.github;
            } else if (nl.includes('linkedin') && student.profileLinks.linkedin) {
              l.url = student.profileLinks.linkedin;
            } else if (nl.includes('leetcode') && student.profileLinks.leetcode) {
              l.url = student.profileLinks.leetcode;
            } else if ((nl.includes('geeksforgeeks') || nl.includes('gfg')) && student.profileLinks.geeksforgeeks) {
              l.url = student.profileLinks.geeksforgeeks;
            }
          });

          // Add any missing primary links if student added them in profile
          if (student.profileLinks.github && !resDoc.links.some(l => (l.name || '').toLowerCase().includes('github'))) {
            resDoc.links.push({ id: 'link_github', name: 'GitHub', url: student.profileLinks.github, visible: true, order: resDoc.links.length });
          }
          if (student.profileLinks.linkedin && !resDoc.links.some(l => (l.name || '').toLowerCase().includes('linkedin'))) {
            resDoc.links.push({ id: 'link_linkedin', name: 'LinkedIn', url: student.profileLinks.linkedin, visible: true, order: resDoc.links.length });
          }
          if (student.profileLinks.leetcode && !resDoc.links.some(l => (l.name || '').toLowerCase().includes('leetcode'))) {
            resDoc.links.push({ id: 'link_leetcode', name: 'LeetCode', url: student.profileLinks.leetcode, visible: true, order: resDoc.links.length });
          }
          if (student.profileLinks.geeksforgeeks && !resDoc.links.some(l => (l.name || '').toLowerCase().includes('geeksforgeeks') || (l.name || '').toLowerCase().includes('gfg'))) {
            resDoc.links.push({ id: 'link_gfg', name: 'GeeksforGeeks', url: student.profileLinks.geeksforgeeks, visible: true, order: resDoc.links.length });
          }

          // Add custom links from profile if not yet in resume links
          if (Array.isArray(student.profileLinks.custom)) {
            student.profileLinks.custom.forEach((c, cIdx) => {
              if (c.url && !resDoc.links.some(l => l.url === c.url)) {
                resDoc.links.push({
                  id: `link_custom_${Date.now()}_${cIdx}`,
                  name: c.label || 'Custom Link',
                  url: c.url,
                  visible: true,
                  order: resDoc.links.length
                });
              }
            });
          }

          resDoc.markModified('links');
          resDoc.markModified('professionalLinks');
          resDoc.markModified('codingProfiles');
          await resDoc.save();
        }
      } catch (resumeSyncErr) {
        console.error('[Resume Sync Error in updateStudentProfile]', resumeSyncErr);
      }
    }

    const updatedStudent = await Student.findById(student._id)
      .populate('user', 'name email avatar role status academicYear createdAt')
      .populate('department', 'name code isActive status')
      .populate('section', 'name code isActive status');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      student: updatedStudent,
      profileLinks: updatedStudent.profileLinks,
      user: updatedUserDoc || updatedStudent.user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all departments (Forward to dynamic Department collection)
// @route GET /api/users/departments
const getDepartments = async (req, res) => {
  try {
    const { all } = req.query;
    const query = all === 'true' ? {} : { $or: [{ isActive: true }, { status: 'active' }] };
    const depts = await Department.find(query).sort({ name: 1 });
    res.json(depts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create department
// @route POST /api/users/departments
const createDepartment = async (req, res) => {
  try {
    const departmentController = require('./departmentController');
    return departmentController.createDepartment(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Upload student resume (PDF/DOCX/DOC, max 10MB)
// @route POST /api/users/student-resume
// @access Private (Student)
const uploadStudentResume = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please select a resume file to upload (PDF, DOC, DOCX up to 10 MB).' });
    }

    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const oldPublicId = student.resumePublicId;

    // 1. Upload to Cloudinary or fallback local disk
    const uploadResult = await uploadBuffer({
      buffer: req.file.buffer,
      folder: CLOUDINARY_FOLDERS.STUDENT_RESUMES,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      resourceType: 'auto'
    });

    // 2. Update Student document
    student.resumeUrl = uploadResult.secureUrl;
    student.resumePublicId = uploadResult.publicId;
    student.resumeFileName = req.file.originalname;
    student.resumeFileSize = uploadResult.fileSize;
    student.resumeFileType = req.file.mimetype;
    student.resumeUploadedAt = uploadResult.uploadedAt || new Date();

    try {
      await student.save();
    } catch (saveErr) {
      // Rollback newly uploaded file on database save failure
      await rollbackUpload(uploadResult.publicId, uploadResult.resourceType);
      throw saveErr;
    }

    // 3. Safe deletion: Delete old file only after DB save succeeds
    if (oldPublicId && oldPublicId !== uploadResult.publicId) {
      await deleteAsset(oldPublicId);
    }

    // 4. Audit log
    await createAuditLog({
      user: req.user,
      actionType: 'UPLOAD_RESUME',
      targetEntity: 'Student Resume',
      targetId: student._id,
      targetName: req.file.originalname,
      details: `Student uploaded resume: ${req.file.originalname} (${(uploadResult.fileSize / 1024).toFixed(1)} KB)`
    });

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully.',
      resume: {
        resumeUrl: student.resumeUrl,
        resumeFileName: student.resumeFileName,
        resumeFileSize: student.resumeFileSize,
        resumeFileType: student.resumeFileType,
        resumeUploadedAt: student.resumeUploadedAt,
        storageProvider: uploadResult.storageProvider
      }
    });
  } catch (error) {
    console.error('[Upload Resume Error]', error);
    const statusCode = error.statusCode || (error.code === 'STORAGE_UNAVAILABLE' ? 503 : 500);
    res.status(statusCode).json({
      success: false,
      code: error.code || 'FILE_UPLOAD_FAILED',
      message: error.message || 'Failed to upload resume.'
    });
  }
};

// @desc Delete student resume
// @route DELETE /api/users/student-resume
// @access Private (Student)
const deleteStudentResume = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    if (!student.resumeUrl && !student.resumePublicId) {
      return res.status(400).json({ success: false, message: 'No resume is currently uploaded.' });
    }

    const oldPublicId = student.resumePublicId;
    const oldFileName = student.resumeFileName || 'Resume';

    // Remove from storage
    if (oldPublicId) {
      await deleteAsset(oldPublicId);
    }

    student.resumeUrl = '';
    student.resumePublicId = '';
    student.resumeFileName = '';
    student.resumeFileSize = 0;
    student.resumeFileType = '';
    student.resumeUploadedAt = null;
    await student.save();

    await createAuditLog({
      user: req.user,
      actionType: 'DELETE_RESUME',
      targetEntity: 'Student Resume',
      targetId: student._id,
      targetName: oldFileName,
      details: `Student removed resume: ${oldFileName}`
    });

    return res.status(200).json({
      success: true,
      message: 'Resume removed successfully.'
    });
  } catch (error) {
    console.error('[Delete Resume Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete resume.' });
  }
};

// @desc Get student resume with strict authorization
// @route GET /api/users/student-resume/:studentId?
// @access Private (Student can only access self; Faculty & Admin can access any)
const getStudentResume = async (req, res) => {
  try {
    const requestedStudentId = req.params.studentId || req.query.studentId;
    let student;

    const userRole = (req.user.role || '').toUpperCase();

    if (!requestedStudentId) {
      // Self retrieval
      student = await Student.findOne({ user: req.user._id }).populate('user', 'name email');
    } else {
      // Find by student _id or user _id
      student = await Student.findOne({
        $or: [
          mongoose.Types.ObjectId.isValid(requestedStudentId) ? { _id: requestedStudentId } : null,
          mongoose.Types.ObjectId.isValid(requestedStudentId) ? { user: requestedStudentId } : null
        ].filter(Boolean)
      }).populate('user', 'name email');
    }

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // STRICT PRIVACY CHECK:
    // If student role, they can ONLY view their own resume
    if (userRole === 'STUDENT' && !student.user._id.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        code: 'FILE_ACCESS_DENIED',
        message: 'Access denied. You can only access your own resume.'
      });
    }

    // If faculty role, they can only view resumes of students within their assigned department
    if (userRole === 'FACULTY') {
      const facultyDoc = await Faculty.findOne({ user: req.user._id });
      if (!facultyDoc || !facultyDoc.department) {
        return res.status(403).json({
          success: false,
          code: 'FILE_ACCESS_DENIED',
          message: 'Faculty department not assigned. Access denied.'
        });
      }
      const studentDeptId = student.department?._id || student.department;
      if (!studentDeptId || studentDeptId.toString() !== facultyDoc.department.toString()) {
        return res.status(403).json({
          success: false,
          code: 'FILE_ACCESS_DENIED',
          message: 'Access denied. You can only view resumes of students in your department.'
        });
      }
    }

    if (!student.resumeUrl) {
      return res.status(404).json({ success: false, message: 'No resume uploaded for this student.' });
    }

    return res.status(200).json({
      success: true,
      resume: {
        resumeUrl: student.resumeUrl,
        resumeFileName: student.resumeFileName || `${student.user?.name || 'Student'}_Resume.pdf`,
        resumeFileSize: student.resumeFileSize,
        resumeFileType: student.resumeFileType,
        resumeUploadedAt: student.resumeUploadedAt,
        studentName: student.user?.name,
        enrollmentNo: student.enrollmentNo
      }
    });
  } catch (error) {
    console.error('[Get Student Resume Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to retrieve resume.' });
  }
};

// @desc Download student resume with strict object-level authorization
// @route GET /api/users/student-resume/:studentId/download
// @access Private (Student self, Faculty in same department, Admin)
const downloadStudentResume = async (req, res) => {
  try {
    const requestedStudentId = req.params.studentId || req.query.studentId;
    let student;
    const userRole = (req.user.role || '').toUpperCase();

    if (!requestedStudentId) {
      student = await Student.findOne({ user: req.user._id });
    } else {
      student = await Student.findOne({
        $or: [
          mongoose.Types.ObjectId.isValid(requestedStudentId) ? { _id: requestedStudentId } : null,
          mongoose.Types.ObjectId.isValid(requestedStudentId) ? { user: requestedStudentId } : null
        ].filter(Boolean)
      });
    }

    if (!student) {
      return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'Student not found.' });
    }

    if (userRole === 'STUDENT' && !student.user.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        code: 'FILE_ACCESS_DENIED',
        message: 'Access denied. You can only download your own resume.'
      });
    }

    if (userRole === 'FACULTY') {
      const facultyDoc = await Faculty.findOne({ user: req.user._id });
      if (!facultyDoc || !facultyDoc.department) {
        return res.status(403).json({
          success: false,
          code: 'FILE_ACCESS_DENIED',
          message: 'Faculty department not assigned. Access denied.'
        });
      }
      const studentDeptId = student.department?._id || student.department;
      if (!studentDeptId || studentDeptId.toString() !== facultyDoc.department.toString()) {
        return res.status(403).json({
          success: false,
          code: 'FILE_ACCESS_DENIED',
          message: 'Access denied. You can only download resumes of students in your department.'
        });
      }
    }

    if (!student.resumeUrl) {
      return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'No resume uploaded for this student.' });
    }

    const resumeUrl = student.resumeUrl;
    if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://')) {
      return res.redirect(resumeUrl);
    }

    const filename = path.basename(resumeUrl.split('?')[0]);
    const filePath = path.join(__dirname, '..', 'uploads', 'resumes', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'Resume file not found on server.' });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(filePath);
  } catch (error) {
    console.error('[Download Student Resume Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStudents,
  exportStudentsExcel,
  getExportJobStatus,
  downloadExportFile,
  getStudentById,
  updateStudentAdmin,
  toggleStudentStatus,
  deleteStudentPermanently,
  bulkDeleteStudents,
  getFaculty,
  createFaculty,
  deleteUser,
  getStudentProfile,
  updateStudentProfile,
  getDepartments,
  createDepartment,
  uploadStudentResume,
  deleteStudentResume,
  getStudentResume,
  downloadStudentResume
};

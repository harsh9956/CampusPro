const Student = require('../models/Student');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const { getPaginationParams, formatPaginationResponse } = require('../utils/pagination');
const { getCurrentAcademicYear } = require('../services/academicYearService');

// @desc Get analytics dashboard statistics (Support Academic Year Filter)
// @route GET /api/analytics/dashboard
const getDashboardAnalytics = async (req, res) => {
  try {
    const { academicYear } = req.query;
    let driveQuery = {};
    let studentQuery = {};
    let appMatch = { status: 'SELECTED' };

    if (academicYear && academicYear !== 'ALL') {
      const cleanYear = String(academicYear).trim();
      driveQuery.academicYear = cleanYear;
      studentQuery.academicYear = cleanYear;
      appMatch.academicYear = cleanYear;
    }

    // Participating companies for this academic year (distinct companies with drives)
    const [totalStudents, participatingCompanyIds, totalDrives, totalSelected] = await Promise.all([
      Student.countDocuments(studentQuery),
      academicYear && academicYear !== 'ALL'
        ? PlacementDrive.find(driveQuery).distinct('company')
        : Company.distinct('_id', { status: 'Active' }),
      PlacementDrive.countDocuments(driveQuery),
      Application.countDocuments(appMatch)
    ]);

    const totalCompanies = participatingCompanyIds.length;
    const placementRatio = totalStudents > 0 ? Math.round((totalSelected / totalStudents) * 100) : 0;

    // High performance MongoDB Aggregation for branch-wise distribution
    const placementByBranchAgg = await Application.aggregate([
      { $match: appMatch },
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'studentData'
        }
      },
      { $unwind: '$studentData' },
      {
        $lookup: {
          from: 'departments',
          localField: 'studentData.department',
          foreignField: '_id',
          as: 'deptData'
        }
      },
      {
        $group: {
          _id: { $ifNull: [{ $arrayElemAt: ['$deptData.name', 0] }, '$studentData.branch'] },
          placedCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          branch: { $ifNull: ['$_id', 'General'] },
          placedCount: 1
        }
      },
      { $sort: { placedCount: -1 } }
    ]);

    res.json({
      totalStudents,
      totalCompanies,
      totalDrives,
      totalSelected,
      placementRatio,
      placementByBranch: placementByBranchAgg,
      recentDrivesCount: totalDrives
    });
  } catch (error) {
    console.error('[Get Dashboard Analytics Error]', error);
    res.status(500).json({ message: error.message });
  }
};

const { getAuditLogs } = require('./auditLogController');

// @desc Get announcements
// @route GET /api/analytics/announcements
const getAnnouncements = async (req, res) => {
  try {
    const { academicYear } = req.query;
    let query = {};
    if (academicYear && academicYear !== 'ALL') query.academicYear = academicYear;
    const announcements = await Announcement.find(query).sort({ createdAt: -1 }).lean();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create announcement
// @route POST /api/analytics/announcements
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, department, targetRole, academicYear } = req.body;
    // Always use the system's current academic year; do not trust req.body.academicYear
    const currentYear = await getCurrentAcademicYear();
    const announcement = await Announcement.create({
      title,
      content,
      department: department || 'ALL',
      targetRole: targetRole || 'ALL',
      createdBy: req.user.name || 'TPO Admin',
      academicYear: currentYear
    });
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get user notifications (supports pagination & lean)
// @route GET /api/analytics/notifications
const getNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query, { defaultLimit: 20 });
    const query = { user: req.user._id };

    if (req.query.unreadOnly === 'true') {
      query.isRead = false;
    }

    const [total, notifications] = await Promise.all([
      Notification.countDocuments(query),
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    // Backward compatibility: if page is not passed, return array
    if (!req.query.page && req.query.format !== 'paginated') {
      return res.json(notifications);
    }

    res.json(formatPaginationResponse(notifications, total, page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Mark notification as read (with strict object-level authorization)
// @route PUT /api/analytics/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID', code: 'INVALID_ID' });
    }

    const notification = await Notification.findOne({ _id: id, user: req.user._id });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, message: 'Notification marked read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get unread notification count (lightweight indexed query)
// @route GET /api/analytics/notifications/unread-count
const getUnreadNotificationCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Mark all user notifications as read
// @route PUT /api/analytics/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const roadmapService = require('../services/roadmapService');

// @desc Upload & Analyze Job Description File (PDF, DOC, DOCX, TXT)
// @route POST /api/analytics/ai-roadmap/upload-jd
const uploadJd = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded. Please select a Job Description document (PDF, DOC, DOCX, TXT up to 10 MB).' });
    }

    const { extractTextFromFileBuffer } = require('../services/resumeAnalyzerService');
    const { parseJobDescription } = require('../services/jdParserService');
    const { uploadBuffer, CLOUDINARY_FOLDERS } = require('../services/cloudinaryService');

    let extractedText = '';
    try {
      extractedText = await extractTextFromFileBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    } catch (extractErr) {
      return res.status(400).json({
        message: extractErr.message || 'Unable to extract text from the uploaded JD file.'
      });
    }

    const student = await Student.findOne({ user: req.user._id });
    const studentSkills = student && Array.isArray(student.skills) ? student.skills : [];

    const jdAnalysis = parseJobDescription(extractedText, studentSkills);

    // Upload to Cloudinary or fallback local disk
    const uploadResult = await uploadBuffer({
      buffer: req.file.buffer,
      folder: CLOUDINARY_FOLDERS.JOB_DESCRIPTIONS,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      resourceType: 'auto'
    });

    return res.status(200).json({
      success: true,
      fileName: req.file.originalname,
      fileUrl: uploadResult.secureUrl,
      secureUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      storageProvider: uploadResult.storageProvider,
      extractedText,
      jdAnalysis
    });
  } catch (error) {
    console.error('[Upload JD Error]', error);
    res.status(500).json({ message: error.message || 'Server error uploading Job Description file.' });
  }
};

// @desc Generate AI Preparation Roadmap (Module 22 - Pure AI with Optional JD)
// @route POST /api/analytics/ai-roadmap
const generateAiRoadmap = async (req, res) => {
  try {
    const {
      company,
      companyName,
      jobRole,
      targetRole,
      days,
      daysLeft,
      forceNew,
      jdText,
      fileName,
      fileUrl,
      jdAnalysis
    } = req.body;

    const compToUse = company || companyName;
    const roleToUse = jobRole || targetRole;
    const daysToUse = days || daysLeft;

    if (!compToUse || !compToUse.trim()) {
      return res.status(400).json({ message: 'Please select or enter a target company.' });
    }
    if (!roleToUse || !roleToUse.trim()) {
      return res.status(400).json({ message: 'Please enter a target job role.' });
    }

    const roadmap = await roadmapService.generateRoadmap({
      userId: req.user._id,
      company: compToUse.trim(),
      jobRole: roleToUse.trim(),
      days: daysToUse,
      forceNew: Boolean(forceNew),
      jdText: jdText || '',
      fileName: fileName || '',
      fileUrl: fileUrl || '',
      jdAnalysis: jdAnalysis || null
    });
    res.status(201).json(roadmap);
  } catch (error) {
    console.error('[Generate AI Roadmap Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Get current active preparation roadmap for student
// @route GET /api/analytics/ai-roadmap/active
const getActiveRoadmap = async (req, res) => {
  try {
    const roadmap = await roadmapService.getActiveRoadmap(req.user._id);
    res.json(roadmap);
  } catch (error) {
    console.error('[Get Active Roadmap Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Update task completion status inside roadmap
// @route PATCH /api/analytics/ai-roadmap/:id/task
const updateRoadmapTask = async (req, res) => {
  try {
    const { taskId, status } = req.body;
    if (!taskId || !status) {
      return res.status(400).json({ message: 'taskId and status are required.' });
    }
    const updatedRoadmap = await roadmapService.updateTaskProgress({
      userId: req.user._id,
      roadmapId: req.params.id,
      taskId,
      status
    });
    res.json(updatedRoadmap);
  } catch (error) {
    console.error('[Update Roadmap Task Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc AI Resume Analysis Engine (Module 23)
// @route POST /api/analytics/resume-analyzer
const analyzeResume = async (req, res) => {
  try {
    const { resumeText, targetRole } = req.body;
    const text = (resumeText || '').toLowerCase();

    const keySkillsList = ['java', 'python', 'javascript', 'react', 'node', 'express', 'mongodb', 'sql', 'dsa', 'c++', 'git', 'rest api', 'docker', 'aws', 'html', 'css', 'oop'];
    
    const matched = [];
    const missing = [];

    keySkillsList.forEach(skill => {
      if (text.includes(skill)) {
        matched.push(skill.toUpperCase());
      } else {
        missing.push(skill.toUpperCase());
      }
    });

    const matchRatio = matched.length / (matched.length + missing.length);
    const overallScore = Math.min(95, Math.max(45, Math.round(matchRatio * 100 + 20)));

    const suggestions = [];
    if (!text.includes('git')) suggestions.push('Add version control experience (Git / GitHub repositories)');
    if (!text.includes('rest api')) suggestions.push('Highlight backend API integration experience (REST APIs / Express)');
    if (!text.includes('sql') && !text.includes('mongodb')) suggestions.push('Include database management skills (MongoDB or SQL)');
    suggestions.push('Quantify project achievements with metrics (e.g. Improved performance by 30%)');

    res.json({
      targetRole: targetRole || '',
      overallScore,
      matchedSkills: matched,
      missingSkills: missing.slice(0, 5),
      suggestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get optimized faculty coordinator dashboard stats without loading massive student records
// @route GET /api/analytics/faculty-stats
const getFacultyDashboardStats = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const Faculty = require('../models/Faculty');
    const facultyDoc = await Faculty.findOne({ user: req.user._id }).populate('department', 'name code');
    const deptId = facultyDoc?.department?._id || facultyDoc?.department;

    let studentFilter = {};
    if (deptId) studentFilter.department = deptId;
    if (academicYear && academicYear !== 'ALL') studentFilter.academicYear = academicYear;

    let driveFilter = { status: { $in: ['ACTIVE', 'UPCOMING', 'PUBLISHED'] } };
    if (academicYear && academicYear !== 'ALL') driveFilter.academicYear = academicYear;

    const [totalDeptStudents, highCgpaCount, upcomingDrivesCount, recentStudents, upcomingDrives] = await Promise.all([
      Student.countDocuments(studentFilter),
      Student.countDocuments({ ...studentFilter, cgpa: { $gte: 8.0 } }),
      PlacementDrive.countDocuments(driveFilter),
      Student.find(studentFilter)
        .select('user enrollmentNo cgpa backlogs branch')
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      PlacementDrive.find(driveFilter)
        .select('company jobRole package driveDate')
        .populate('company', 'name')
        .sort({ driveDate: 1 })
        .limit(3)
        .lean()
    ]);

    res.json({
      department: facultyDoc?.department?.name || facultyDoc?.department?.code || 'Department',
      totalDeptStudents,
      highCgpaCount,
      upcomingDrivesCount,
      recentStudents,
      upcomingDrives
    });
  } catch (error) {
    console.error('[Get Faculty Stats Error]', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardAnalytics,
  getFacultyDashboardStats,
  getAuditLogs,
  getAnnouncements,
  createAnnouncement,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  uploadJd,
  generateAiRoadmap,
  getActiveRoadmap,
  updateRoadmapTask,
  analyzeResume
};

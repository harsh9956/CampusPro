const Student = require('../models/Student');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');

// @desc Get analytics dashboard statistics (Support Academic Year Filter)
// @route GET /api/analytics/dashboard
const getDashboardAnalytics = async (req, res) => {
  try {
    const { academicYear } = req.query;
    let driveQuery = {};
    let studentQuery = {};
    if (academicYear) {
      driveQuery.academicYear = academicYear;
      studentQuery.academicYear = academicYear;
    }

    const totalStudents = await Student.countDocuments(studentQuery);
    const totalCompanies = await Company.countDocuments({ status: 'Active' });
    const totalDrives = await PlacementDrive.countDocuments(driveQuery);
    
    // Total Selected Applications
    const selectedApps = await Application.find({ status: 'SELECTED' }).populate('student drive');
    const totalSelected = selectedApps.length;
    const placementRatio = totalStudents > 0 ? Math.round((totalSelected / totalStudents) * 100) : 0;

    // Branch-wise placement distribution
    const branchMap = {};
    selectedApps.forEach(app => {
      if (app.student && app.student.department) {
        const dept = app.student.department;
        branchMap[dept] = (branchMap[dept] || 0) + 1;
      }
    });
    const placementByBranch = Object.keys(branchMap).map(b => ({
      branch: b,
      placedCount: branchMap[b]
    }));

    // Company-wise placements
    const companyMap = {};
    selectedApps.forEach(app => {
      if (app.drive && app.drive.company) {
        const compId = app.drive.company.toString();
        companyMap[compId] = (companyMap[compId] || 0) + 1;
      }
    });

    res.json({
      totalStudents,
      totalCompanies,
      totalDrives,
      totalSelected,
      placementRatio,
      placementByBranch,
      recentDrivesCount: totalDrives
    });
  } catch (error) {
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
    if (academicYear) query.academicYear = academicYear;
    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
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
    const announcement = await Announcement.create({
      title,
      content,
      department: department || 'ALL',
      targetRole: targetRole || 'ALL',
      createdBy: req.user.name || 'TPO Admin',
      academicYear: academicYear || '2026-27'
    });
    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get user notifications
// @route GET /api/analytics/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Mark notification as read
// @route PUT /api/analytics/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Notification marked read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const roadmapService = require('../services/roadmapService');

// @desc Generate AI Preparation Roadmap (Module 22 - Pure AI)
// @route POST /api/analytics/ai-roadmap
const generateAiRoadmap = async (req, res) => {
  try {
    const { company, companyName, jobRole, targetRole, days, daysLeft, forceNew } = req.body;
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
      forceNew: Boolean(forceNew)
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
      targetRole: targetRole || 'Software Engineer',
      overallScore,
      matchedSkills: matched,
      missingSkills: missing.slice(0, 5),
      suggestions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardAnalytics,
  getAuditLogs,
  getAnnouncements,
  createAnnouncement,
  getNotifications,
  markNotificationRead,
  generateAiRoadmap,
  getActiveRoadmap,
  updateRoadmapTask,
  analyzeResume
};

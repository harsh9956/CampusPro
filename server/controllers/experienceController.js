const InterviewExperience = require('../models/InterviewExperience');
const Student = require('../models/Student');
const Company = require('../models/Company');
const { createAuditLog } = require('../services/auditLogService');
const { getPaginationParams, formatPaginationResponse } = require('../utils/pagination');
const { safeRegex } = require('../utils/queryHelper');
const { getCurrentAcademicYear } = require('../services/academicYearService');
const { checkHistoricalOperation } = require('../middleware/historicalGuard');

// @desc    Submit new interview experience
// @route   POST /api/experiences
// @access  Private (Student)
const createExperience = async (req, res) => {
  try {
    const {
      companyName,
      companyId,
      jobRole,
      role,
      difficulty,
      questions,
      questionsAsked,
      narrative,
      experienceText,
      advice,
      interviewDate,
      interviewMode,
      selectionStatus
    } = req.body;

    const targetCompanyName = (companyName || '').trim();
    const targetJobRole = (jobRole || role || '').trim();
    const targetNarrative = (narrative || experienceText || '').trim();
    const targetDifficulty = (difficulty || 'MEDIUM').toUpperCase();

    // Frontend validation checks
    if (!targetCompanyName) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }
    if (!targetJobRole) {
      return res.status(400).json({ success: false, message: 'Job role is required.' });
    }
    if (!difficulty) {
      return res.status(400).json({ success: false, message: 'Overall difficulty must be selected.' });
    }
    if (!targetNarrative) {
      return res.status(400).json({ success: false, message: 'Experience narrative is required.' });
    }

    // Process questions Asked
    let parsedQuestions = [];
    const rawQuestions = questions || questionsAsked;

    if (Array.isArray(rawQuestions)) {
      parsedQuestions = rawQuestions.map((q) => String(q).trim()).filter(Boolean);
    } else if (typeof rawQuestions === 'string') {
      parsedQuestions = rawQuestions
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean);
    }

    if (parsedQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one interview question is required.' });
    }

    // Map student ID strictly from req.user._id
    const studentDoc = await Student.findOne({ user: req.user._id });
    const studentId = studentDoc ? studentDoc._id : req.user._id;

    // Check optional Company collection reference
    let companyRef = companyId || null;
    if (!companyRef && targetCompanyName) {
      const existingCompany = await Company.findOne({
        name: new RegExp(`^${targetCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      });
      if (existingCompany) {
        companyRef = existingCompany._id;
      }
    }

    // Duplicate submission protection: check for same student, company & role submitted within 5 mins
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingDuplicate = await InterviewExperience.findOne({
      student: studentId,
      companyName: new RegExp(`^${targetCompanyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      jobRole: new RegExp(`^${targetJobRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingDuplicate) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a similar interview experience recently.'
      });
    }

    const studentYear = studentDoc?.academicYear || req.user?.academicYear || (await getCurrentAcademicYear());

    const newExperience = await InterviewExperience.create({
      company: companyRef,
      companyName: targetCompanyName,
      student: studentId,
      jobRole: targetJobRole,
      difficulty: targetDifficulty,
      questions: parsedQuestions,
      narrative: targetNarrative,
      advice: advice ? advice.trim() : '',
      interviewDate: interviewDate ? new Date(interviewDate) : new Date(),
      interviewMode: interviewMode || 'ONLINE',
      selectionStatus: selectionStatus || 'NOT_DISCLOSED',
      approvalStatus: 'PENDING',
      rejectionReason: '',
      approvedBy: null,
      approvedAt: null,
      academicYear: studentYear    // NEVER trust req.body.academicYear — backend derives year from student record
    });

    const userRole = (req.user?.role || '').toUpperCase();
    if (req.user && ['ADMIN', 'FACULTY'].includes(userRole)) {
      await createAuditLog({
        user: req.user,
        actionType: 'CREATE',
        targetEntity: 'Interview Experience',
        targetId: newExperience._id,
        targetName: `${targetCompanyName} (${targetJobRole})`,
        details: `Created interview experience entry for ${targetCompanyName}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Experience submitted successfully and is waiting for admin approval.',
      data: newExperience
    });
  } catch (error) {
    console.error('[Create Experience Error]', error);
    res.status(500).json({ success: false, message: error.message || 'Server error while submitting experience.' });
  }
};

// @desc    Get interview experiences (Students get APPROVED only; Admins get filtered by status)
// @route   GET /api/experiences
// @access  Private
const getExperiences = async (req, res) => {
  try {
    const { status, companyName, difficulty, jobRole, search, academicYear } = req.query;
    let filter = {};

    const userRole = (req.user?.role || '').toUpperCase();
    // Role-based visibility
    if (userRole === 'STUDENT') {
      filter.approvalStatus = 'APPROVED';
    } else if (status) {
      filter.approvalStatus = status.toUpperCase();
    }

    if (academicYear && academicYear !== 'ALL') {
      filter.academicYear = academicYear;
    }

    if (companyName && companyName !== 'ALL') {
      const regex = safeRegex(companyName);
      if (regex) filter.companyName = regex;
    }

    if (difficulty && difficulty !== 'ALL') {
      filter.difficulty = difficulty.toUpperCase();
    }

    if (jobRole && jobRole !== 'ALL') {
      const regex = safeRegex(jobRole);
      if (regex) filter.jobRole = regex;
    }

    if (search) {
      const searchRegex = safeRegex(search);
      if (searchRegex) {
        filter.$or = [
          { companyName: searchRegex },
          { jobRole: searchRegex },
          { narrative: searchRegex },
          { questions: searchRegex }
        ];
      }
    }

    const shouldPaginate = req.query.paginate !== 'false' && req.query.all !== 'true';
    const { page, limit, skip } = getPaginationParams(req.query, { defaultLimit: 20 });

    const [total, totalAll, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      InterviewExperience.countDocuments(filter),
      InterviewExperience.countDocuments({}),
      InterviewExperience.countDocuments({ approvalStatus: 'PENDING' }),
      InterviewExperience.countDocuments({ approvalStatus: 'APPROVED' }),
      InterviewExperience.countDocuments({ approvalStatus: 'REJECTED' })
    ]);

    let expQuery = InterviewExperience.find(filter)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('company', 'name logo industry')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    if (shouldPaginate) {
      expQuery = expQuery.skip(skip).limit(limit);
    }

    const experiences = await expQuery.lean();

    res.json({
      success: true,
      count: experiences.length,
      total,
      page: shouldPaginate ? page : 1,
      pages: shouldPaginate ? (Math.ceil(total / limit) || 1) : 1,
      pagination: {
        page: shouldPaginate ? page : 1,
        limit: shouldPaginate ? limit : total,
        total,
        totalPages: shouldPaginate ? (Math.ceil(total / limit) || 1) : 1,
        hasNextPage: shouldPaginate ? (page < Math.ceil(total / limit)) : false,
        hasPreviousPage: shouldPaginate ? (page > 1) : false
      },
      counts: {
        total: totalAll,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      },
      data: experiences
    });
  } catch (error) {
    console.error('[Get Experiences Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get logged-in student's submitted experiences
// @route   GET /api/experiences/my
// @access  Private (Student)
const getMyExperiences = async (req, res) => {
  try {
    const studentDoc = await Student.findOne({ user: req.user._id }).select('_id').lean();
    const studentId = studentDoc ? studentDoc._id : req.user._id;
    const { page, limit, skip } = getPaginationParams(req.query, { defaultLimit: 20 });

    const query = {
      $or: [{ student: studentId }, { student: req.user._id }]
    };

    const total = await InterviewExperience.countDocuments(query);
    let expQuery = InterviewExperience.find(query)
      .populate('company', 'name logo industry')
      .sort({ createdAt: -1 })
      .lean();

    if (req.query.paginate !== 'false' && req.query.all !== 'true') {
      expQuery = expQuery.skip(skip).limit(limit);
    }

    const experiences = await expQuery;

    res.json({
      success: true,
      count: experiences.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      },
      data: experiences
    });
  } catch (error) {
    console.error('[Get My Experiences Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get experience details by ID
// @route   GET /api/experiences/:id
// @access  Private
const getExperienceById = async (req, res) => {
  try {
    const experience = await InterviewExperience.findById(req.params.id)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('company', 'name logo industry')
      .populate('approvedBy', 'name email');

    if (!experience) {
      return res.status(404).json({ success: false, message: 'Interview experience not found.' });
    }

    // Security check for student role
    if ((req.user.role || '').toUpperCase() === 'STUDENT') {
      const studentDoc = await Student.findOne({ user: req.user._id });
      const isOwner = studentDoc && String(experience.student._id || experience.student) === String(studentDoc._id);
      if (experience.approvalStatus !== 'APPROVED' && !isOwner) {
        return res.status(403).json({ success: false, message: 'You are not authorized to view this experience.' });
      }
    }

    res.json({
      success: true,
      data: experience
    });
  } catch (error) {
    console.error('[Get Experience By ID Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve an interview experience
// @route   PATCH /api/experiences/:id/approve
// @access  Private (Admin)
const approveExperience = async (req, res) => {
  try {
    const experience = await InterviewExperience.findById(req.params.id);
    if (!experience) {
      return res.status(404).json({ success: false, message: 'Interview experience not found.' });
    }

    const historicalCheck = await checkHistoricalOperation(req, experience.academicYear, 'Interview Experience');
    if (!historicalCheck.allowed) {
      return res.status(historicalCheck.status || 403).json({
        success: false,
        code: historicalCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: historicalCheck.message
      });
    }

    experience.approvalStatus = 'APPROVED';
    experience.approvedBy = req.user._id;
    experience.approvedAt = new Date();
    experience.rejectionReason = '';

    await experience.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Interview Experience',
        targetId: experience._id,
        targetName: `${experience.companyName} (${experience.jobRole})`,
        details: `Approved interview experience for ${experience.companyName}`
      });
    }

    res.json({
      success: true,
      message: 'Experience approved successfully.',
      data: experience
    });
  } catch (error) {
    console.error('[Approve Experience Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject an interview experience
// @route   PATCH /api/experiences/:id/reject
// @access  Private (Admin)
const rejectExperience = async (req, res) => {
  try {
    const { reason, rejectionReason } = req.body;
    const experience = await InterviewExperience.findById(req.params.id);

    if (!experience) {
      return res.status(404).json({ success: false, message: 'Interview experience not found.' });
    }

    const historicalCheck = await checkHistoricalOperation(req, experience.academicYear, 'Interview Experience');
    if (!historicalCheck.allowed) {
      return res.status(historicalCheck.status || 403).json({
        success: false,
        code: historicalCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: historicalCheck.message
      });
    }

    const finalReason = (reason || rejectionReason || 'Content does not meet posting guidelines.').trim();

    experience.approvalStatus = 'REJECTED';
    experience.rejectionReason = finalReason;
    experience.approvedBy = req.user._id;
    experience.approvedAt = new Date();

    await experience.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Interview Experience',
        targetId: experience._id,
        targetName: `${experience.companyName} (${experience.jobRole})`,
        details: `Rejected interview experience: ${finalReason}`
      });
    }

    res.json({
      success: true,
      message: 'Experience rejected successfully.',
      data: experience
    });
  } catch (error) {
    console.error('[Reject Experience Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get interview experience statistics
// @route   GET /api/experiences/stats
// @access  Private (Admin)
const getExperienceStats = async (req, res) => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      InterviewExperience.countDocuments({}),
      InterviewExperience.countDocuments({ approvalStatus: 'PENDING' }),
      InterviewExperience.countDocuments({ approvalStatus: 'APPROVED' }),
      InterviewExperience.countDocuments({ approvalStatus: 'REJECTED' })
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected
      }
    });
  } catch (error) {
    console.error('[Get Experience Stats Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete an interview experience permanently
// @route   DELETE /api/experiences/:id
// @access  Private (Admin only)
const deleteExperience = async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only administrators can delete interview experiences.'
      });
    }

    const { reason, deletionReason } = req.body || {};
    const finalReason = (reason || deletionReason || req.query?.reason || '').trim();

    if (!finalReason) {
      return res.status(400).json({
        success: false,
        message: 'A deletion reason is required to delete an interview experience.'
      });
    }

    const experience = await InterviewExperience.findById(req.params.id);
    if (!experience) {
      return res.status(404).json({ success: false, message: 'Interview experience not found.' });
    }

    const historicalCheck = await checkHistoricalOperation(req, experience.academicYear, 'Interview Experience');
    if (!historicalCheck.allowed) {
      return res.status(historicalCheck.status || 403).json({
        success: false,
        code: historicalCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: historicalCheck.message
      });
    }

    await InterviewExperience.findByIdAndDelete(req.params.id);

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'DELETE_INTERVIEW_EXPERIENCE',
        targetEntity: 'Interview Experience',
        targetId: experience._id,
        targetName: `${experience.companyName} (${experience.jobRole})`,
        details: `Reason: ${finalReason} | Student: ${experience.student || 'N/A'} | Company: ${experience.companyName} | Role: ${experience.jobRole}`
      });
    }

    res.json({
      success: true,
      message: 'Interview experience deleted successfully.'
    });
  } catch (error) {
    console.error('[Delete Experience Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createExperience,
  getExperiences,
  getMyExperiences,
  getExperienceById,
  getExperienceStats,
  approveExperience,
  rejectExperience,
  deleteExperience
};

const InterviewExperience = require('../models/InterviewExperience');
const Student = require('../models/Student');
const Company = require('../models/Company');
const { createAuditLog } = require('../services/auditLogService');

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
      approvedAt: null
    });

    if (req.user && (req.user.role === 'admin' || req.user.role === 'faculty')) {
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
    const { status, companyName, difficulty, jobRole, search } = req.query;
    let filter = {};

    // Role-based visibility
    if (req.user && req.user.role === 'student') {
      filter.approvalStatus = 'APPROVED';
    } else if (status) {
      filter.approvalStatus = status.toUpperCase();
    }

    if (companyName && companyName !== 'ALL') {
      filter.companyName = new RegExp(companyName, 'i');
    }

    if (difficulty && difficulty !== 'ALL') {
      filter.difficulty = difficulty.toUpperCase();
    }

    if (jobRole && jobRole !== 'ALL') {
      filter.jobRole = new RegExp(jobRole, 'i');
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { companyName: searchRegex },
        { jobRole: searchRegex },
        { narrative: searchRegex },
        { questions: searchRegex }
      ];
    }

    const experiences = await InterviewExperience.find(filter)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('company', 'name logo industry')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: experiences.length,
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
    const studentDoc = await Student.findOne({ user: req.user._id });
    const studentId = studentDoc ? studentDoc._id : req.user._id;

    const experiences = await InterviewExperience.find({
      $or: [{ student: studentId }, { student: req.user._id }]
    })
      .populate('company', 'name logo industry')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: experiences.length,
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
    if (req.user.role === 'student') {
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

// @desc    Delete an interview experience permanently
// @route   DELETE /api/experiences/:id
// @access  Private (Admin only)
const deleteExperience = async (req, res) => {
  try {
    const experience = await InterviewExperience.findByIdAndDelete(req.params.id);
    if (!experience) {
      return res.status(404).json({ success: false, message: 'Interview experience not found.' });
    }

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'DELETE',
        targetEntity: 'Interview Experience',
        targetId: experience._id,
        targetName: `${experience.companyName} (${experience.jobRole})`,
        details: `Deleted interview experience entry for ${experience.companyName}`
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
  approveExperience,
  rejectExperience,
  deleteExperience
};

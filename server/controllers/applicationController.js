const Application = require('../models/Application');
const PlacementDrive = require('../models/PlacementDrive');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { checkEligibility } = require('../services/eligibilityService');
const { createAuditLog } = require('../services/auditLogService');
const { getNormalizedRounds } = require('../utils/roundUtils');

// @desc Apply to a placement drive
// @route POST /api/applications/:driveId/apply
const applyToDrive = async (req, res) => {
  try {
    const { driveId } = req.params;

    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const drive = await PlacementDrive.findById(driveId).populate('company');
    if (!drive) {
      return res.status(404).json({ message: 'Placement drive not found' });
    }

    // 1. Check Configured Selection Rounds
    const rounds = getNormalizedRounds(drive);
    if (rounds.length === 0) {
      return res.status(400).json({ message: 'This placement drive has no configured selection rounds.' });
    }

    // 2. Eligibility Check
    const evalResult = checkEligibility(student, drive.toObject());
    if (!evalResult.eligible) {
      return res.status(400).json({
        message: 'You are not eligible for this placement drive',
        reasons: evalResult.reasons
      });
    }

    // 3. Existing Application Check
    const existingApp = await Application.findOne({ drive: driveId, student: student._id });
    if (existingApp) {
      return res.status(400).json({ message: 'You have already applied for this placement drive' });
    }

    // 4. Create Application using the first configured DB round
    const application = await Application.create({
      drive: driveId,
      student: student._id,
      user: req.user._id,
      currentRound: rounds[0].roundName,
      currentRoundOrder: rounds[0].order || 1,
      status: 'REGISTERED',
      timeline: [
        {
          stage: 'REGISTERED',
          updatedBy: req.user._id,
          remarks: 'Student successfully registered for drive'
        }
      ]
    });

    // 5. Create Notification
    await Notification.create({
      user: req.user._id,
      title: `Applied to ${drive.company.name}`,
      message: `Your application for ${drive.jobRole} (${drive.company.name}) has been submitted successfully.`,
      type: 'DRIVE'
    });

    res.status(201).json({
      message: 'Successfully registered for placement drive!',
      application
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get student's applications with populated rounds & interview results for application tracker
// @route GET /api/applications/my
const getMyApplications = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const InterviewResult = require('../models/InterviewResult');

    const applications = await Application.find({ student: student._id })
      .populate({
        path: 'drive',
        populate: { path: 'company' }
      })
      .sort({ appliedAt: -1 })
      .lean();

    // Populate InterviewResult records and normalized drive rounds for each application
    const populatedApps = await Promise.all(
      applications.map(async (app) => {
        const results = await InterviewResult.find({ application: app._id })
          .populate('evaluatedBy', 'name email')
          .sort({ roundOrder: 1 })
          .lean();

        const driveRounds = getNormalizedRounds(app.drive);

        return {
          ...app,
          driveRounds,
          results
        };
      })
    );

    res.json(populatedApps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all applications for a drive (Admin / Faculty)
// @route GET /api/applications/drive/:driveId
const getDriveApplications = async (req, res) => {
  try {
    const { driveId } = req.params;
    const applications = await Application.find({ drive: driveId })
      .populate('student')
      .populate('user', 'name email avatar')
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update application status / advance candidate round
// @route PUT /api/applications/:id/status
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentRound, remarks } = req.body;

    const application = await Application.findById(id).populate('student').populate('user').populate({
      path: 'drive',
      populate: { path: 'company' }
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const oldStatus = application.status;
    if (status) application.status = status;
    if (currentRound) application.currentRound = currentRound;

    application.timeline.push({
      stage: status || application.status,
      updatedBy: req.user._id,
      remarks: remarks || `Status updated to ${status || application.status}`
    });

    await application.save();

    // Audit Log for TPO tracking
    await createAuditLog({
      user: req.user,
      actionType: 'UPDATE',
      targetEntity: 'Application',
      targetId: application._id,
      targetName: `${application.user ? application.user.name : 'Student'} (${application.drive && application.drive.company ? application.drive.company.name : 'Drive'})`,
      details: `Updated application status for ${application.user ? application.user.name : 'Student'} to ${status || application.status} (Round: ${currentRound || application.currentRound || 'N/A'})`
    });

    // Notify Student
    await Notification.create({
      user: application.user._id,
      title: `Status Update: ${application.drive.company.name}`,
      message: `Your application status for ${application.drive.jobRole} has been updated to ${status}.`,
      type: 'RESULT'
    });

    res.json({ message: 'Application status updated successfully', application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  applyToDrive,
  getMyApplications,
  getDriveApplications,
  updateApplicationStatus
};

const Application = require('../models/Application');
const PlacementDrive = require('../models/PlacementDrive');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const InterviewResult = require('../models/InterviewResult');
const { createAuditLog } = require('../services/auditLogService');
const {
  getNormalizedRounds,
  getClearedStatusForRound,
  findCurrentRoundIndex
} = require('../utils/roundUtils');
const {
  checkStudentRoundEligibility,
  calculateDriveRoundStatistics
} = require('../utils/eligibilityUtils');

// @desc Get all applications, drive rounds, existing interview results, and dynamic round statistics for a drive
// @route GET /api/interviews/drive/:driveId
const getDriveInterviews = async (req, res) => {
  try {
    const { driveId } = req.params;

    const drive = await PlacementDrive.findById(driveId).populate('company', 'name logo industry location');
    if (!drive) {
      return res.status(404).json({ message: 'Placement drive not found.' });
    }

    const rounds = getNormalizedRounds(drive);

    const applications = await Application.find({ drive: driveId })
      .populate('student')
      .populate('user', 'name email avatar')
      .sort({ appliedAt: -1 });

    const results = await InterviewResult.find({ drive: driveId })
      .populate('evaluatedBy', 'name email')
      .sort({ roundOrder: 1 });

    // Compute Dynamic Round Statistics strictly using eligibility utils
    const roundStatistics = calculateDriveRoundStatistics(applications, results, rounds);

    const totalApplicants = applications.length;
    const finalSelected = applications.filter((app) => app.status === 'SELECTED').length;
    const rejected = applications.filter((app) => app.status === 'REJECTED').length;

    res.json({
      drive,
      rounds,
      applications,
      results,
      roundStatistics,
      totalApplicants,
      finalSelected,
      rejected
    });
  } catch (error) {
    console.error('[Get Drive Interviews Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Get round evaluation history for a specific application
// @route GET /api/interviews/application/:applicationId
const getApplicationRoundHistory = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('user', 'name email avatar')
      .populate({ path: 'drive', populate: { path: 'company' } });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const results = await InterviewResult.find({ application: applicationId })
      .populate('evaluatedBy', 'name email')
      .sort({ roundOrder: 1 });

    const driveRounds = getNormalizedRounds(application.drive);

    res.json({
      application,
      results,
      driveRounds,
      timeline: application.timeline || []
    });
  } catch (error) {
    console.error('[Get Application Round History Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Save / update round evaluation result for an application
// @route POST /api/interviews/result
const saveRoundResult = async (req, res) => {
  try {
    const { applicationId, roundName, roundOrder, roundType, status, score, feedback, interviewDate } = req.body;

    if (!applicationId || !roundName || roundOrder === undefined) {
      return res.status(400).json({ message: 'applicationId, roundName, and roundOrder are required.' });
    }

    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('user')
      .populate({ path: 'drive', populate: { path: 'company' } });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const driveRounds = getNormalizedRounds(application.drive);
    if (driveRounds.length === 0) {
      return res.status(400).json({ message: 'No selection rounds configured for this placement drive.' });
    }

    const rawStatus = (status || 'PENDING').toUpperCase();
    const normalizedStatus = ['PENDING', 'PASSED', 'FAILED', 'NOT_ATTEMPTED'].includes(rawStatus)
      ? rawStatus
      : 'PENDING';

    const orderNum = parseInt(roundOrder, 10) || 1;
    const companyTitle = application.drive && application.drive.company ? application.drive.company.name : 'Placement Drive';

    // Verify round eligibility for target orderNum
    const allResultsForApp = await InterviewResult.find({ application: applicationId });
    const eligibility = checkStudentRoundEligibility(application, orderNum, allResultsForApp);
    if (!eligibility.eligible && orderNum > 1) {
      return res.status(400).json({
        message: `Candidate is not eligible to be evaluated for Round ${orderNum} (${roundName}): ${eligibility.reason}`
      });
    }

    // 1. Save or update InterviewResult for this roundOrder
    let result = await InterviewResult.findOne({ application: applicationId, roundOrder: orderNum });

    if (!result) {
      result = new InterviewResult({
        application: applicationId,
        student: application.student._id,
        user: application.user._id,
        drive: application.drive._id,
        company: application.drive.company ? application.drive.company._id : null,
        companyName: companyTitle,
        roundName,
        roundOrder: orderNum,
        roundType: roundType || 'Other'
      });
    }

    result.status = normalizedStatus;
    if (score !== undefined && score !== null && score !== '') result.score = Number(score);
    if (feedback !== undefined) result.feedback = feedback.trim();
    if (interviewDate) result.interviewDate = new Date(interviewDate);
    result.evaluatedAt = new Date();
    result.evaluatedBy = req.user._id;
    result.evaluatedByName = req.user.name || 'Faculty Evaluator';

    await result.save();

    // 2. Handle Application State Progression
    const currentRoundIdx = findCurrentRoundIndex(driveRounds, orderNum, roundName);
    const isFinalRound = currentRoundIdx >= driveRounds.length - 1;

    if (normalizedStatus === 'FAILED') {
      application.status = 'REJECTED';
      application.timeline.push({
        stage: 'REJECTED',
        updatedBy: req.user._id,
        remarks: `Failed ${roundName}. ${feedback ? 'Feedback: ' + feedback : ''}`
      });
    } else if (normalizedStatus === 'PASSED') {
      if (isFinalRound) {
        application.status = 'SELECTED';
        application.currentRoundOrder = orderNum;
        application.currentRound = 'SELECTED (Final Selection)';
        application.timeline.push({
          stage: 'SELECTED',
          updatedBy: req.user._id,
          remarks: `Passed final round (${roundName}) and selected for placement!`
        });
      } else {
        const nextRoundObj = driveRounds[currentRoundIdx + 1];
        application.status = 'IN_PROGRESS';
        application.currentRoundOrder = nextRoundObj.order;
        application.currentRound = nextRoundObj.roundName;
        application.timeline.push({
          stage: nextRoundObj.roundName,
          updatedBy: req.user._id,
          remarks: `Passed ${roundName}. Advanced to ${nextRoundObj.roundName}.`
        });
      }
    }

    await application.save();

    // Log Audit Log
    await createAuditLog({
      user: req.user,
      actionType: 'UPDATE',
      targetEntity: 'Result',
      targetId: result._id,
      targetName: `${application.user ? application.user.name : 'Student'} (${roundName})`,
      details: `Saved result for ${roundName}: ${normalizedStatus} (Score: ${score !== undefined && score !== '' ? score : 'N/A'})`
    });

    // Notify Student
    await Notification.create({
      user: application.user._id,
      title: `Round Result: ${companyTitle}`,
      message: normalizedStatus === 'PASSED'
        ? (isFinalRound
            ? `🎉 Congratulations! You cleared ${roundName} and have been SELECTED at ${companyTitle}!`
            : `Congratulations! You cleared ${roundName} and advanced to the next round for ${application.drive.jobRole}.`)
        : `Your application status for ${application.drive.jobRole} has been updated to ${normalizedStatus} following ${roundName}.`,
      type: 'RESULT'
    });

    res.json({
      message: `Result for ${roundName} saved successfully.`,
      result,
      application
    });
  } catch (error) {
    console.error('[Save Round Result Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Advance candidate to next round or mark final selection / rejection
// @route POST /api/interviews/advance
const advanceCandidateRound = async (req, res) => {
  try {
    const { applicationId, resultStatus, score, feedback, interviewDate } = req.body;

    if (!applicationId) {
      return res.status(400).json({ message: 'applicationId is required.' });
    }

    const application = await Application.findById(applicationId)
      .populate('student')
      .populate('user')
      .populate({ path: 'drive', populate: { path: 'company' } });

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.status === 'REJECTED') {
      return res.status(400).json({ message: 'Cannot advance a candidate who has been rejected.' });
    }

    if (application.status === 'SELECTED') {
      return res.status(400).json({ message: 'Candidate is already selected for placement.' });
    }

    if (application.status === 'WITHDRAWN') {
      return res.status(400).json({ message: 'Cannot advance a candidate who has withdrawn their application.' });
    }

    const driveRounds = getNormalizedRounds(application.drive);
    if (driveRounds.length === 0) {
      return res.status(400).json({ message: 'No selection rounds configured for this placement drive.' });
    }

    const companyTitle = application.drive && application.drive.company ? application.drive.company.name : 'Placement Drive';

    // Determine candidate's current round order index
    let currentRoundIdx = findCurrentRoundIndex(driveRounds, application.currentRoundOrder, application.currentRound);
    if (currentRoundIdx === -1) currentRoundIdx = 0;
    const currentRoundObj = driveRounds[currentRoundIdx] || driveRounds[0];

    const existingResults = await InterviewResult.find({ application: applicationId });
    const eligibility = checkStudentRoundEligibility(application, currentRoundObj.order, existingResults);
    if (!eligibility.eligible && currentRoundObj.order > 1) {
      return res.status(400).json({
        message: `Cannot advance candidate in Round ${currentRoundObj.order} (${currentRoundObj.roundName}): ${eligibility.reason}`
      });
    }

    const rawStatus = (resultStatus || 'PASSED').toUpperCase();
    const normStatus = ['PENDING', 'PASSED', 'FAILED', 'NOT_ATTEMPTED'].includes(rawStatus)
      ? rawStatus
      : 'PASSED';

    // 1. Save result for current round
    let currentResult = await InterviewResult.findOne({
      application: applicationId,
      roundOrder: currentRoundObj.order
    });

    if (!currentResult) {
      currentResult = new InterviewResult({
        application: applicationId,
        student: application.student._id,
        user: application.user._id,
        drive: application.drive._id,
        company: application.drive.company ? application.drive.company._id : null,
        companyName: companyTitle,
        roundName: currentRoundObj.roundName,
        roundOrder: currentRoundObj.order,
        roundType: currentRoundObj.roundType
      });
    }

    currentResult.status = normStatus;
    if (score !== undefined && score !== null && score !== '') currentResult.score = Number(score);
    if (feedback !== undefined) currentResult.feedback = feedback.trim();
    if (interviewDate) currentResult.interviewDate = new Date(interviewDate);
    currentResult.evaluatedAt = new Date();
    currentResult.evaluatedBy = req.user._id;
    currentResult.evaluatedByName = req.user.name || 'Faculty Evaluator';
    await currentResult.save();

    // 2. Handle Rejection
    if (normStatus === 'FAILED') {
      application.status = 'REJECTED';
      application.timeline.push({
        stage: 'REJECTED',
        updatedBy: req.user._id,
        remarks: `Rejected in ${currentRoundObj.roundName}. ${feedback ? 'Feedback: ' + feedback : ''}`
      });
      await application.save();

      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Application',
        targetId: application._id,
        targetName: `${application.user ? application.user.name : 'Student'} (${companyTitle})`,
        details: `Rejected candidate in ${currentRoundObj.roundName}`
      });

      await Notification.create({
        user: application.user._id,
        title: `Application Status: ${companyTitle}`,
        message: `Your application status for ${application.drive.jobRole} has been updated to REJECTED following ${currentRoundObj.roundName}.`,
        type: 'RESULT'
      });

      return res.json({
        message: `Candidate rejected in ${currentRoundObj.roundName}.`,
        application
      });
    }

    // 3. Handle Advancement / Final Selection
    const isFinalRound = currentRoundIdx >= driveRounds.length - 1;

    if (isFinalRound) {
      // Final Round Passed -> Candidate Selected!
      application.status = 'SELECTED';
      application.currentRoundOrder = currentRoundObj.order;
      application.currentRound = 'SELECTED (Final Selection)';
      application.timeline.push({
        stage: 'SELECTED',
        updatedBy: req.user._id,
        remarks: `Passed final round (${currentRoundObj.roundName}) and selected for placement!`
      });
      await application.save();

      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Application',
        targetId: application._id,
        targetName: `${application.user ? application.user.name : 'Student'} (${companyTitle})`,
        details: `Selected candidate for placement after passing final round (${currentRoundObj.roundName})`
      });

      await Notification.create({
        user: application.user._id,
        title: `🎉 CONGRATULATIONS: Selected at ${companyTitle}!`,
        message: `You have successfully cleared all selection rounds and been SELECTED for ${application.drive.jobRole} at ${companyTitle}!`,
        type: 'RESULT'
      });

      return res.json({
        message: `Candidate cleared final round (${currentRoundObj.roundName}) and has been SELECTED!`,
        application
      });
    }

    // Advance to Next Configured Round (currentRoundOrder + 1)
    const nextRoundObj = driveRounds[currentRoundIdx + 1];
    application.currentRoundOrder = nextRoundObj.order;
    application.currentRound = nextRoundObj.roundName;
    application.status = 'IN_PROGRESS';
    application.timeline.push({
      stage: nextRoundObj.roundName,
      updatedBy: req.user._id,
      remarks: `Passed ${currentRoundObj.roundName} and advanced to ${nextRoundObj.roundName}.`
    });
    await application.save();

    // Initialize next round InterviewResult in PENDING state if not exists
    let nextResult = await InterviewResult.findOne({ application: applicationId, roundOrder: nextRoundObj.order });
    if (!nextResult) {
      await InterviewResult.create({
        application: applicationId,
        student: application.student._id,
        user: application.user._id,
        drive: application.drive._id,
        company: application.drive.company ? application.drive.company._id : null,
        companyName: companyTitle,
        roundName: nextRoundObj.roundName,
        roundOrder: nextRoundObj.order,
        roundType: nextRoundObj.roundType,
        status: 'PENDING'
      });
    }

    await createAuditLog({
      user: req.user,
      actionType: 'UPDATE',
      targetEntity: 'Application',
      targetId: application._id,
      targetName: `${application.user ? application.user.name : 'Student'} (${companyTitle})`,
      details: `Advanced candidate from ${currentRoundObj.roundName} to ${nextRoundObj.roundName}`
    });

    await Notification.create({
      user: application.user._id,
      title: `Advanced to Next Round: ${companyTitle}`,
      message: `Congratulations! You cleared ${currentRoundObj.roundName} and advanced to ${nextRoundObj.roundName} for ${application.drive.jobRole} at ${companyTitle}.`,
      type: 'RESULT'
    });

    res.json({
      message: `Advanced candidate from ${currentRoundObj.roundName} to ${nextRoundObj.roundName} successfully.`,
      application
    });
  } catch (error) {
    console.error('[Advance Candidate Round Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Bulk update results for multiple applications
// @route POST /api/interviews/bulk-result
const bulkUpdateRoundResults = async (req, res) => {
  try {
    const { applicationIds, status, feedback } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ message: 'applicationIds array is required.' });
    }

    const rawStatus = (status || 'PASSED').toUpperCase();
    const normStatus = ['PENDING', 'PASSED', 'FAILED', 'NOT_ATTEMPTED'].includes(rawStatus) ? rawStatus : 'PASSED';

    let advancedCount = 0;
    let selectedCount = 0;
    let rejectedCount = 0;
    let skippedCount = 0;

    for (const appId of applicationIds) {
      try {
        const app = await Application.findById(appId).populate({ path: 'drive', populate: { path: 'company' } });
        if (!app || app.status === 'REJECTED' || app.status === 'SELECTED' || app.status === 'WITHDRAWN') {
          skippedCount++;
          continue;
        }

        const driveRounds = getNormalizedRounds(app.drive);
        if (driveRounds.length === 0) {
          skippedCount++;
          continue;
        }

        let roundIdx = findCurrentRoundIndex(driveRounds, app.currentRoundOrder, app.currentRound);
        if (roundIdx === -1) roundIdx = 0;
        const currentRoundObj = driveRounds[roundIdx] || driveRounds[0];
        const companyTitle = app.drive && app.drive.company ? app.drive.company.name : 'Placement Drive';

        const existingResults = await InterviewResult.find({ application: appId });
        const eligibility = checkStudentRoundEligibility(app, currentRoundObj.order, existingResults);
        if (!eligibility.eligible && currentRoundObj.order > 1) {
          skippedCount++;
          continue;
        }

        // Save round result
        let result = await InterviewResult.findOne({ application: appId, roundOrder: currentRoundObj.order });
        if (!result) {
          result = new InterviewResult({
            application: appId,
            student: app.student,
            user: app.user,
            drive: app.drive._id,
            company: app.drive.company ? app.drive.company._id : null,
            companyName: companyTitle,
            roundName: currentRoundObj.roundName,
            roundOrder: currentRoundObj.order,
            roundType: currentRoundObj.roundType
          });
        }
        result.status = normStatus;
        if (feedback) result.feedback = feedback.trim();
        result.evaluatedAt = new Date();
        result.evaluatedBy = req.user._id;
        result.evaluatedByName = req.user.name || 'Faculty Evaluator';
        await result.save();

        if (normStatus === 'FAILED') {
          app.status = 'REJECTED';
          app.timeline.push({
            stage: 'REJECTED',
            updatedBy: req.user._id,
            remarks: feedback || `Bulk evaluated as FAILED in ${currentRoundObj.roundName}`
          });
          rejectedCount++;
        } else if (normStatus === 'PASSED') {
          const isFinalRound = roundIdx >= driveRounds.length - 1;
          if (isFinalRound) {
            app.status = 'SELECTED';
            app.currentRoundOrder = currentRoundObj.order;
            app.currentRound = 'SELECTED (Final Selection)';
            app.timeline.push({
              stage: 'SELECTED',
              updatedBy: req.user._id,
              remarks: `Selected after clearing ${currentRoundObj.roundName}`
            });
            selectedCount++;
          } else {
            const nextRoundObj = driveRounds[roundIdx + 1];
            app.status = 'IN_PROGRESS';
            app.currentRoundOrder = nextRoundObj.order;
            app.currentRound = nextRoundObj.roundName;
            app.timeline.push({
              stage: nextRoundObj.roundName,
              updatedBy: req.user._id,
              remarks: `Bulk advanced from ${currentRoundObj.roundName} to ${nextRoundObj.roundName}`
            });
            advancedCount++;
          }
        }

        await app.save();
      } catch (err) {
        console.error(`Error bulk updating app ${appId}:`, err);
        skippedCount++;
      }
    }

    await createAuditLog({
      user: req.user,
      actionType: 'UPDATE',
      targetEntity: 'Application',
      targetId: req.user._id,
      targetName: `Bulk update (${applicationIds.length} candidates)`,
      details: `Bulk processed ${applicationIds.length} candidates to ${normStatus} (Advanced: ${advancedCount}, Selected: ${selectedCount}, Rejected: ${rejectedCount}, Skipped: ${skippedCount})`
    });

    res.json({
      message: `Processed bulk update for ${applicationIds.length} candidate(s).`,
      summary: {
        totalProcessed: applicationIds.length,
        updatedCount: advancedCount + selectedCount + rejectedCount,
        advancedCount,
        selectedCount,
        rejectedCount,
        skippedCount
      }
    });
  } catch (error) {
    console.error('[Bulk Update Round Results Error]', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDriveInterviews,
  getApplicationRoundHistory,
  saveRoundResult,
  advanceCandidateRound,
  bulkUpdateRoundResults
};

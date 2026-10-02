const { Worker } = require('bullmq');
const { redisConfig, isRedisEnabled } = require('../config/redis');
const { EMAIL_QUEUE_NAME } = require('../queues/emailQueue');
const EmailNotificationLog = require('../models/EmailNotificationLog');
const Student = require('../models/Student');
const User = require('../models/User');
const Company = require('../models/Company');
const PlacementDrive = require('../models/PlacementDrive');
const {
  sendDrivePublishEmail,
  sanitizeErrorMessage,
  isSmtpAuthOrRateLimitError,
  isValidEmail
} = require('../services/emailService');
const { formatEligibilitySummary, formatSelectionProcessSummary } = require('../services/notificationService');
const { getCurrentAcademicYear } = require('../services/academicYearService');

const CONCURRENCY = parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '5', 10);

let emailWorker = null;

/**
 * Standalone processor for an individual email job.
 * Used both by BullMQ emailWorker and by in-memory / fallback background queue.
 */
const processEmailJob = async (jobData, jobContext = {}) => {
  const {
    type,
    placementDriveId,
    studentId,
    userId,
    email: initialEmail,
    studentName: initialName
  } = jobData;

  const jobId = jobContext.id || `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const attemptNum = (jobContext.attemptsMade || 0) + 1;
  const maxAttempts = jobContext.attempts || 3;

  let targetStudentId = studentId || null;
  let targetUserId = userId || null;
  let recipientEmail = initialEmail ? initialEmail.trim().toLowerCase() : '';
  let recipientName = initialName || 'Student';

  try {
    // 1. Fetch placement drive details if drive notification
    let drive = null;
    let compName = 'Company';
    let deadlineFormatted = 'N/A';
    let eligibilityText = 'General Eligibility Rules Apply';
    let roundsText = 'Selection rounds will be announced by T&P';

    if (placementDriveId) {
      try {
        drive = await PlacementDrive.findById(placementDriveId).populate('company').lean();
        if (drive) {
          compName = drive.company?.name || drive.companyName || 'Company';
          deadlineFormatted = drive.deadline
            ? new Date(drive.deadline).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            : 'N/A';
          eligibilityText = formatEligibilitySummary(drive);
          roundsText = formatSelectionProcessSummary(drive);
        }
      } catch (driveErr) {
        console.error(`[EmailWorker] Failed to fetch drive ${placementDriveId}:`, driveErr.message);
      }
    }

    // 2. Fetch the student / user document from MongoDB (Registered user email is the single source of truth)
    try {
      if (studentId) {
        const studentDoc = await Student.findById(studentId).populate('user').lean();
        if (studentDoc) {
          if (studentDoc.user?.email) {
            recipientEmail = studentDoc.user.email.trim().toLowerCase();
          }
          if (studentDoc.user?.name) {
            recipientName = studentDoc.user.name;
          }
          targetUserId = studentDoc.user?._id ? studentDoc.user._id.toString() : targetUserId;
        }
      } else if (userId) {
        const userDoc = await User.findById(userId).lean();
        if (userDoc) {
          recipientEmail = (userDoc.email || recipientEmail).trim().toLowerCase();
          recipientName = userDoc.name || recipientName;
          targetUserId = userDoc._id.toString();
        }
      }

      if (!targetUserId && recipientEmail) {
        const userDoc = await User.findOne({ email: recipientEmail }).lean();
        if (userDoc) {
          targetUserId = userDoc._id.toString();
        }
      }
    } catch (fetchErr) {
      console.error(`[EmailWorker] Student/User lookup error for job ${jobId}:`, fetchErr.message);
    }

    // Diagnostic logging strictly matching Section 2 specification
    console.log(`[EMAIL] Processing job ${jobId}`);
    console.log(`[EMAIL] Student: ${targetStudentId || 'N/A'}`);
    console.log(`[EMAIL] Recipient: ${recipientEmail || 'N/A'}`);
    console.log(`[EMAIL] SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`[EMAIL] SMTP Port: ${process.env.SMTP_PORT || '587'}`);
    console.log(`[EMAIL] Attempt: ${attemptNum}`);

    // 3. Recipient Validation
    if (!recipientEmail || !isValidEmail(recipientEmail)) {
      const skipReason = `Recipient email invalid or missing for student ${studentId || userId || 'unknown'}: "${recipientEmail}"`;
      console.warn(`[EmailWorker] Skipping job ${jobId}: ${skipReason}`);

      if (placementDriveId) {
        const filterConditions = [];
        if (recipientEmail) filterConditions.push({ email: recipientEmail });
        if (targetStudentId) filterConditions.push({ student: targetStudentId });
        if (targetUserId) filterConditions.push({ user: targetUserId });

        if (filterConditions.length > 0) {
          await EmailNotificationLog.findOneAndUpdate(
            { placementDrive: placementDriveId, notificationType: type || 'PLACEMENT_DRIVE_PUBLISH', $or: filterConditions },
            {
              status: 'FAILED',
              errorMessage: 'Invalid or missing student email address in registered user account.',
              failedAt: new Date(),
              lastAttemptAt: new Date(),
              $inc: { attemptCount: 1 }
            }
          );
        }
      }
      return { skipped: true, reason: skipReason };
    }

    // 4. Duplicate Check: Skip if already recorded as SENT in MongoDB
    if (placementDriveId) {
      const logConditions = [{ email: recipientEmail }];
      if (targetStudentId) logConditions.push({ student: targetStudentId });
      if (targetUserId) logConditions.push({ user: targetUserId });

      const existingLog = await EmailNotificationLog.findOne({
        placementDrive: placementDriveId,
        notificationType: type || 'PLACEMENT_DRIVE_PUBLISH',
        $or: logConditions
      });

      if (existingLog && existingLog.status === 'SENT') {
        console.log(`[EmailWorker] Job ${jobId} skipped - already recorded as SENT in MongoDB log for ${recipientEmail}.`);
        return { skipped: true, reason: 'Already sent to this recipient' };
      }
    }

    // 5. Send Email via emailService
    let emailResult;
    try {
      emailResult = await sendDrivePublishEmail({
        studentName: recipientName,
        studentEmail: recipientEmail,
        companyName: compName,
        jobRole: drive?.jobRole || 'Campus Placement Opportunity',
        packageAmount: drive?.package || 'As per industry standards',
        academicYear: drive?.academicYear || (await getCurrentAcademicYear()),
        deadline: deadlineFormatted,
        eligibilitySummary: eligibilityText,
        roundSummary: roundsText,
        driveId: placementDriveId
      });
    } catch (sendErr) {
      const sanitizedErr = sanitizeErrorMessage(sendErr.message);
      console.error(`[EmailWorker] SMTP delivery exception for ${recipientEmail}:`, sanitizedErr);
      emailResult = {
        success: false,
        reason: sanitizedErr,
        isAuthError: isSmtpAuthOrRateLimitError(sanitizedErr)
      };
    }

    // 6. Update EmailNotificationLog in MongoDB immediately
    if (placementDriveId) {
      let logStatus = 'FAILED';
      let errorMsg = '';

      if (emailResult.skipped) {
        logStatus = 'SKIPPED';
        errorMsg = emailResult.reason || 'Skipped';
      } else if (emailResult.success) {
        logStatus = 'SENT';
      } else {
        logStatus = 'FAILED';
        if (emailResult.isAuthError) {
          errorMsg = `Gmail SMTP Auth / Rate Limit: ${emailResult.reason || 'Invalid login / too many attempts'}. Please verify Gmail App Password.`;
        } else {
          errorMsg = emailResult.reason || 'SMTP transport delivery failure';
        }
      }

      const updateData = {
        status: logStatus,
        errorMessage: errorMsg,
        lastAttemptAt: new Date(),
        $inc: { attemptCount: 1 },
        email: recipientEmail,
        ...(targetStudentId ? { student: targetStudentId } : {}),
        ...(targetUserId ? { user: targetUserId } : {}),
        ...(logStatus === 'SENT' ? { sentAt: new Date() } : {}),
        ...(logStatus === 'FAILED' ? { failedAt: new Date() } : {}),
        ...(emailResult.messageId ? { messageId: emailResult.messageId } : {})
      };

      const logConditions = [{ email: recipientEmail }];
      if (targetStudentId) logConditions.push({ student: targetStudentId });
      if (targetUserId) logConditions.push({ user: targetUserId });

      await EmailNotificationLog.findOneAndUpdate(
        {
          placementDrive: placementDriveId,
          notificationType: type || 'PLACEMENT_DRIVE_PUBLISH',
          $or: logConditions
        },
        updateData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // 7. Handle failure for BullMQ / retry policy
    if (!emailResult.success && !emailResult.skipped) {
      const failureMsg = emailResult.reason || 'Email transport delivery failed';
      console.error(`[EmailWorker] Job ${jobId} failed for recipient ${recipientEmail} (Attempt ${attemptNum}/${maxAttempts}): ${failureMsg}`);

      // If the failure is due to Gmail SMTP auth or daily rate limits (fatal), do NOT throw to avoid rapid retries that worsen the block
      if (emailResult.isAuthError || isSmtpAuthOrRateLimitError(failureMsg)) {
        console.warn(`[EmailWorker] Unrecoverable/Rate-limit SMTP error for job ${jobId}. Recorded as FAILED in MongoDB log.`);
        return { success: false, failed: true, reason: failureMsg };
      }

      // Otherwise throw for transient network retry
      throw new Error(failureMsg);
    }

    console.log(`[EmailWorker] Successfully delivered email for job ${jobId} to ${recipientEmail}`);
    return { success: true, email: recipientEmail, messageId: emailResult.messageId };
  } catch (err) {
    // Outer safety catch: Ensure MongoDB log never remains stuck in PENDING
    if (placementDriveId && (recipientEmail || targetStudentId || targetUserId)) {
      try {
        const conditions = [];
        if (recipientEmail) conditions.push({ email: recipientEmail });
        if (targetStudentId) conditions.push({ student: targetStudentId });
        if (targetUserId) conditions.push({ user: targetUserId });

        const safeMsg = sanitizeErrorMessage(err.message);
        await EmailNotificationLog.findOneAndUpdate(
          {
            placementDrive: placementDriveId,
            notificationType: type || 'PLACEMENT_DRIVE_PUBLISH',
            $or: conditions
          },
          {
            status: 'FAILED',
            errorMessage: safeMsg,
            failedAt: new Date(),
            lastAttemptAt: new Date(),
            $inc: { attemptCount: 1 }
          }
        );
      } catch (logErr) {
        console.error('[EmailWorker] Emergency log update error:', logErr.message);
      }
    }
    throw err;
  }
};

const createEmailWorker = () => {
  if (!isRedisEnabled()) {
    console.warn('[EmailWorker] Redis is disabled. Email worker will not be started.');
    return null;
  }

  console.log('[EmailWorker] STARTED');
  console.log('[EmailWorker] Redis connected');
  console.log('[EmailWorker] Waiting for email jobs');

  emailWorker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job) => {
      return await processEmailJob(job.data, {
        id: job.id,
        attemptsMade: job.attemptsMade,
        attempts: job.opts?.attempts || 3
      });
    },
    {
      connection: redisConfig,
      concurrency: CONCURRENCY
    }
  );

  emailWorker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed successfully`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed: ${sanitizeErrorMessage(err.message)}`);
  });

  emailWorker.on('error', (err) => {
    console.error('[EmailWorker Error]', sanitizeErrorMessage(err.message));
  });

  console.log(`[Worker] Email worker started with concurrency ${CONCURRENCY}`);
  return emailWorker;
};

module.exports = {
  createEmailWorker,
  getEmailWorker: () => emailWorker,
  processEmailJob
};

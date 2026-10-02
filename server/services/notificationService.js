const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const EmailNotificationLog = require('../models/EmailNotificationLog');
const { checkEligibility } = require('./eligibilityService');
const { createAuditLog } = require('./auditLogService');
const { addEmailJobsBulk, addEmailJob } = require('../queues/emailQueue');
const { addNotificationJob } = require('../queues/notificationQueue');
const { isRedisEnabled } = require('../config/redis');

const mongoose = require('mongoose');
const { isValidEmail } = require('./emailService');

/**
 * Converts PlacementDrive eligibility criteria into readable text for email template
 */
const formatEligibilitySummary = (drive) => {
  if (!drive) return 'General Eligibility Rules Apply';

  const items = [];
  const crit = drive.eligibilityCriteria;

  if (crit) {
    if (crit.minimumAcademic?.enabled) {
      const typeStr = crit.minimumAcademic.type === 'PERCENTAGE' ? '%' : ' CGPA';
      items.push(`Min Academic: ${crit.minimumAcademic.value}${typeStr}`);
    }
    if (crit.highSchool?.enabled) {
      items.push(`10th: ${crit.highSchool.minimumPercentage}%`);
    }
    if (crit.intermediate?.enabled) {
      items.push(`12th: ${crit.intermediate.minimumPercentage}%`);
    }
  } else if (drive.minCgpa !== undefined) {
    items.push(`Min CGPA: ${drive.minCgpa}`);
  }

  if (drive.maxBacklogs !== undefined) {
    items.push(`Max Backlogs: ${drive.maxBacklogs}`);
  }

  if (Array.isArray(drive.eligibleBranches) && drive.eligibleBranches.length > 0) {
    items.push(`Branches: ${drive.eligibleBranches.join(', ')}`);
  }

  return items.length > 0 ? items.join(' | ') : 'No special academic criteria specified';
};

/**
 * Converts PlacementDrive selection process into readable round list
 */
const formatSelectionProcessSummary = (drive) => {
  if (!drive) return 'Selection rounds will be announced by T&P';

  const rounds = (Array.isArray(drive.selectionProcess) && drive.selectionProcess.length > 0)
    ? drive.selectionProcess
    : (Array.isArray(drive.selectionRounds) ? drive.selectionRounds : []);

  if (rounds.length === 0) {
    return 'Selection rounds will be announced by T&P';
  }

  return rounds.map((r, i) => {
    const name = r.roundName || r.name || `Round ${i + 1}`;
    const mode = r.mode ? ` (${r.mode})` : '';
    return `${i + 1}. ${name}${mode}`;
  }).join(', ');
};

/**
 * Builds server-side MongoDB filter query based on drive audience and criteria
 */
const buildAudienceQuery = async (drive, targetAudience = null) => {
  const audienceType = (
    targetAudience ||
    drive?.targetAudience?.type ||
    drive?.notificationSettings?.targetAudience ||
    'ALL_ACTIVE_STUDENTS'
  ).toUpperCase();

  const targetSectionIds = (
    drive?.targetAudience?.sectionIds ||
    drive?.notificationSettings?.targetSections ||
    []
  ).map(id => (id?._id || id).toString());

  const query = {};

  // If ALL_ACTIVE_STUDENTS, we do not restrict section, branch, or academics.
  // The only requirement is active registered students.
  if (audienceType === 'ALL_ACTIVE_STUDENTS' || audienceType === 'ALL_ACTIVE') {
    return { query, audienceType };
  }

  // 1. Section Filter
  if (audienceType === 'SPECIFIC_SECTIONS') {
    const validObjectIds = targetSectionIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const nonObjectIds = targetSectionIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

    let finalSectionIds = [...validObjectIds];
    if (nonObjectIds.length > 0) {
      const Section = require('../models/Section');
      const matched = await Section.find({
        $or: [
          { code: { $in: nonObjectIds.map(c => c.toUpperCase()) } },
          { name: { $in: nonObjectIds } }
        ]
      }).select('_id').lean();
      finalSectionIds.push(...matched.map(s => s._id.toString()));
    }

    query.section = { $in: finalSectionIds };
  }

  // 2. Department / Branch Filter
  const eligibleBranches = Array.isArray(drive.eligibleBranches) ? drive.eligibleBranches : [];
  const normalizedBranches = eligibleBranches
    .map(b => String(b).trim())
    .filter(Boolean);

  const hasAllBranches = normalizedBranches.length === 0 || normalizedBranches.some(b => b.toUpperCase() === 'ALL');

  if (!hasAllBranches) {
    const Department = require('../models/Department');
    const deptRegexes = normalizedBranches.map(b => new RegExp(`^${b.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i'));
    const matchedDepts = await Department.find({
      $or: [
        { code: { $in: normalizedBranches.map(b => b.toUpperCase()) } },
        { name: { $in: deptRegexes } }
      ]
    }).select('_id').lean();

    const matchedDeptIds = matchedDepts.map(d => d._id);

    query.$or = [
      { department: { $in: matchedDeptIds } },
      { branch: { $in: deptRegexes } }
    ];
  }

  // 3. Academic Criteria Filter
  const crit = drive.eligibilityCriteria || {};
  const minAcademic = crit.minimumAcademic;

  if (minAcademic?.enabled) {
    const isPercentage = (minAcademic.type || '').toUpperCase() === 'PERCENTAGE';
    const targetVal = Number(minAcademic.value) || 0;
    if (targetVal > 0) {
      if (isPercentage) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { percentage: { $gte: targetVal } },
            { cgpa: { $gte: targetVal / 10 } }
          ]
        });
      } else {
        query.cgpa = { $gte: targetVal };
      }
    }
  } else if (drive.minCgpa !== undefined && drive.minCgpa !== null && Number(drive.minCgpa) > 0) {
    query.cgpa = { $gte: Number(drive.minCgpa) };
  }

  // 10th percentage
  if (crit.highSchool?.enabled) {
    const min10th = Number(crit.highSchool.minimumPercentage ?? crit.highSchool.value ?? 0);
    if (min10th > 0) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { tenthPercentage: { $gte: min10th } },
          { highSchoolPercentage: { $gte: min10th } }
        ]
      });
    }
  }

  // 12th percentage
  if (crit.intermediate?.enabled) {
    const min12th = Number(crit.intermediate.minimumPercentage ?? crit.intermediate.value ?? 0);
    if (min12th > 0) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { twelfthPercentage: { $gte: min12th } },
          { intermediatePercentage: { $gte: min12th } }
        ]
      });
    }
  }

  // Backlogs
  if (drive.maxBacklogs !== undefined && drive.maxBacklogs !== null) {
    query.backlogs = { $lte: Number(drive.maxBacklogs) };
  }

  return { query, audienceType };
};

/**
 * Determines target student audience using server-side MongoDB filtering and canonical eligibilityService
 * Database-backed: Section & Department collections are source of truth, never hardcoded.
 */
const determineAudience = async (drive, targetAudience = null) => {
  const { query, audienceType } = await buildAudienceQuery(drive, targetAudience);

  const cursor = Student.find(query)
    .select('user department section branch year cgpa tenthPercentage twelfthPercentage backlogs percentage highSchoolPercentage intermediatePercentage')
    .populate('user', 'name email status role')
    .populate('department', 'name code isActive status')
    .populate('section', 'name code isActive status')
    .lean()
    .cursor({ batchSize: 500 });

  const activeStudents = [];
  const driveObj = typeof drive.toObject === 'function' ? drive.toObject() : drive;

  for await (const student of cursor) {
    if (!student.user) continue;
    const status = (student.user.status || 'ACTIVE').toUpperCase();
    const role = (student.user.role || 'STUDENT').toUpperCase();
    if (role !== 'STUDENT' || status !== 'ACTIVE') continue;

    if (audienceType !== 'ALL_ACTIVE_STUDENTS' && audienceType !== 'ALL_ACTIVE') {
      const res = checkEligibility(student, driveObj, { ignoreDeadline: true });
      if (!res.eligible) continue;
    }

    activeStudents.push(student);
  }

  return activeStudents;
};

/**
 * Calculates matching student count without returning full payload
 */
const determineAudienceCount = async (drive, targetAudience = null) => {
  const students = await determineAudience(drive, targetAudience);
  return students.length;
};

/**
 * Enqueues placement drive notification workflow (In-app + Email) into BullMQ
 * The API returns immediately without waiting for SMTP deliveries
 * Guarantees every student receives email at their registered address via background worker
 */
const processDriveNotifications = async ({ drive, adminUser, options = {} }) => {
  try {
    const targetAudience = options.targetAudience || drive?.targetAudience?.type || drive?.notificationSettings?.targetAudience || 'ALL_ACTIVE_STUDENTS';
    const sendEmailNotification = options.sendEmailNotification !== undefined ? options.sendEmailNotification : (drive.notificationSettings?.sendEmailNotification !== false);
    const createInAppNotification = options.createInAppNotification !== undefined ? options.createInAppNotification : (drive.notificationSettings?.createInAppNotification !== false);

    const compName = drive.company?.name || drive.companyName || 'Company';
    const deadlineFormatted = drive.deadline ? new Date(drive.deadline).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) : 'N/A';

    // 1. Audit Log: Notification Queuing Started
    if (adminUser) {
      await createAuditLog({
        user: adminUser,
        actionType: 'DRIVE_NOTIFICATION_STARTED',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${compName} ${drive.jobRole}`,
        details: `Enqueuing background notifications for ${compName} drive. Email: ${sendEmailNotification}, In-App: ${createInAppNotification}, Audience: ${targetAudience}`
      });
    }

    // 2. Fetch targeted recipients using eligibility rules and section targeting
    const targetStudents = await determineAudience(drive, targetAudience);

    // 3. Enqueue In-App Notifications in chunks of 500 to notificationQueue
    if (createInAppNotification && targetStudents.length > 0) {
      const allInAppItems = [];
      for (const student of targetStudents) {
        const userId = student.user?._id || student.user;
        if (userId) {
          allInAppItems.push({
            user: userId,
            title: `New Placement Drive: ${compName}`,
            message: `${compName} has published a ${drive.jobRole} placement drive (${drive.package}). Deadline: ${deadlineFormatted}.`,
            type: 'PLACEMENT_DRIVE',
            relatedId: drive._id,
            link: '/student/eligible-drives',
            createdAt: new Date()
          });
        }
      }

      // Chunk and enqueue
      const CHUNK_SIZE = 500;
      for (let i = 0; i < allInAppItems.length; i += CHUNK_SIZE) {
        const chunk = allInAppItems.slice(i, i + CHUNK_SIZE);
        await addNotificationJob({
          type: 'BATCH_IN_APP_NOTIFICATIONS',
          driveId: drive._id,
          notifications: chunk
        });
      }

      console.log(`[Notification Service] Queued ${allInAppItems.length} in-app notifications into notificationQueue.`);
    }

    // 4. Pre-fetch existing email notification logs for this drive to prevent duplicate jobs
    const existingLogs = await EmailNotificationLog.find({
      placementDrive: drive._id,
      notificationType: 'PLACEMENT_DRIVE_PUBLISH'
    }).lean();

    const sentEmails = new Set();
    const sentStudentIds = new Set();
    const sentUserIds = new Set();

    existingLogs.forEach((log) => {
      if (log.status === 'SENT') {
        if (log.email) sentEmails.add(log.email.toLowerCase());
        if (log.student) sentStudentIds.add(log.student.toString());
        if (log.user) sentUserIds.add(log.user.toString());
      }
    });

    const emailJobsToEnqueue = [];
    const pendingLogOps = [];

    if (sendEmailNotification) {
      for (const student of targetStudents) {
        const studentUser = student.user;
        const userId = studentUser?._id || studentUser;
        const studentName = studentUser?.name || 'Student';
        const studentEmail = (studentUser?.email || student.email || '').trim().toLowerCase();

        if (!userId) continue;

        // Skip if already sent to this recipient
        if ((studentEmail && sentEmails.has(studentEmail)) ||
            (student._id && sentStudentIds.has(student._id.toString())) ||
            (userId && sentUserIds.has(userId.toString()))) {
          continue;
        }

        // Test 7 Requirement: Handle student with no valid email address
        if (!studentEmail || !isValidEmail(studentEmail)) {
          pendingLogOps.push({
            updateOne: {
              filter: {
                placementDrive: drive._id,
                notificationType: 'PLACEMENT_DRIVE_PUBLISH',
                user: userId
              },
              update: {
                $set: {
                  placementDrive: drive._id,
                  student: student._id || null,
                  user: userId,
                  email: studentEmail || 'invalid@missing.email',
                  notificationType: 'PLACEMENT_DRIVE_PUBLISH',
                  status: 'FAILED',
                  errorMessage: 'Invalid or missing student email address in registered user account.',
                  failedAt: new Date(),
                  lastAttemptAt: new Date()
                },
                $inc: { attemptCount: 1 }
              },
              upsert: true
            }
          });
          continue; // Skip queuing in BullMQ, other students continue normally
        }

        // Prepare BullMQ email job
        emailJobsToEnqueue.push({
          data: {
            type: 'PLACEMENT_DRIVE_PUBLISH',
            placementDriveId: drive._id.toString(),
            studentId: student._id ? student._id.toString() : null,
            userId: userId.toString(),
            email: studentEmail,
            studentName,
            companyName: compName
          },
          opts: {
            // Deduplicate via custom Job ID
            jobId: `email_pub_${drive._id}_${student._id || userId || studentEmail}`
          }
        });

        // Initialize PENDING log in MongoDB via bulkWrite
        pendingLogOps.push({
          updateOne: {
            filter: {
              placementDrive: drive._id,
              notificationType: 'PLACEMENT_DRIVE_PUBLISH',
              user: userId
            },
            update: {
              $setOnInsert: {
                placementDrive: drive._id,
                student: student._id || null,
                user: userId,
                email: studentEmail,
                notificationType: 'PLACEMENT_DRIVE_PUBLISH',
                status: 'PENDING',
                attemptCount: 0,
                lastAttemptAt: new Date()
              }
            },
            upsert: true
          }
        });
      }

      // 5. Bulk record PENDING logs in MongoDB in batches of 500
      if (pendingLogOps.length > 0) {
        const LOG_CHUNK_SIZE = 500;
        for (let i = 0; i < pendingLogOps.length; i += LOG_CHUNK_SIZE) {
          const chunk = pendingLogOps.slice(i, i + LOG_CHUNK_SIZE);
          await EmailNotificationLog.bulkWrite(chunk, { ordered: false });
        }
      }

      // 6. Bulk enqueue email jobs into BullMQ
      if (emailJobsToEnqueue.length > 0) {
        const JOB_CHUNK_SIZE = 500;
        for (let i = 0; i < emailJobsToEnqueue.length; i += JOB_CHUNK_SIZE) {
          const chunk = emailJobsToEnqueue.slice(i, i + JOB_CHUNK_SIZE);
          await addEmailJobsBulk(chunk);
        }
        console.log(`[Notification Service] Enqueued ${emailJobsToEnqueue.length} email jobs into emailQueue.`);
      }
    }

    // 7. Audit Log: Queuing Completed
    if (adminUser) {
      await createAuditLog({
        user: adminUser,
        actionType: 'DRIVE_NOTIFICATION_QUEUED',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${compName} ${drive.jobRole}`,
        details: `Successfully enqueued background jobs. Total Recipients: ${targetStudents.length}, Email Jobs Queued: ${emailJobsToEnqueue.length}`
      });
    }

    return {
      success: true,
      totalRecipients: targetStudents.length,
      emailJobsQueued: emailJobsToEnqueue.length,
      inAppNotificationsQueued: createInAppNotification ? targetStudents.length : 0
    };
  } catch (error) {
    console.error('[Notification Service Error]', error);
    throw error;
  }
};

/**
 * Retries sending emails ONLY to failed records for a Placement Drive by re-enqueuing into BullMQ
 */
const retryFailedEmails = async (driveId, adminUser) => {
  try {
    if (!isRedisEnabled()) {
      throw new Error('Redis is not enabled or connection is unavailable.');
    }

    const PlacementDrive = require('../models/PlacementDrive');
    const drive = await PlacementDrive.findById(driveId).populate('company');
    if (!drive) throw new Error('Placement drive not found.');

    const failedLogs = await EmailNotificationLog.find({
      placementDrive: driveId,
      status: 'FAILED'
    }).populate({
      path: 'student',
      populate: { path: 'user' }
    }).populate('user');

    if (failedLogs.length === 0) {
      return {
        message: 'No failed email records found to retry.',
        retried: 0
      };
    }

    const compName = drive.company?.name || drive.companyName || 'Company';
    const emailJobs = [];

    for (const log of failedLogs) {
      const studentObj = log.student;
      const userObj = studentObj?.user || log.user;
      const studentEmail = (log.email || userObj?.email || '').trim().toLowerCase();
      const studentName = userObj?.name || 'Student';

      // Reset log status to PENDING for retry
      log.status = 'PENDING';
      log.errorMessage = 'Retry queued';
      await log.save();

      emailJobs.push({
        data: {
          type: 'PLACEMENT_DRIVE_PUBLISH',
          placementDriveId: drive._id.toString(),
          studentId: studentObj?._id ? studentObj._id.toString() : null,
          userId: userObj?._id ? userObj._id.toString() : null,
          email: studentEmail,
          studentName,
          companyName: compName
        },
        opts: {
          // Unique job ID per retry attempt timestamp to bypass previous BullMQ completed/failed entry
          jobId: `email_retry_${log._id}_${Date.now()}`
        }
      });
    }

    if (emailJobs.length > 0) {
      await addEmailJobsBulk(emailJobs);
      console.log(`[Notification Service] Re-enqueued ${emailJobs.length} retry jobs into emailQueue.`);
    }

    if (adminUser) {
      await createAuditLog({
        user: adminUser,
        actionType: 'EMAIL_RETRY_QUEUED',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${compName} ${drive.jobRole}`,
        details: `Queued ${failedLogs.length} failed emails for background retry.`
      });
    }

    return {
      message: `Enqueued ${failedLogs.length} failed emails for retry.`,
      retried: failedLogs.length
    };
  } catch (error) {
    console.error('[Retry Failed Emails Error]', error);
    throw error;
  }
};

/**
 * Gets aggregated notification status metrics and per-recipient details for a placement drive
 */
const getNotificationStatus = async (driveId) => {
  const PlacementDrive = require('../models/PlacementDrive');
  const drive = await PlacementDrive.findById(driveId).lean();

  const logs = await EmailNotificationLog.find({ placementDrive: driveId })
    .populate({
      path: 'student',
      populate: { path: 'user', select: 'name email' }
    })
    .populate('user', 'name email')
    .lean();

  const totalRecipients = logs.length;
  const sent = logs.filter(l => l.status === 'SENT').length;
  const failed = logs.filter(l => l.status === 'FAILED').length;
  const pending = logs.filter(l => l.status === 'PENDING').length;
  const skipped = logs.filter(l => l.status === 'SKIPPED').length;

  let matchingStudentsCount = totalRecipients;
  if (drive && drive.status !== 'PUBLISHED') {
    const audience = await determineAudience(drive);
    matchingStudentsCount = audience.length;
  }

  const recipients = logs.map(log => ({
    logId: log._id,
    studentId: log.student?._id || null,
    userId: log.user?._id || log.student?.user?._id || null,
    studentName: log.user?.name || log.student?.user?.name || 'Student',
    email: log.email || log.user?.email || log.student?.user?.email || '',
    status: log.status,
    sentAt: log.sentAt,
    failedAt: log.failedAt,
    errorMessage: log.errorMessage,
    attemptCount: log.attemptCount,
    lastAttemptAt: log.lastAttemptAt
  }));

  return {
    targetAudience: drive?.targetAudience?.type || drive?.notificationSettings?.targetAudience || 'ALL_ACTIVE_STUDENTS',
    matchingStudentsCount,
    totalRecipients,
    sent,
    failed,
    pending,
    skipped,
    recipients
  };
};

/**
 * Centralized helper to create in-app notification via BullMQ queue if Redis is active
 * or fallback directly to MongoDB Notification.create
 */
const createNotification = async ({ user, title, message, type = 'GENERAL', relatedId = null, link = '' }) => {
  if (isRedisEnabled()) {
    try {
      await addNotificationJob({
        type: 'SINGLE_IN_APP_NOTIFICATION',
        user: (user?._id || user).toString(),
        title,
        message,
        notificationType: type,
        relatedId: relatedId ? relatedId.toString() : null,
        link: link || '',
        createdAt: new Date()
      });
      return;
    } catch (e) {
      console.warn('[Notification Service] Redis enqueue failed, falling back to direct DB write:', e.message);
    }
  }

  return await Notification.create({
    user: user?._id || user,
    title,
    message,
    type,
    relatedId,
    link
  });
};

module.exports = {
  formatEligibilitySummary,
  formatSelectionProcessSummary,
  buildAudienceQuery,
  determineAudience,
  determineAudienceCount,
  processDriveNotifications,
  retryFailedEmails,
  getNotificationStatus,
  createNotification
};

const AcademicYear = require('../models/AcademicYear');
const { createAuditLog } = require('./auditLogService');

let cachedCurrentYear = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds in-memory cache

/**
 * Dynamically computes academic year string based on current calendar cycle (July-June)
 */
const getCalendarAcademicYear = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 is January, 6 is July
  return month >= 6 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
};

/**
 * Ensures baseline academic year exists in database if collection is empty
 */
const ensureBaselineAcademicYears = async () => {
  try {
    const count = await AcademicYear.countDocuments();
    // Only initialize an initial academic year if the collection is GENUINELY EMPTY (0 records)
    // on a fresh database. Once academic years exist, NEVER automatically resurrect deleted years!
    if (count === 0) {
      const initialYear = getCalendarAcademicYear();
      await AcademicYear.create({
        year: initialYear,
        isCurrent: true,
        status: 'ACTIVE',
        description: 'Initial Active Academic Year'
      });
      console.log(`[AcademicYearService] Initialized default active academic year (${initialYear})`);
    }
  } catch (err) {
    if (err.code !== 11000) {
      console.error('[AcademicYearService ensureBaseline error]', err.message);
    }
  }
};

/**
 * Returns the current active academic year string (e.g. '2026-27')
 */
const getCurrentAcademicYear = async () => {
  const now = Date.now();
  if (cachedCurrentYear && (now - lastCacheTime < CACHE_TTL_MS)) {
    return cachedCurrentYear;
  }

  try {
    let currentDoc = await AcademicYear.findOne({ isCurrent: true }).lean();
    if (!currentDoc) {
      await ensureBaselineAcademicYears();
      currentDoc = await AcademicYear.findOne({ isCurrent: true }).lean();
    }
    if (!currentDoc) {
      const fallback = await AcademicYear.findOne().sort({ year: -1 });
      if (fallback) {
        fallback.isCurrent = true;
        await fallback.save();
        currentDoc = fallback.toObject();
      }
    }

    if (currentDoc && currentDoc.year) {
      cachedCurrentYear = currentDoc.year;
      lastCacheTime = now;
      return cachedCurrentYear;
    }
  } catch (err) {
    console.error('[AcademicYearService getCurrentAcademicYear error]', err.message);
  }

  return getCalendarAcademicYear();
};

/**
 * Returns full details of the current academic year document
 */
const getCurrentAcademicYearDoc = async () => {
  let doc = await AcademicYear.findOne({ isCurrent: true }).lean();
  if (!doc) {
    await ensureBaselineAcademicYears();
    doc = await AcademicYear.findOne({ isCurrent: true }).lean();
  }
  if (!doc) {
    const fallback = await AcademicYear.findOne().sort({ year: -1 });
    if (fallback) {
      fallback.isCurrent = true;
      await fallback.save();
      doc = fallback.toObject();
    }
  }
  return doc;
};

/**
 * Returns all academic years sorted descending by year
 */
const getAllAcademicYears = async () => {
  await ensureBaselineAcademicYears();
  return await AcademicYear.find().sort({ year: -1 }).lean();
};

/**
 * Creates a new academic year
 */
const createAcademicYear = async ({ year, isCurrent = false, status = 'ACTIVE', description = '', user = null }) => {
  const cleanYear = (year || '').trim();
  if (!cleanYear) {
    throw new Error('Academic year string is required (e.g. 2026-27)');
  }

  // Format validation: e.g. 2026-27, 2025-26, 2027-28
  const yearPattern = /^\d{4}-\d{2,4}$/;
  if (!yearPattern.test(cleanYear)) {
    throw new Error('Invalid academic year format. Expected YYYY-YY (e.g. 2026-27)');
  }

  const existing = await AcademicYear.findOne({ year: cleanYear });
  if (existing) {
    throw new Error(`Academic Year ${cleanYear} already exists.`);
  }

  // If marked as current, unset existing current
  if (isCurrent) {
    await AcademicYear.updateMany({}, { isCurrent: false });
    cachedCurrentYear = cleanYear;
    lastCacheTime = Date.now();
  }

  const newYearDoc = await AcademicYear.create({
    year: cleanYear,
    isCurrent: Boolean(isCurrent),
    status,
    description: description ? description.trim() : '',
    createdBy: user?._id || null
  });

  if (user) {
    await createAuditLog({
      user,
      actionType: 'CREATE',
      targetEntity: 'Admin',
      targetId: newYearDoc._id,
      targetName: `Academic Year ${cleanYear}`,
      details: `Admin created academic year ${cleanYear} (isCurrent: ${isCurrent})`
    });
  }

  return newYearDoc;
};

/**
 * Sets an existing academic year as CURRENT.
 * CRITICAL SAFETY: Does NOT migrate, modify, or delete any historical records!
 */
const setCurrentAcademicYear = async (idOrYear, user = null) => {
  let targetDoc = null;
  if (typeof idOrYear === 'string' && /^[0-9a-fA-F]{24}$/.test(idOrYear)) {
    targetDoc = await AcademicYear.findById(idOrYear);
  }
  if (!targetDoc) {
    targetDoc = await AcademicYear.findOne({ year: String(idOrYear).trim() });
  }

  if (!targetDoc) {
    throw new Error(`Academic Year '${idOrYear}' not found.`);
  }

  // Atomically unset isCurrent for all other academic years
  await AcademicYear.updateMany(
    { _id: { $ne: targetDoc._id } },
    { $set: { isCurrent: false } }
  );

  // Atomically mark target academic year as current
  await AcademicYear.updateOne(
    { _id: targetDoc._id },
    { $set: { isCurrent: true, status: 'ACTIVE' } }
  );

  targetDoc.isCurrent = true;
  targetDoc.status = 'ACTIVE';

  cachedCurrentYear = targetDoc.year;
  lastCacheTime = Date.now();

  if (user) {
    await createAuditLog({
      user,
      actionType: 'UPDATE',
      targetEntity: 'Admin',
      targetId: targetDoc._id,
      targetName: `Academic Year ${targetDoc.year}`,
      details: `Admin set Academic Year ${targetDoc.year} as the system CURRENT academic year.`
    });
  }

  return targetDoc;
};

/**
 * Deletes all year-specific records belonging to a historical academic year.
 * CRITICAL SAFETY RULES:
 * 1. Strictly forbidden on CURRENT active academic year (both DB check & active cache check).
 * 2. Requires SUPER_ADMIN role.
 * 3. Requires explicit confirmation with reason and matching year name.
 * 4. Year-scoped deletion only: NEVER deletes global company master records or audit logs.
 * 5. Logs detailed audit log with deleted counts.
 */
const deleteAcademicYearData = async ({ yearOrId, reason, confirmYear, user }) => {
  const userRole = (user?.role || '').toUpperCase();
  if (userRole !== 'SUPER_ADMIN') {
    const err = new Error('Access denied. Only Super Administrators can delete historical academic year data.');
    err.statusCode = 403;
    throw err;
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    const err = new Error('A valid deletion reason (at least 5 characters) is required for audit compliance.');
    err.statusCode = 400;
    throw err;
  }

  let targetDoc = null;
  if (typeof yearOrId === 'string' && /^[0-9a-fA-F]{24}$/.test(yearOrId)) {
    targetDoc = await AcademicYear.findById(yearOrId);
  }
  if (!targetDoc) {
    targetDoc = await AcademicYear.findOne({ year: String(yearOrId).trim() });
  }

  if (!targetDoc) {
    const err = new Error(`Academic Year '${yearOrId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const targetYear = targetDoc.year;

  if (confirmYear !== targetYear) {
    const err = new Error(`Confirmation mismatch. Expected '${targetYear}', received '${confirmYear}'.`);
    err.statusCode = 400;
    throw err;
  }

  // CRITICAL SAFETY CHECK: NEVER DELETE CURRENT ACTIVE YEAR
  // Re-verify against database directly to prevent stale cache or stale client state
  const currentActiveDoc = await AcademicYear.findOne({ isCurrent: true }).lean();
  const currentActiveYear = currentActiveDoc ? currentActiveDoc.year : await getCurrentAcademicYear();
  if (targetDoc.isCurrent || targetYear === currentActiveYear) {
    const err = new Error('Current academic year cannot be deleted. Switch to another academic year before cleanup.');
    err.statusCode = 400;
    throw err;
  }

  // Lazy-load required models for year-scoped data deletion
  const mongoose = require('mongoose');
  const Student = require('../models/Student');
  const User = require('../models/User');
  const PlacementDrive = require('../models/PlacementDrive');
  const Application = require('../models/Application');
  const InterviewResult = require('../models/InterviewResult');
  const MockTest = require('../models/MockTest');
  const MockResult = require('../models/MockResult');
  const Question = require('../models/Question');
  const InterviewExperience = require('../models/InterviewExperience');
  const Section = require('../models/Section');
  const Department = require('../models/Department');
  const Announcement = require('../models/Announcement');
  const Notification = require('../models/Notification');
  const EmailNotificationLog = require('../models/EmailNotificationLog');
  const Resume = require('../models/Resume');
  const ResumeAnalysis = require('../models/ResumeAnalysis');
  const PreparationRoadmap = require('../models/PreparationRoadmap');

  // Attempt transaction where supported (e.g. MongoDB replica set / sharded cluster); fallback gracefully for standalone
  let session = null;
  let useTransaction = false;
  const topologyType = mongoose.connection?.client?.topology?.description?.type;
  const isReplicaSet = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

  if (isReplicaSet) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch (sessErr) {
      if (session) {
        await session.endSession().catch(() => {});
        session = null;
      }
      console.warn('[AcademicYearService] Could not start MongoDB transaction:', sessErr.message);
    }
  }

  const sessionOpt = useTransaction && session ? { session } : {};

  try {
    // Query year-scoped references
    const students = await Student.find({ academicYear: targetYear }, null, sessionOpt).select('_id user').lean();
    const studentIds = students.map((s) => s._id);
    const studentUserIds = students.map((s) => s.user).filter(Boolean);

    const drives = await PlacementDrive.find({ academicYear: targetYear }, null, sessionOpt).select('_id').lean();
    const driveIds = drives.map((d) => d._id);

    const mockTests = await MockTest.find({ academicYear: targetYear }, null, sessionOpt).select('_id').lean();
    const mockTestIds = mockTests.map((m) => m._id);

    // Safe year-scoped deletion
    const [
      delApps,
      delResults,
      delMockResults,
      delMockTests,
      delDrives,
      delQuestions,
      delExperiences,
      delSections,
      delDepartments,
      delAnnouncements,
      delNotifications,
      delEmailLogs,
      delResumes,
      delResumeAnalyses,
      delRoadmaps,
      delStudents,
      delStudentUsers,
      delYear
    ] = await Promise.all([
      Application.deleteMany(
        {
          $or: [
            { academicYear: targetYear },
            { drive: { $in: driveIds } },
            { student: { $in: studentIds } }
          ]
        },
        sessionOpt
      ),
      InterviewResult.deleteMany(
        {
          $or: [
            { academicYear: targetYear },
            { drive: { $in: driveIds } },
            { student: { $in: studentIds } }
          ]
        },
        sessionOpt
      ),
      MockResult.deleteMany(
        {
          $or: [
            { academicYear: targetYear },
            { mockTest: { $in: mockTestIds } },
            { student: { $in: studentIds } }
          ]
        },
        sessionOpt
      ),
      MockTest.deleteMany({ academicYear: targetYear }, sessionOpt),
      PlacementDrive.deleteMany({ academicYear: targetYear }, sessionOpt),
      Question.deleteMany({ academicYear: targetYear }, sessionOpt),
      InterviewExperience.deleteMany(
        {
          $or: [
            { academicYear: targetYear },
            { student: { $in: studentIds } }
          ]
        },
        sessionOpt
      ),
      Section.deleteMany({ academicYear: targetYear }, sessionOpt),
      Department.deleteMany({ academicYear: targetYear }, sessionOpt),
      Announcement.deleteMany({ academicYear: targetYear }, sessionOpt),
      Notification.deleteMany(
        {
          $or: [
            { academicYear: targetYear },
            { user: { $in: studentUserIds } }
          ]
        },
        sessionOpt
      ),
      EmailNotificationLog.deleteMany(
        {
          $or: [
            { placementDrive: { $in: driveIds } },
            { student: { $in: studentIds } },
            { user: { $in: studentUserIds } }
          ]
        },
        sessionOpt
      ),
      Resume.deleteMany({ user: { $in: studentUserIds } }, sessionOpt),
      ResumeAnalysis.deleteMany(
        {
          $or: [
            { student: { $in: studentIds } },
            { user: { $in: studentUserIds } }
          ]
        },
        sessionOpt
      ),
      PreparationRoadmap.deleteMany({ student: { $in: studentIds } }, sessionOpt),
      Student.deleteMany({ academicYear: targetYear }, sessionOpt),
      User.deleteMany({ _id: { $in: studentUserIds }, role: 'STUDENT' }, sessionOpt),
      AcademicYear.deleteOne({ _id: targetDoc._id }, sessionOpt)
    ]);

    // Commit transaction if active
    if (useTransaction && session) {
      await session.commitTransaction();
    }

    // Invalidate year cache
    cachedCurrentYear = null;
    lastCacheTime = 0;

    // Summary counts
    const summary = {
      academicYear: targetYear,
      studentsDeleted: delStudents.deletedCount || 0,
      studentUsersDeleted: delStudentUsers.deletedCount || 0,
      drivesDeleted: delDrives.deletedCount || 0,
      applicationsDeleted: delApps.deletedCount || 0,
      interviewResultsDeleted: delResults.deletedCount || 0,
      mockTestsDeleted: delMockTests.deletedCount || 0,
      mockResultsDeleted: delMockResults.deletedCount || 0,
      questionsDeleted: delQuestions.deletedCount || 0,
      experiencesDeleted: delExperiences.deletedCount || 0,
      sectionsDeleted: delSections.deletedCount || 0,
      departmentsDeleted: delDepartments.deletedCount || 0,
      announcementsDeleted: delAnnouncements.deletedCount || 0,
      notificationsDeleted: delNotifications.deletedCount || 0,
      emailLogsDeleted: delEmailLogs.deletedCount || 0,
      resumesDeleted: delResumes.deletedCount || 0,
      transactionCommitted: useTransaction
    };

    // AUDIT LOGGING: Record event for administrative compliance (preserved outside transaction)
    await createAuditLog({
      user,
      actionType: 'DELETE_ACADEMIC_YEAR_DATA',
      targetEntity: 'Academic Year',
      targetId: targetDoc._id,
      targetName: `Academic Year ${targetYear}`,
      details: `[Super Admin Cleanup] Deleted Academic Year ${targetYear} and all year-scoped records. Reason: ${reason.trim()} | Summary: Students: ${summary.studentsDeleted}, Drives: ${summary.drivesDeleted}, Apps: ${summary.applicationsDeleted}, MockTests: ${summary.mockTestsDeleted}, Results: ${summary.interviewResultsDeleted}, Experiences: ${summary.experiencesDeleted}, Questions: ${summary.questionsDeleted}, Sections: ${summary.sectionsDeleted}, Departments: ${summary.departmentsDeleted}`
    });

    return summary;
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction().catch(() => {});
    }
    console.error('[AcademicYearService deleteAcademicYearData Error]', error);
    throw error;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
};

module.exports = {
  getCurrentAcademicYear,
  getCurrentAcademicYearDoc,
  getAllAcademicYears,
  createAcademicYear,
  setCurrentAcademicYear,
  deleteAcademicYearData,
  ensureBaselineAcademicYears
};

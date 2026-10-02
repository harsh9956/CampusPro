const { getCurrentAcademicYear } = require('../services/academicYearService');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Check dynamically whether a given academic year is the current academic year.
 * Dynamic and never hardcoded.
 * @param {string} selectedYear
 * @returns {Promise<boolean>}
 */
const isCurrentAcademicYear = async (selectedYear) => {
  if (!selectedYear || selectedYear === 'ALL') return true;
  const currentYear = await getCurrentAcademicYear();
  return String(selectedYear).trim() === String(currentYear).trim();
};

/**
 * Centralized Permission Rule for Academic Year Operations:
 * 
 * - CURRENT ACADEMIC YEAR:
 *   Normal ADMIN, Faculty, and Students have full existing functionality.
 *   Admin can Create, Edit, Delete, Update, Approve/Reject current-year data.
 * 
 * - HISTORICAL ACADEMIC YEAR:
 *   Normal ADMIN is STRICTLY READ-ONLY for year-scoped data.
 *   Admin CAN view, search, filter, paginate, and export historical records to Excel.
 *   Admin CANNOT create, edit, update, delete, approve, reject, or modify any historical record.
 *   Attempts by normal Admin to modify historical data MUST return:
 *   HTTP 403 Forbidden with code 'HISTORICAL_YEAR_READ_ONLY'.
 * 
 * - SUPER ADMIN COMPATIBILITY:
 *   SUPER_ADMIN has elevated institutional privileges for historical database cleanup/maintenance.
 *   Super Admin cleanup is strictly year-scoped and CANNOT delete the current active academic year.
 */
const checkHistoricalOperation = async (req, targetAcademicYear, entityType = 'Record') => {
  const currentYear = await getCurrentAcademicYear();
  const yearToCheck = targetAcademicYear || req.body?.academicYear || req.query?.academicYear;

  const isHistorical = Boolean(
    yearToCheck &&
    yearToCheck !== 'ALL' &&
    String(yearToCheck).trim() !== String(currentYear).trim()
  );

  if (!isHistorical) {
    // Current year normal operation - proceed as usual
    return {
      isHistorical: false,
      allowed: true,
      currentYear
    };
  }

  // Historical academic year data is strictly read-only for all normal operational CRUD.
  // Neither Admin nor Super Admin can perform individual operational edits or mutations on historical records.
  // Super Admin performs institutional cleanup exclusively via the dedicated year cleanup endpoint.
  return {
    isHistorical: true,
    allowed: false,
    status: 403,
    code: 'HISTORICAL_YEAR_READ_ONLY',
    isHistoricalReadOnly: true,
    message: 'Historical academic year data is read-only for Admin. Select the current academic year to modify data.'
  };
};

/**
 * Centralized assert helper for controller use
 */
const assertCurrentAcademicYearForAdmin = async (req, targetAcademicYear, entityType = 'Record') => {
  return await checkHistoricalOperation(req, targetAcademicYear, entityType);
};

/**
 * Express middleware helper to enforce historical read-only protection
 */
const enforceHistoricalReadOnly = (getYearFn, entityType = 'Record') => async (req, res, next) => {
  try {
    const targetYear = typeof getYearFn === 'function'
      ? await getYearFn(req)
      : (req.body?.academicYear || req.query?.academicYear);

    if (!targetYear) return next();

    const check = await checkHistoricalOperation(req, targetYear, entityType);
    if (!check.allowed) {
      return res.status(check.status || 403).json({
        code: check.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: check.message,
        isHistoricalReadOnly: true
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to log historical management actions to AuditLog (e.g. for Super Admin)
 */
const logHistoricalAudit = async ({ req, actionType, targetEntity, targetId, targetName, academicYear, reason, details }) => {
  if (!req.user) return null;
  const fullDetails = [
    `[Historical Management] Academic Year: ${academicYear}`,
    reason ? `Reason: ${reason}` : '',
    details ? `Details: ${details}` : ''
  ].filter(Boolean).join(' | ');

  return await createAuditLog({
    user: req.user,
    actionType: actionType || 'UPDATE',
    targetEntity: targetEntity || 'Record',
    targetId: targetId || null,
    targetName: targetName || '',
    details: fullDetails,
    status: 'SUCCESS'
  });
};

module.exports = {
  isCurrentAcademicYear,
  checkHistoricalOperation,
  assertCurrentAcademicYearForAdmin,
  enforceHistoricalReadOnly,
  logHistoricalAudit
};

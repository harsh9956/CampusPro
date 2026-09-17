const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry safely without interrupting main business logic.
 * @param {Object} params
 * @param {Object|String} params.user - User object (req.user) or User ObjectId
 * @param {String} params.actionType - CREATE, UPDATE, DELETE, PUBLISH, UNPUBLISH, EXPORT, UPLOAD, LOGIN
 * @param {String} params.targetEntity - Company, Placement Drive, Application, Mock Test, Question, Interview, Result, Student, JD, Interview Experience
 * @param {String|Object} [params.targetId] - Target ObjectId
 * @param {String} [params.targetName] - Human-readable name or title
 * @param {String} [params.details] - Detailed description of action
 * @param {String} [params.status='SUCCESS'] - SUCCESS or FAILED
 */
const createAuditLog = async ({
  user,
  actionType,
  targetEntity,
  targetId = null,
  targetName = '',
  details = '',
  status = 'SUCCESS'
}) => {
  try {
    if (!user) return null;

    let userId = null;
    let userRole = 'ADMIN';

    if (typeof user === 'object' && user._id) {
      userId = user._id;
      userRole = (user.role || 'ADMIN').toUpperCase();
    } else {
      userId = user;
    }

    const log = await AuditLog.create({
      performedBy: userId,
      role: userRole,
      actionType,
      targetEntity,
      targetId: targetId || null,
      targetName: targetName || '',
      details: details || '',
      status: status || 'SUCCESS'
    });

    return log;
  } catch (error) {
    // Error handling rule: Log the audit error on server console, do not throw or break main operation
    console.error('[Audit Log Service Error]', error.message);
    return null;
  }
};

module.exports = { createAuditLog };

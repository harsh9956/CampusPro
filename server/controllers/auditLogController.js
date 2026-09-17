const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

// @desc    Get paginated, filtered TPO audit logs (Admin only)
// @route   GET /api/audit-logs
// @access  Private (Admin only)
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      actionType,
      targetEntity,
      dateRange,
      startDate,
      endDate
    } = req.query;

    let query = {};

    // Filter by Role
    if (role && role.toUpperCase() !== 'ALL') {
      const formattedRole = role.toUpperCase();
      if (formattedRole === 'TPO ADMIN' || formattedRole === 'ADMIN') {
        query.role = { $in: ['ADMIN', 'admin'] };
      } else if (formattedRole === 'FACULTY') {
        query.role = { $in: ['FACULTY', 'faculty'] };
      } else {
        query.role = new RegExp(`^${role}$`, 'i');
      }
    }

    // Filter by Action Type
    if (actionType && actionType.toUpperCase() !== 'ALL') {
      query.actionType = actionType.toUpperCase();
    }

    // Filter by Target Entity
    if (targetEntity && targetEntity.toUpperCase() !== 'ALL') {
      query.targetEntity = new RegExp(`^${targetEntity}$`, 'i');
    }

    // Filter by Date Range
    if (dateRange && dateRange.toUpperCase() !== 'ALL') {
      const now = new Date();
      if (dateRange === 'Today') {
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        query.createdAt = { $gte: startOfToday };
      } else if (dateRange === 'Last 7 Days') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: sevenDaysAgo };
      } else if (dateRange === 'Last 30 Days') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: thirtyDaysAgo };
      } else if (dateRange === 'Custom Range' || startDate || endDate) {
        let dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateFilter.$lte = end;
        }
        if (Object.keys(dateFilter).length > 0) {
          query.createdAt = dateFilter;
        }
      }
    } else if (startDate || endDate) {
      let dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }
    }

    // Free Text Search
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const searchRegex = new RegExp(cleanSearch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');

      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);

      const searchOr = [
        { targetName: searchRegex },
        { details: searchRegex },
        { actionType: searchRegex },
        { targetEntity: searchRegex },
        { role: searchRegex }
      ];

      if (userIds.length > 0) {
        searchOr.push({ performedBy: { $in: userIds } });
      }

      query.$and = query.$and || [];
      query.$and.push({ $or: searchOr });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      limit: limitNum,
      data: logs
    });
  } catch (error) {
    console.error('[Get Audit Logs Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single audit log by ID
// @route   GET /api/audit-logs/:id
// @access  Private (Admin only)
const getAuditLogById = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('performedBy', 'name email role avatar');
    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log entry not found.' });
    }
    res.json({ success: true, data: log });
  } catch (error) {
    console.error('[Get Audit Log By ID Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById
};

const mongoose = require('mongoose');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Section = require('../models/Section');

// Helper to safely coerce string and escape regex special characters
const cleanString = (val) => (typeof val === 'string' ? val.trim() : '');
const escapeRegex = (str) => (str ? String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

/**
 * Build dynamic query for student directory filtering safely
 */
const buildStudentFilterQuery = async (queryObj = {}, currentUser = null) => {
  const department = cleanString(queryObj.department);
  const section = cleanString(queryObj.section);
  const academicYear = cleanString(queryObj.academicYear);
  const backlogs = cleanString(queryObj.backlogs);
  const status = cleanString(queryObj.status);
  const search = cleanString(queryObj.search);
  const enrollmentNoPrefix = cleanString(queryObj.enrollmentNoPrefix);

  const minCgpa = queryObj.minCgpa;
  const maxCgpa = queryObj.maxCgpa;

  const conditions = [];

  // Special prefix condition for tests / programmatic queries
  if (enrollmentNoPrefix) {
    conditions.push({ enrollmentNo: new RegExp(`^${escapeRegex(enrollmentNoPrefix)}`, 'i') });
  }

  // 1. Department Filter
  let deptId = department;
  // If user is Faculty, automatically enforce faculty's assigned department
  if (currentUser && currentUser.role === 'FACULTY') {
    const facultyDoc = await Faculty.findOne({ user: currentUser._id });
    if (facultyDoc && facultyDoc.department) {
      deptId = facultyDoc.department.toString();
    }
  }

  if (deptId && deptId !== 'ALL') {
    if (mongoose.Types.ObjectId.isValid(deptId)) {
      conditions.push({ department: new mongoose.Types.ObjectId(deptId) });
    } else {
      const deptDoc = await Department.findOne({
        $or: [
          { code: new RegExp(`^${escapeRegex(deptId)}$`, 'i') },
          { name: new RegExp(`^${escapeRegex(deptId)}$`, 'i') }
        ]
      });
      if (deptDoc) {
        conditions.push({ $or: [{ department: deptDoc._id }, { department: deptId }] });
      } else {
        conditions.push({ department: deptId });
      }
    }
  }

  // 2. Section Filter
  if (section && section !== 'ALL') {
    if (mongoose.Types.ObjectId.isValid(section)) {
      conditions.push({ section: new mongoose.Types.ObjectId(section) });
    } else {
      const secDoc = await Section.findOne({
        $or: [
          { code: new RegExp(`^${escapeRegex(section)}$`, 'i') },
          { name: new RegExp(`^${escapeRegex(section)}$`, 'i') }
        ]
      });
      if (secDoc) {
        conditions.push({ $or: [{ section: secDoc._id }, { section: section }] });
      } else {
        conditions.push({ section: section });
      }
    }
  }

  // 3. CGPA Filter
  if (minCgpa !== undefined && minCgpa !== '' && minCgpa !== '0') {
    const num = parseFloat(minCgpa);
    if (!isNaN(num)) {
      conditions.push({ cgpa: { $gte: num } });
    }
  }
  if (maxCgpa !== undefined && maxCgpa !== '' && maxCgpa !== '10') {
    const num = parseFloat(maxCgpa);
    if (!isNaN(num)) {
      conditions.push({ cgpa: { $lte: num } });
    }
  }

  // 4. Academic Year
  if (academicYear && academicYear !== 'ALL') {
    conditions.push({ academicYear: academicYear });
  }

  // 5. Backlogs Filter
  if (backlogs && backlogs !== 'ALL') {
    if (backlogs === '0' || backlogs === 'none' || backlogs === 'no') {
      conditions.push({ backlogs: 0 });
    } else if (backlogs === 'has' || backlogs === 'active') {
      conditions.push({ backlogs: { $gt: 0 } });
    }
  }

  // 6. User Status Filter (ACTIVE, INACTIVE, BLOCKED)
  if (status && status !== 'ALL') {
    const formattedStatus = status.toUpperCase();
    if (formattedStatus === 'ACTIVE') {
      // Invert query: filter out inactive/blocked users (tiny subset) instead of pulling 10,000 active IDs
      const nonActiveUsers = await User.find({ status: { $ne: 'ACTIVE' } }).select('_id').lean();
      const nonActiveIds = nonActiveUsers.map(u => u._id);
      if (nonActiveIds.length > 0) {
        conditions.push({ user: { $nin: nonActiveIds } });
      }
    } else {
      const matchingStatusUsers = await User.find({ status: formattedStatus }).select('_id').lean();
      const statusUserIds = matchingStatusUsers.map(u => u._id);
      conditions.push({ user: { $in: statusUserIds } });
    }
  }

  // 7. Indexed Search across student enrollment number and user name & email
  if (search) {
    const trimmed = search.trim();
    const escaped = escapeRegex(trimmed);

    // Case A: Email search (contains @) -> direct exact match on unique email index
    if (trimmed.includes('@')) {
      const user = await User.findOne({ email: trimmed.toLowerCase() }).select('_id').lean();
      conditions.push({ user: user ? user._id : null });
    }
    // Case B: Enrollment number or alphanumeric code -> direct indexed exact & prefix match
    else if (/^[A-Za-z0-9_-]+$/.test(trimmed) && trimmed.length >= 3) {
      const prefixRegex = new RegExp(`^${escaped}`, 'i');
      const matchingUsers = await User.find({
        $or: [
          { name: prefixRegex },
          { email: prefixRegex }
        ]
      }).select('_id').limit(100).lean();

      const userIds = matchingUsers.map(u => u._id);
      conditions.push({
        $or: [
          { enrollmentNo: trimmed.toUpperCase() },
          { enrollmentNo: prefixRegex },
          { user: { $in: userIds } }
        ]
      });
    }
    // Case C: General name search
    else {
      const searchRegex = new RegExp(escaped, 'i');
      const matchingUsers = await User.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      }).select('_id').limit(100).lean();

      const userIds = matchingUsers.map(u => u._id);
      conditions.push({
        $or: [
          { enrollmentNo: searchRegex },
          { user: { $in: userIds } }
        ]
      });
    }
  }

  let finalQuery = {};
  if (conditions.length === 1) {
    finalQuery = conditions[0];
  } else if (conditions.length > 1) {
    finalQuery = { $and: conditions };
  }

  return finalQuery;
};

module.exports = {
  buildStudentFilterQuery,
  escapeRegex
};

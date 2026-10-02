const Section = require('../models/Section');
const Student = require('../models/Student');
const { createAuditLog } = require('../services/auditLogService');
const { getCurrentAcademicYear } = require('../services/academicYearService');
const { checkHistoricalOperation, logHistoricalAudit } = require('../middleware/historicalGuard');
const mongoose = require('mongoose');

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all active sections (or all sections if requested by admin)
// @route   GET /api/sections
// @access  Public / Authenticated
const getSections = async (req, res) => {
  try {
    const { all, search, academicYear } = req.query;
    const query = {};

    // Only return inactive sections if explicitly requested (e.g. all=true)
    if (all !== 'true') {
      query.isActive = { $ne: false };
      query.status = { $ne: 'inactive' };
    }

    let targetYear = academicYear;
    if (targetYear === undefined || targetYear === null || targetYear === '') {
      targetYear = await getCurrentAcademicYear();
    }

    if (targetYear && targetYear !== 'ALL') {
      query.academicYear = String(targetYear).trim();
    }

    if (search && search.trim()) {
      const s = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { code: { $regex: s, $options: 'i' } }
      ];
    }

    const sections = await Section.find(query).sort({ name: 1 });
    res.json(sections);
  } catch (error) {
    console.error('[Get Sections Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single section by ID
// @route   GET /api/sections/:id
// @access  Public / Authenticated
const getSectionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid section ID' });
    }

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    res.json(section);
  } catch (error) {
    console.error('[Get Section By ID Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new section
// @route   POST /api/sections
// @access  Admin only
const createSection = async (req, res) => {
  try {
    const { name, code, isActive, academicYear } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Section name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1) {
      return res.status(400).json({ message: 'Section name is required' });
    }
    if (trimmedName.length > 50) {
      return res.status(400).json({ message: 'Section name cannot exceed 50 characters' });
    }

    const targetYear = academicYear && String(academicYear).trim()
      ? String(academicYear).trim()
      : await getCurrentAcademicYear();

    // Check historical guard if creating section for historical year
    const histCheck = await checkHistoricalOperation(req, targetYear, 'Section');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    const trimmedCode = (code || trimmedName).trim().toUpperCase();

    // Year-scoped case-insensitive duplicate prevention for name or code
    const existingSection = await Section.findOne({
      academicYear: targetYear,
      $or: [
        { name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') } },
        { code: { $regex: new RegExp(`^${escapeRegex(trimmedCode)}$`, 'i') } }
      ]
    });

    if (existingSection) {
      return res.status(409).json({
        message: `Section "${trimmedName}" already exists for Academic Year ${targetYear}.`
      });
    }

    const newSection = new Section({
      name: trimmedName,
      code: trimmedCode,
      academicYear: targetYear,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      status: isActive !== undefined && !isActive ? 'inactive' : 'active'
    });

    await newSection.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'CREATE',
        targetEntity: 'Section',
        targetId: newSection._id,
        targetName: `${newSection.name} (${targetYear})`,
        details: `Admin created student section: ${newSection.name} for Academic Year ${targetYear}`,
        status: 'SUCCESS'
      });
    }

    res.status(201).json({
      message: 'Section created successfully',
      section: newSection
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Section already exists for this academic year.'
      });
    }
    console.error('[Create Section Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update section details
// @route   PUT /api/sections/:id
// @access  Admin only
const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid section ID' });
    }

    const sec = await Section.findById(id);
    if (!sec) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Historical Guard: check permissions for historical records
    const histCheck = await checkHistoricalOperation(req, sec.academicYear, 'Section');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    const { name, code, isActive, status } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 1) {
        return res.status(400).json({ message: 'Section name cannot be empty' });
      }
      if (trimmedName.length > 50) {
        return res.status(400).json({ message: 'Section name cannot exceed 50 characters' });
      }

      // Check duplicate name excluding this ID within the same academicYear
      const existingName = await Section.findOne({
        _id: { $ne: sec._id },
        academicYear: sec.academicYear,
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') }
      });
      if (existingName) {
        return res.status(409).json({
          message: `Section "${trimmedName}" already exists for Academic Year ${sec.academicYear}.`
        });
      }
      sec.name = trimmedName;
    }

    if (code !== undefined) {
      sec.code = code.trim().toUpperCase();
    }

    if (isActive !== undefined) {
      sec.isActive = Boolean(isActive);
      sec.status = sec.isActive ? 'active' : 'inactive';
    } else if (status !== undefined) {
      sec.status = status === 'active' ? 'active' : 'inactive';
      sec.isActive = sec.status === 'active';
    }

    await sec.save();

    if (req.user) {
      const logDetails = histCheck.isHistorical
        ? `[Historical Management] Admin updated section: ${sec.name} for Year ${sec.academicYear}`
        : `Admin updated section: ${sec.name} (Active: ${sec.isActive})`;

      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Section',
        targetId: sec._id,
        targetName: `${sec.name} (${sec.academicYear})`,
        details: logDetails,
        status: 'SUCCESS'
      });
    }

    res.json({
      message: 'Section updated successfully',
      section: sec
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Section already exists for this academic year.'
      });
    }
    console.error('[Update Section Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete or deactivate section safely
// @route   DELETE /api/sections/:id
// @access  Admin only
const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid section ID' });
    }

    const sec = await Section.findById(id);
    if (!sec) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Historical Guard: check permissions for historical records
    const histCheck = await checkHistoricalOperation(req, sec.academicYear, 'Section');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    const reason = (req.body?.reason || req.body?.deletionReason || req.query?.reason || '').trim();

    // Safety check: is this section currently assigned to any student?
    const studentRef = await Student.findOne({ section: sec._id });

    if (studentRef) {
      // Safe deactivation instead of permanent deletion
      sec.isActive = false;
      sec.status = 'inactive';
      await sec.save();

      if (req.user) {
        await createAuditLog({
          user: req.user,
          actionType: 'DEACTIVATE',
          targetEntity: 'Section',
          targetId: sec._id,
          targetName: `${sec.name} (${sec.academicYear})`,
          details: `Admin attempted to delete referenced section '${sec.name}' (${sec.academicYear}). Deactivated it instead to protect existing student records.${reason ? ' Reason: ' + reason : ''}`,
          status: 'SUCCESS'
        });
      }

      return res.json({
        message: 'This section is currently assigned to existing records, so it cannot be permanently deleted. It has been deactivated instead.',
        deactivated: true,
        section: sec
      });
    }

    // No references exist, safely delete document
    await Section.findByIdAndDelete(id);

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'DELETE',
        targetEntity: 'Section',
        targetId: sec._id,
        targetName: `${sec.name} (${sec.academicYear})`,
        details: `Admin permanently deleted unreferenced section: ${sec.name} (${sec.academicYear}).${reason ? ' Reason: ' + reason : ''}`,
        status: 'SUCCESS'
      });
    }

    res.json({
      message: 'Section deleted successfully.',
      deleted: true,
      deactivated: false
    });
  } catch (error) {
    console.error('[Delete Section Error]', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection
};

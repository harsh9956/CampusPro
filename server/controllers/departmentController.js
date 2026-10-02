const Department = require('../models/Department');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const PlacementDrive = require('../models/PlacementDrive');
const { createAuditLog } = require('../services/auditLogService');
const { getCurrentAcademicYear } = require('../services/academicYearService');
const { checkHistoricalOperation } = require('../middleware/historicalGuard');
const mongoose = require('mongoose');

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all active departments (or all departments if requested by admin) scoped by Academic Year
// @route   GET /api/departments
// @access  Public / Authenticated
const getDepartments = async (req, res) => {
  try {
    const { all, search, academicYear } = req.query;
    const query = {};

    // Only return inactive departments if explicitly requested
    if (all !== 'true') {
      query.$or = [{ isActive: true }, { status: 'active' }];
    }

    // Scoping by Academic Year
    let targetYear = academicYear;
    if (targetYear === undefined || targetYear === null || targetYear === '') {
      targetYear = await getCurrentAcademicYear();
    }

    if (targetYear && targetYear !== 'ALL') {
      query.academicYear = String(targetYear).trim();
    }

    if (search && search.trim()) {
      const s = escapeRegex(search.trim());
      const searchConditions = [
        { name: { $regex: s, $options: 'i' } },
        { code: { $regex: s, $options: 'i' } }
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const departments = await Department.find(query).sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    console.error('[Get Departments Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single department by ID
// @route   GET /api/departments/:id
// @access  Public / Authenticated
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid department ID' });
    }

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json(dept);
  } catch (error) {
    console.error('[Get Department By ID Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new department
// @route   POST /api/departments
// @access  Admin only
const createDepartment = async (req, res) => {
  try {
    const { name, code, description, isActive, academicYear } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ message: 'Department name must be at least 2 characters long' });
    }
    if (trimmedName.length > 100) {
      return res.status(400).json({ message: 'Department name cannot exceed 100 characters' });
    }

    const targetYear = academicYear && String(academicYear).trim()
      ? String(academicYear).trim()
      : await getCurrentAcademicYear();

    // Historical Guard: check permissions for historical academic year
    const histCheck = await checkHistoricalOperation(req, targetYear, 'Department');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    let trimmedCode = (code || '').trim().toUpperCase();
    if (!trimmedCode) {
      const words = trimmedName.split(/\s+/).filter(Boolean);
      trimmedCode = words.length === 1 ? trimmedName.slice(0, 4).toUpperCase() : words.map(w => w[0]).join('').toUpperCase();
    }

    // Year-scoped case-insensitive duplicate prevention for name or code
    const existingDept = await Department.findOne({
      academicYear: targetYear,
      $or: [
        { name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') } },
        { code: { $regex: new RegExp(`^${escapeRegex(trimmedCode)}$`, 'i') } }
      ]
    });

    if (existingDept) {
      return res.status(409).json({
        message: `Department '${existingDept.name}' already exists for Academic Year ${targetYear}.`
      });
    }

    const newDepartment = new Department({
      name: trimmedName,
      code: trimmedCode,
      academicYear: targetYear,
      description: (description || '').trim(),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      status: isActive !== undefined && !isActive ? 'inactive' : 'active'
    });

    await newDepartment.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'CREATE',
        targetEntity: 'Department',
        targetId: newDepartment._id,
        targetName: `${newDepartment.name} (${targetYear})`,
        details: `Admin created new department: ${newDepartment.name} (${newDepartment.code || 'N/A'}) for Academic Year ${targetYear}`,
        status: 'SUCCESS'
      });
    }

    res.status(201).json({
      message: 'Department created successfully',
      department: newDepartment
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A department with this name or code already exists for this academic year.'
      });
    }
    console.error('[Create Department Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update department details
// @route   PUT /api/departments/:id
// @access  Admin only
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid department ID' });
    }

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Historical Guard: check permissions for historical records
    const histCheck = await checkHistoricalOperation(req, dept.academicYear, 'Department');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    const { name, code, description, isActive, status } = req.body;

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        return res.status(400).json({ message: 'Department name must be at least 2 characters long' });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({ message: 'Department name cannot exceed 100 characters' });
      }

      // Check duplicate name excluding this ID within the same academicYear
      const existingName = await Department.findOne({
        _id: { $ne: dept._id },
        academicYear: dept.academicYear,
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') }
      });
      if (existingName) {
        return res.status(409).json({
          message: `Another department with name '${existingName.name}' already exists for Academic Year ${dept.academicYear}.`
        });
      }
      dept.name = trimmedName;
    }

    if (code !== undefined) {
      const trimmedCode = code.trim().toUpperCase();
      if (trimmedCode) {
        const existingCode = await Department.findOne({
          _id: { $ne: dept._id },
          academicYear: dept.academicYear,
          code: { $regex: new RegExp(`^${escapeRegex(trimmedCode)}$`, 'i') }
        });
        if (existingCode) {
          return res.status(409).json({
            message: `Department code '${trimmedCode}' is already in use by '${existingCode.name}' for Academic Year ${dept.academicYear}.`
          });
        }
      }
      dept.code = trimmedCode;
    }

    if (description !== undefined) {
      dept.description = description.trim();
    }

    if (isActive !== undefined) {
      dept.isActive = Boolean(isActive);
      dept.status = dept.isActive ? 'active' : 'inactive';
    } else if (status !== undefined) {
      dept.status = status === 'active' ? 'active' : 'inactive';
      dept.isActive = dept.status === 'active';
    }

    await dept.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Department',
        targetId: dept._id,
        targetName: `${dept.name} (${dept.academicYear})`,
        details: `Admin updated department: ${dept.name} (Active: ${dept.isActive}) for Academic Year ${dept.academicYear}`,
        status: 'SUCCESS'
      });
    }

    res.json({
      message: 'Department updated successfully',
      department: dept
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'A department with this name or code already exists for this academic year.'
      });
    }
    console.error('[Update Department Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete or deactivate department safely
// @route   DELETE /api/departments/:id
// @access  Admin only
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid department ID' });
    }

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Historical Guard: check permissions for historical records
    const histCheck = await checkHistoricalOperation(req, dept.academicYear, 'Department');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    // Safety check: is this department currently referenced by students or drives of this academic year?
    const [studentRef, facultyRef, driveRef] = await Promise.all([
      Student.findOne({ department: dept._id, academicYear: dept.academicYear }),
      Faculty.findOne({ department: dept._id }),
      PlacementDrive.findOne({
        academicYear: dept.academicYear,
        $or: [
          { eligibleBranches: dept.name },
          { eligibleBranches: dept.code },
          { eligibleBranches: dept._id.toString() }
        ]
      })
    ]);

    const isReferenced = Boolean(studentRef || facultyRef || driveRef);

    if (isReferenced) {
      // Safe deactivation instead of permanent deletion
      dept.isActive = false;
      dept.status = 'inactive';
      await dept.save();

      if (req.user) {
        await createAuditLog({
          user: req.user,
          actionType: 'DEACTIVATE',
          targetEntity: 'Department',
          targetId: dept._id,
          targetName: `${dept.name} (${dept.academicYear})`,
          details: `Admin attempted to delete referenced department '${dept.name}' (${dept.academicYear}). Deactivated it instead to protect existing records.`,
          status: 'SUCCESS'
        });
      }

      return res.json({
        message: 'This department is currently assigned to existing records, so it cannot be permanently deleted. It has been deactivated instead.',
        deactivated: true,
        department: dept
      });
    }

    // No references exist, safely delete document
    await Department.findByIdAndDelete(id);

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'DELETE',
        targetEntity: 'Department',
        targetId: dept._id,
        targetName: `${dept.name} (${dept.academicYear})`,
        details: `Admin permanently deleted unreferenced department: ${dept.name} (${dept.academicYear})`,
        status: 'SUCCESS'
      });
    }

    res.json({
      message: 'Department deleted successfully.',
      deleted: true
    });
  } catch (error) {
    console.error('[Delete Department Error]', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};

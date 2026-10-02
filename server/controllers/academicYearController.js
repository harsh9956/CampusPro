const {
  getAllAcademicYears,
  getCurrentAcademicYearDoc,
  createAcademicYear,
  setCurrentAcademicYear,
  deleteAcademicYearData
} = require('../services/academicYearService');

// @desc    Get all academic years
// @route   GET /api/academic-years
// @access  Public / Authenticated
const getAcademicYears = async (req, res) => {
  try {
    const years = await getAllAcademicYears();
    const current = years.find((y) => y.isCurrent) || years[0] || null;
    res.json({
      success: true,
      currentYear: current ? current.year : (years.length > 0 ? years[0].year : ''),
      data: years
    });
  } catch (error) {
    console.error('[Get Academic Years Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current academic year
// @route   GET /api/academic-years/current
// @access  Public / Authenticated
const getCurrentYear = async (req, res) => {
  try {
    const currentDoc = await getCurrentAcademicYearDoc();
    res.json({
      success: true,
      data: currentDoc
    });
  } catch (error) {
    console.error('[Get Current Academic Year Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new academic year
// @route   POST /api/academic-years
// @access  Private (Super Admin only)
const createYear = async (req, res) => {
  try {
    if ((req.user?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Only Super Admin can manage academic years.'
      });
    }

    const { year, isCurrent, status, description } = req.body;
    const newDoc = await createAcademicYear({
      year,
      isCurrent,
      status,
      description,
      user: req.user
    });

    res.status(201).json({
      success: true,
      message: `Academic Year ${newDoc.year} created successfully.`,
      data: newDoc
    });
  } catch (error) {
    console.error('[Create Academic Year Error]', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Set an academic year as CURRENT
// @route   PUT /api/academic-years/current, PUT /api/academic-years/:id/current, POST /api/academic-years/:id/set-current
// @access  Private (Super Admin only)
const setYearAsCurrent = async (req, res) => {
  try {
    if ((req.user?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Only Super Admin can manage academic years.'
      });
    }

    const target =
      req.body?.year ||
      req.body?.academicYear ||
      req.body?.id ||
      (req.params.id && req.params.id !== 'current' ? req.params.id : null);

    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'Academic year name or ID is required.'
      });
    }

    const updatedDoc = await setCurrentAcademicYear(target, req.user);

    res.json({
      success: true,
      message: `Academic Year ${updatedDoc.year} is now set as the Current Academic Year. Historical data remains untouched.`,
      data: updatedDoc
    });
  } catch (error) {
    console.error('[Set Current Academic Year Error]', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete historical academic year and all year-scoped data
// @route   DELETE /api/academic-years/:id/data or DELETE /api/academic-years/:id
// @access  Private (Super Admin only)
const deleteYearData = async (req, res) => {
  try {
    if ((req.user?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Only Super Admin can manage academic years.'
      });
    }

    const { id } = req.params;
    const { reason, confirmYear } = req.body;

    const summary = await deleteAcademicYearData({
      yearOrId: id,
      reason,
      confirmYear,
      user: req.user
    });

    res.json({
      success: true,
      message: `Historical Academic Year ${summary.academicYear} and all associated year-scoped records were successfully deleted.`,
      data: summary
    });
  } catch (error) {
    console.error('[Delete Academic Year Error]', error);
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAcademicYears,
  getCurrentYear,
  createYear,
  setYearAsCurrent,
  deleteYearData
};

const TestType = require('../models/TestType');
const MockTest = require('../models/MockTest');

// @desc    Get all test types
// @route   GET /api/test-types
// @access  Public / Authenticated
const getTestTypes = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const testTypes = await TestType.find(filter).sort({ name: 1 });
    res.json({ success: true, count: testTypes.length, data: testTypes });
  } catch (error) {
    console.error('[Get Test Types Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new test type
// @route   POST /api/test-types
// @access  Private (Faculty/Admin)
const createTestType = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Test type name is required.' });
    }

    const trimmedName = name.trim();

    // Case-insensitive duplicate check
    const existing = await TestType.findOne({
      name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Test type "${trimmedName}" already exists.` });
    }

    const newTestType = await TestType.create({
      name: trimmedName,
      description: description ? description.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      message: `Test type "${newTestType.name}" created successfully.`,
      data: newTestType
    });
  } catch (error) {
    console.error('[Create Test Type Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update test type
// @route   PUT /api/test-types/:id
// @access  Private (Faculty/Admin)
const updateTestType = async (req, res) => {
  try {
    const testType = await TestType.findById(req.params.id);
    if (!testType) {
      return res.status(404).json({ success: false, message: 'Test type not found.' });
    }

    const { name, description, isActive } = req.body;

    if (name !== undefined && name.trim() !== testType.name) {
      const trimmedName = name.trim();
      const existing = await TestType.findOne({
        _id: { $ne: req.params.id },
        name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Test type "${trimmedName}" already exists.` });
      }
      testType.name = trimmedName;
    }

    if (description !== undefined) testType.description = description.trim();
    if (isActive !== undefined) testType.isActive = Boolean(isActive);

    await testType.save();

    res.json({
      success: true,
      message: `Test type updated successfully.`,
      data: testType
    });
  } catch (error) {
    console.error('[Update Test Type Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete test type (Safe deletion check)
// @route   DELETE /api/test-types/:id
// @access  Private (Faculty/Admin)
const deleteTestType = async (req, res) => {
  try {
    const testType = await TestType.findById(req.params.id);
    if (!testType) {
      return res.status(404).json({ success: false, message: 'Test type not found.' });
    }

    // Check if any MockTest is using this test type
    const usageCount = await MockTest.countDocuments({
      testType: new RegExp(`^${testType.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete test type "${testType.name}" because ${usageCount} mock test(s) are currently using it.`
      });
    }

    await TestType.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Test type "${testType.name}" removed successfully.`
    });
  } catch (error) {
    console.error('[Delete Test Type Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTestTypes,
  createTestType,
  updateTestType,
  deleteTestType
};

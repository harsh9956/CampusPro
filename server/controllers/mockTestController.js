const mongoose = require('mongoose');
const XLSX = require('xlsx');
const MockTest = require('../models/MockTest');
const MockResult = require('../models/MockResult');
const Student = require('../models/Student');
const Company = require('../models/Company');
const { createAuditLog } = require('../services/auditLogService');
const { getPaginationParams, formatPaginationResponse } = require('../utils/pagination');
const { getCurrentAcademicYear } = require('../services/academicYearService');
const { checkHistoricalOperation } = require('../middleware/historicalGuard');

// Helper for pre-publish validation
const validateMockTestForPublishing = (test) => {
  if (!test.title || !test.title.trim()) {
    return 'Test title is required.';
  }
  if (test.testType === 'Company Specific' && (!test.companyName || test.companyName === 'General')) {
    return 'Company selection is required for company-specific tests.';
  }
  if (!test.durationMinutes || test.durationMinutes <= 0) {
    return 'Duration must be greater than 0 minutes.';
  }
  if (!test.questions || test.questions.length === 0) {
    return 'Please add at least one question before publishing.';
  }

  for (let i = 0; i < test.questions.length; i++) {
    const q = test.questions[i];
    if (!q.questionText || !q.questionText.trim()) {
      return `Question ${i + 1} text is empty.`;
    }
    if (q.questionType === 'Multiple Choice' || !q.questionType) {
      if (!q.options || q.options.length < 2 || q.options.some((opt) => !opt.trim())) {
        return `Question ${i + 1} requires at least two non-empty options.`;
      }
      if (q.correctOptionIndex === undefined || q.correctOptionIndex === null || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
        return `Correct answer is missing or invalid for Question ${i + 1}.`;
      }
    }
  }

  return null;
};

// @desc    Get published mock tests for students
// @route   GET /api/mock-tests
// @access  Private
const getMockTests = async (req, res) => {
  try {
    const { companyName, testType, difficulty, search } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query, { defaultLimit: 20 });
    let query = { status: 'PUBLISHED' };

    if (companyName && companyName !== 'ALL') {
      query.companyName = new RegExp(companyName, 'i');
    }
    if (testType && testType !== 'ALL') {
      query.testType = new RegExp(testType, 'i');
    }
    if (difficulty && difficulty !== 'ALL') {
      query.difficulty = difficulty;
    }
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ title: searchRegex }, { companyName: searchRegex }, { description: searchRegex }];
    }

    const total = await MockTest.countDocuments(query);
    let testsQuery = MockTest.find(query)
      .select(req.query.includeQuestions === 'true' ? '' : '-questions')
      .populate('company', 'name logo industry')
      .sort({ createdAt: -1 })
      .lean();

    if (req.query.paginate !== 'false' && req.query.all !== 'true') {
      testsQuery = testsQuery.skip(skip).limit(limit);
    } else {
      testsQuery = testsQuery.limit(100);
    }

    let tests = await testsQuery;

    // Sanitize questions if student role
    const userRole = (req.user?.role || '').toUpperCase();
    if (req.user && userRole === 'STUDENT') {
      tests = tests.map((test) => {
        const questions = (test.questions || []).map((q) => {
          const { correctOptionIndex, explanation, ...rest } = q;
          return rest;
        });
        return { ...test, questions };
      });
    }

    res.json({
      success: true,
      count: tests.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      },
      data: tests
    });
  } catch (error) {
    console.error('[Get Mock Tests Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tests created by faculty (or all for admin) with attempt stats
// @route   GET /api/mock-tests/faculty
// @access  Private (Faculty/Admin)
const getFacultyMockTests = async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query, { defaultLimit: 20 });
    let query = {};

    if ((req.user?.role || '').toUpperCase() === 'FACULTY') {
      query.createdBy = req.user._id;
    }

    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ title: searchRegex }, { companyName: searchRegex }, { testType: searchRegex }];
    }

    const total = await MockTest.countDocuments(query);
    let testsQuery = MockTest.find(query)
      .populate('company', 'name logo industry')
      .sort({ createdAt: -1 })
      .lean();

    if (req.query.paginate !== 'false' && req.query.all !== 'true') {
      testsQuery = testsQuery.skip(skip).limit(limit);
    }

    const tests = await testsQuery;

    // Fix N+1 query: Single aggregate query for attempt counts of all tests
    const testIds = tests.map((t) => t._id);
    const attemptCounts = await MockResult.aggregate([
      { $match: { mockTest: { $in: testIds } } },
      { $group: { _id: '$mockTest', count: { $sum: 1 } } }
    ]);

    const countMap = new Map();
    attemptCounts.forEach((c) => countMap.set(c._id.toString(), c.count));

    const testsWithAttempts = tests.map((t) => ({
      ...t,
      attemptsCount: countMap.get(t._id.toString()) || 0
    }));

    res.json({
      success: true,
      count: testsWithAttempts.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      },
      data: testsWithAttempts
    });
  } catch (error) {
    console.error('[Get Faculty Mock Tests Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get mock test details by ID
// @route   GET /api/mock-tests/:id
// @access  Private
const getMockTestById = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id)
      .populate('company', 'name logo industry')
      .populate('questions.questionRef', 'questionText answer topic difficulty company companyName');
    if (!test) {
      return res.status(404).json({ success: false, message: 'Mock test not found.' });
    }

    const testObj = test.toObject();

    // Sanitize questions if student role
    if ((req.user?.role || '').toUpperCase() === 'STUDENT') {
      if (testObj.status !== 'PUBLISHED') {
        return res.status(403).json({ success: false, message: 'This mock test is not published.' });
      }
      testObj.questions = (testObj.questions || []).map((q) => {
        const { correctOptionIndex, explanation, ...rest } = q;
        return rest;
      });
    }

    res.json({
      success: true,
      data: testObj
    });
  } catch (error) {
    console.error('[Get Mock Test By ID Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new mock test (Faculty / Admin)
// @route   POST /api/mock-tests
// @access  Private (Faculty/Admin)
const createMockTest = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      testType,
      companyId,
      companyName,
      durationMinutes,
      passingMarks,
      difficulty,
      questions,
      status
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Test title is required.' });
    }

    if (testType === 'Company Specific' && (!companyName || companyName === 'General')) {
      return res.status(400).json({ success: false, message: 'Company selection is required for company-specific tests.' });
    }

    // Always use the system's current academic year — never trust req.body.academicYear
    const currentYear = await getCurrentAcademicYear();

    // Historical guard: block creation for non-current years
    const historicalCheck = await checkHistoricalOperation(req, currentYear, 'Mock Test');
    if (!historicalCheck.allowed) {
      return res.status(historicalCheck.status || 403).json({
        success: false,
        code: historicalCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: historicalCheck.message
      });
    }

    // Process questions
    const processedQuestions = Array.isArray(questions) ? questions : [];
    const totalQuestions = processedQuestions.length;
    const totalMarks = processedQuestions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);
    const topicsCovered = Array.from(new Set(processedQuestions.map((q) => q.topic).filter(Boolean)));

    let companyRef = companyId || null;
    if (!companyRef && companyName && companyName !== 'General') {
      const comp = await Company.findOne({ name: new RegExp(`^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (comp) companyRef = comp._id;
    }

    const testStatus = (status || 'DRAFT').toUpperCase();

    const newTest = new MockTest({
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'General Placement Mock Test',
      testType: testType || 'General Placement',
      company: companyRef,
      companyName: companyName || 'General',
      durationMinutes: Number(durationMinutes) || 30,
      totalQuestions,
      totalMarks,
      passingMarks: Number(passingMarks) || Math.ceil(totalMarks * 0.4),
      difficulty: difficulty || 'Medium',
      academicYear: currentYear,
      topicsCovered,
      questions: processedQuestions,
      status: testStatus,
      createdBy: req.user._id,
      createdByName: req.user.name || 'Faculty Coordinator'
    });

    if (testStatus === 'PUBLISHED') {
      const err = validateMockTestForPublishing(newTest);
      if (err) {
        return res.status(400).json({ success: false, message: err });
      }
    }

    await newTest.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'CREATE',
        targetEntity: 'Mock Test',
        targetId: newTest._id,
        targetName: newTest.title,
        details: `Created ${newTest.testType} mock test (${newTest.totalQuestions} questions)`
      });
    }

    res.status(201).json({
      success: true,
      message: `Mock test ${testStatus === 'PUBLISHED' ? 'published' : 'created as draft'} successfully.`,
      data: newTest
    });
  } catch (error) {
    console.error('[Create Mock Test Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update mock test
// @route   PUT /api/mock-tests/:id
// @access  Private (Faculty/Admin)
const updateMockTest = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Mock test not found.' });
    }

    // Historical guard: block mutations on historical year tests
    const historicalCheck = await checkHistoricalOperation(req, test.academicYear, 'Mock Test');
    if (!historicalCheck.allowed) {
      return res.status(historicalCheck.status || 403).json({
        success: false,
        code: historicalCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: historicalCheck.message
      });
    }

    // Ownership check for faculty
    if ((req.user?.role || '').toUpperCase() === 'FACULTY' && String(test.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the test creator or an admin can edit this mock test.' });
    }

    const {
      title,
      description,
      category,
      testType,
      companyId,
      companyName,
      durationMinutes,
      passingMarks,
      difficulty,
      questions,
      status
      // NOTE: academicYear is intentionally excluded — it is immutable after creation
    } = req.body;

    if (title !== undefined) test.title = title.trim();
    if (description !== undefined) test.description = description.trim();
    if (category !== undefined) test.category = category;
    if (testType !== undefined) test.testType = testType;
    if (companyName !== undefined) test.companyName = companyName;
    if (companyId !== undefined) test.company = companyId || null;
    if (durationMinutes !== undefined) test.durationMinutes = Number(durationMinutes) || 30;
    if (passingMarks !== undefined) test.passingMarks = Number(passingMarks) || 0;
    if (difficulty !== undefined) test.difficulty = difficulty;
    if (status !== undefined) test.status = status.toUpperCase();

    if (Array.isArray(questions)) {
      test.questions = questions;
      test.totalQuestions = questions.length;
      test.totalMarks = questions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);
      test.topicsCovered = Array.from(new Set(questions.map((q) => q.topic).filter(Boolean)));
    }

    if (test.status === 'PUBLISHED') {
      const err = validateMockTestForPublishing(test);
      if (err) {
        return res.status(400).json({ success: false, message: err });
      }
    }

    await test.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Mock Test',
        targetId: test._id,
        targetName: test.title,
        details: `Updated mock test configuration / questions`
      });
    }

    res.json({
      success: true,
      message: 'Mock test updated successfully.',
      data: test
    });
  } catch (error) {
    console.error('[Update Mock Test Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Publish a mock test
// @route   PATCH /api/mock-tests/:id/publish
// @access  Private (Faculty/Admin)
const publishMockTest = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Mock test not found.' });
    }

    if ((req.user?.role || '').toUpperCase() === 'FACULTY' && String(test.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the test creator or an admin can publish this test.' });
    }

    const validationError = validateMockTestForPublishing(test);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    test.status = 'PUBLISHED';
    await test.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'PUBLISH',
        targetEntity: 'Mock Test',
        targetId: test._id,
        targetName: test.title,
        details: `Published mock test for students`
      });
    }

    res.json({
      success: true,
      message: 'Mock test published successfully and is now available to students.',
      data: test
    });
  } catch (error) {
    console.error('[Publish Mock Test Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unpublish a mock test
// @route   PATCH /api/mock-tests/:id/unpublish
// @access  Private (Faculty/Admin)
const unpublishMockTest = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Mock test not found.' });
    }

    if ((req.user?.role || '').toUpperCase() === 'FACULTY' && String(test.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the test creator or an admin can unpublish this test.' });
    }

    test.status = 'UNPUBLISHED';
    await test.save();

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'UNPUBLISH',
        targetEntity: 'Mock Test',
        targetId: test._id,
        targetName: test.title,
        details: `Unpublished mock test`
      });
    }

    res.json({
      success: true,
      message: 'Mock test unpublished successfully.',
      data: test
    });
  } catch (error) {
    console.error('[Unpublish Mock Test Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete mock test & cascade delete results
// @route   DELETE /api/mock-tests/:id
// @access  Private (Faculty/Admin)
const deleteMockTest = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Mock test not found.' });
    }

    // Historical guard: block deletion on historical year tests
    const historicalCheck = await checkHistoricalOperation(req, test.academicYear, 'Mock Test');
    if (!historicalCheck.allowed) {
      return res.status(historicalCheck.status || 403).json({
        success: false,
        code: historicalCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: historicalCheck.message
      });
    }

    if ((req.user?.role || '').toUpperCase() === 'FACULTY' && String(test.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the test creator or an admin can delete this test.' });
    }

    // Cascade delete associated results
    await MockResult.deleteMany({ mockTest: test._id });
    await MockTest.findByIdAndDelete(test._id);

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'DELETE',
        targetEntity: 'Mock Test',
        targetId: test._id,
        targetName: test.title,
        details: `Deleted mock test and associated student attempts`
      });
    }

    res.json({
      success: true,
      message: 'Mock test and associated student attempts deleted successfully.'
    });
  } catch (error) {
    console.error('[Delete Mock Test Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit mock test answers & calculate results
// @route   POST /api/mock-tests/:id/submit
// @access  Private (Student)
const submitMockTest = async (req, res) => {
  try {
    const { answers, timeTakenMinutes } = req.body; // Array of { questionId, selectedOptionIndex }
    const student = await Student.findOne({ user: req.user._id });

    const mockTest = await MockTest.findById(req.params.id);
    if (!mockTest) {
      return res.status(404).json({ success: false, message: 'Mock test not found.' });
    }

    if (mockTest.status !== 'PUBLISHED') {
      return res.status(400).json({ success: false, message: 'Cannot submit an unpublished mock test.' });
    }

    // Cross-year guard: students may only submit tests from their own academic year
    if (student && mockTest.academicYear && student.academicYear && student.academicYear !== mockTest.academicYear) {
      return res.status(403).json({
        success: false,
        code: 'CROSS_YEAR_SUBMISSION_BLOCKED',
        message: `This mock test belongs to academic year ${mockTest.academicYear}. You are enrolled in ${student.academicYear} and cannot submit tests from a different year.`
      });
    }

    let totalMarks = mockTest.totalMarks || mockTest.questions.reduce((acc, q) => acc + (q.marks || 1), 0);
    if (totalMarks === 0) totalMarks = mockTest.questions.length;

    let obtainedMarks = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const answerMap = {};
    if (Array.isArray(answers)) {
      answers.forEach((a) => {
        if (a && a.questionId !== undefined) {
          answerMap[String(a.questionId)] = a.selectedOptionIndex;
        }
      });
    }

    const topicStats = {};
    const detailedAnswers = [];

    mockTest.questions.forEach((q) => {
      const qIdStr = String(q._id);
      const topic = q.topic || 'General';
      const qMarks = Number(q.marks) || 1;

      if (!topicStats[topic]) {
        topicStats[topic] = { correct: 0, total: 0 };
      }
      topicStats[topic].total += 1;

      const userAnsIndex = answerMap[qIdStr];

      if (userAnsIndex === undefined || userAnsIndex === null) {
        unansweredCount += 1;
        detailedAnswers.push({
          questionId: qIdStr,
          selectedOptionIndex: null,
          isCorrect: false,
          marksObtained: 0
        });
      } else if (userAnsIndex === q.correctOptionIndex) {
        correctCount += 1;
        obtainedMarks += qMarks;
        topicStats[topic].correct += 1;
        detailedAnswers.push({
          questionId: qIdStr,
          selectedOptionIndex: userAnsIndex,
          isCorrect: true,
          marksObtained: qMarks
        });
      } else {
        incorrectCount += 1;
        detailedAnswers.push({
          questionId: qIdStr,
          selectedOptionIndex: userAnsIndex,
          isCorrect: false,
          marksObtained: 0
        });
      }
    });

    const percentage = Math.round((obtainedMarks / totalMarks) * 100);
    const passCriteria = mockTest.passingMarks || Math.ceil(totalMarks * 0.4);
    const resultStatus = obtainedMarks >= passCriteria ? 'PASS' : 'FAIL';

    const topicBreakdown = Object.keys(topicStats).map((t) => ({
      topic: t,
      correct: topicStats[t].correct,
      total: topicStats[t].total,
      percentage: Math.round((topicStats[t].correct / topicStats[t].total) * 100)
    }));

    const mockResult = await MockResult.create({
      student: student ? student._id : req.user._id,
      user: req.user._id,
      mockTest: mockTest._id,
      testTitle: mockTest.title,
      companyName: mockTest.companyName || 'General',
      score: obtainedMarks,
      totalScore: totalMarks,
      percentage,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unanswered: unansweredCount,
      resultStatus,
      timeTakenMinutes: Number(timeTakenMinutes) || 0,
      topicBreakdown,
      answers: detailedAnswers
    });

    res.json({
      success: true,
      message: 'Test submitted successfully!',
      result: mockResult
    });
  } catch (error) {
    console.error('[Submit Mock Test Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to process results filtering & summary calculation
const processResultsAndSummary = (test, rawResults, query) => {
  const { branch, search, status, minScore, maxScore, resultStatus } = query;

  let filtered = rawResults.filter((r) => {
    // Status check
    const rStatus = r.status || 'COMPLETED';
    if (status && status !== 'ALL' && rStatus.toUpperCase() !== status.toUpperCase()) {
      return false;
    }

    // Result Status check (PASS / FAIL)
    if (resultStatus && resultStatus !== 'ALL' && r.resultStatus !== resultStatus.toUpperCase()) {
      return false;
    }

    // Min / Max Score Range
    if (minScore !== undefined && minScore !== '' && r.score < Number(minScore)) {
      return false;
    }
    if (maxScore !== undefined && maxScore !== '' && r.score > Number(maxScore)) {
      return false;
    }

    // Branch / Department check
    const sBranch = (r.student?.branch || r.student?.department || '').toUpperCase();
    if (branch && branch !== 'ALL' && sBranch !== branch.toUpperCase()) {
      return false;
    }

    // Search query (Student Name, Enrollment No, Email)
    if (search && search.trim()) {
      const sTerm = search.trim().toLowerCase();
      const sName = (r.student?.user?.name || r.student?.name || '').toLowerCase();
      const sEnrollment = (r.student?.enrollmentNo || '').toLowerCase();
      const sEmail = (r.student?.user?.email || '').toLowerCase();

      if (!sName.includes(sTerm) && !sEnrollment.includes(sTerm) && !sEmail.includes(sTerm)) {
        return false;
      }
    }

    return true;
  });

  const totalAttempts = rawResults.length;
  const completedAttempts = filtered.length;

  let avgScore = 0;
  let highestScore = 0;
  let lowestScore = 0;
  let avgPercentage = 0;

  if (completedAttempts > 0) {
    const scores = filtered.map((r) => r.score);
    const percentages = filtered.map((r) => r.percentage);

    const sumScore = scores.reduce((a, b) => a + b, 0);
    const sumPercentage = percentages.reduce((a, b) => a + b, 0);

    avgScore = Number((sumScore / completedAttempts).toFixed(2));
    highestScore = Math.max(...scores);
    lowestScore = Math.min(...scores);
    avgPercentage = Number((sumPercentage / completedAttempts).toFixed(2));
  }

  const summary = {
    totalAttempts,
    completedAttempts,
    avgScore,
    highestScore,
    lowestScore,
    avgPercentage
  };

  return { filtered, summary };
};

// @desc    Get student attempts for a specific mock test with filters & summary stats
// @route   GET /api/mock-tests/:id/results
// @access  Private (Faculty/Admin)
const getMockTestResults = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Mock test not found.' });
    }

    if ((req.user?.role || '').toUpperCase() === 'FACULTY' && String(test.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the test creator or an admin can view test results.' });
    }

    const rawResults = await MockResult.find({ mockTest: test._id })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      })
      .sort({ completedAt: -1 });

    const { filtered, summary } = processResultsAndSummary(test, rawResults, req.query);

    res.json({
      success: true,
      count: filtered.length,
      summary,
      data: filtered
    });
  } catch (error) {
    console.error('[Get Mock Test Results Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export student attempts for a mock test as formatted Excel (.xlsx) file
// @route   GET /api/mock-tests/:id/results/export
// @access  Private (Faculty/Admin)
const exportMockTestResults = async (req, res) => {
  try {
    const test = await MockTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Mock test not found.' });
    }

    if ((req.user?.role || '').toUpperCase() === 'FACULTY' && String(test.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the test creator or an admin can export test results.' });
    }

    const rawResults = await MockResult.find({ mockTest: test._id })
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      })
      .sort({ completedAt: -1 });

    const { filtered, summary } = processResultsAndSummary(test, rawResults, req.query);

    if (filtered.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No completed attempts available for export matching your criteria.'
      });
    }

    // Build Sheet 1: "Mock Test Results" (15 columns)
    const rowsResults = filtered.map((r) => ({
      'Student Name': r.student?.user?.name || 'Student Candidate',
      'Enrollment No': r.student?.enrollmentNo || 'N/A',
      'Branch': r.student?.branch || r.student?.department || 'N/A',
      'Email': r.student?.user?.email || 'N/A',
      'Mock Test': test.title,
      'Company': test.companyName || 'General',
      'Score': r.score,
      'Total Marks': r.totalScore,
      'Percentage': `${r.percentage}%`,
      'Correct': r.correctAnswers,
      'Wrong': r.incorrectAnswers !== undefined ? r.incorrectAnswers : r.wrongAnswers || 0,
      'Unattempted': r.unanswered !== undefined ? r.unanswered : r.unattempted || 0,
      'Time Taken': `${r.timeTakenMinutes || 0} Mins`,
      'Attempt Date': new Date(r.completedAt || r.createdAt).toISOString().split('T')[0],
      'Status': r.status || 'COMPLETED'
    }));

    // Build Sheet 2: "Summary"
    const rowsSummary = [
      { Metric: 'Mock Test Name', Value: test.title },
      { Metric: 'Company', Value: test.companyName || 'General' },
      { Metric: 'Total Students', Value: summary.totalAttempts },
      { Metric: 'Completed Attempts', Value: summary.completedAttempts },
      { Metric: 'Average Score', Value: summary.avgScore },
      { Metric: 'Highest Score', Value: summary.highestScore },
      { Metric: 'Lowest Score', Value: summary.lowestScore },
      { Metric: 'Average Percentage', Value: `${summary.avgPercentage}%` }
    ];

    const wb = XLSX.utils.book_new();

    const wsResults = XLSX.utils.json_to_sheet(rowsResults);
    const wsSummary = XLSX.utils.json_to_sheet(rowsSummary);

    // Auto-fit column widths
    wsResults['!cols'] = [
      { wch: 22 }, // Student Name
      { wch: 18 }, // Enrollment No
      { wch: 25 }, // Branch
      { wch: 26 }, // Email
      { wch: 30 }, // Mock Test
      { wch: 22 }, // Company
      { wch: 10 }, // Score
      { wch: 12 }, // Total Marks
      { wch: 14 }, // Percentage
      { wch: 10 }, // Correct
      { wch: 10 }, // Wrong
      { wch: 14 }, // Unattempted
      { wch: 14 }, // Time Taken
      { wch: 15 }, // Attempt Date
      { wch: 12 }  // Status
    ];

    wsSummary['!cols'] = [{ wch: 25 }, { wch: 35 }];

    XLSX.utils.book_append_sheet(wb, wsResults, 'Mock Test Results');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Format filename: CampusPro_<CompanyName>_<MockTestName>_Results.xlsx
    const cleanCompany = (test.companyName || 'General').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanTitle = (test.title || 'MockTest').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `CampusPro_${cleanCompany}_${cleanTitle}_Results.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'EXPORT',
        targetEntity: 'Mock Test',
        targetId: test._id,
        targetName: test.title,
        details: `Exported student test results to Excel (${filtered.length} records)`
      });
    }

    res.send(excelBuffer);
  } catch (error) {
    console.error('[Export Mock Test Results Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's past test results
// @route   GET /api/mock-tests/my-results
// @access  Private (Student)
const getMyResults = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).select('_id').lean();
    const studentId = student ? student._id : req.user._id;
    const { page, limit, skip } = getPaginationParams(req.query, { defaultLimit: 20 });

    const query = {
      $or: [{ student: studentId }, { user: req.user._id }]
    };

    const total = await MockResult.countDocuments(query);
    let resultsQuery = MockResult.find(query)
      .select('-answers')
      .populate('mockTest', 'title companyName durationMinutes category')
      .sort({ completedAt: -1 })
      .lean();

    if (req.query.paginate !== 'false' && req.query.all !== 'true') {
      resultsQuery = resultsQuery.skip(skip).limit(limit);
    }

    const results = await resultsQuery;

    res.json({
      success: true,
      count: results.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      },
      data: results
    });
  } catch (error) {
    console.error('[Get My Results Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get individual mock test result with strict object-level authorization
// @route GET /api/mock-tests/results/:resultId
const getMockResultById = async (req, res) => {
  try {
    const { resultId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      return res.status(400).json({ success: false, message: 'Invalid result ID format.', code: 'INVALID_ID' });
    }

    const result = await MockResult.findById(resultId)
      .populate('mockTest', 'title companyName durationMinutes category passPercentage')
      .populate('student', 'enrollmentNo branch year')
      .populate('user', 'name email');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Mock test result not found.', code: 'NOT_FOUND' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'STUDENT') {
      const studentDoc = await Student.findOne({ user: req.user._id }).select('_id').lean();
      const isOwnerUser = result.user && (result.user._id || result.user).toString() === req.user._id.toString();
      const isOwnerStudent = studentDoc && result.student && (result.student._id || result.student).toString() === studentDoc._id.toString();

      if (!isOwnerUser && !isOwnerStudent) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own test results.',
          code: 'FORBIDDEN'
        });
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Get Mock Result By ID Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMockTests,
  getFacultyMockTests,
  getMockTestById,
  createMockTest,
  updateMockTest,
  publishMockTest,
  unpublishMockTest,
  deleteMockTest,
  submitMockTest,
  getMockTestResults,
  exportMockTestResults,
  getMyResults,
  getMockResultById
};

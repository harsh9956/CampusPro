const mongoose = require('mongoose');
const Question = require('../models/Question');
const Company = require('../models/Company');
const { createAuditLog } = require('../services/auditLogService');

// @desc Get company & global questions with filters & pagination
// @route GET /api/questions
// @access Private
const getQuestions = async (req, res) => {
  try {
    const {
      topic,
      company,
      companyId,
      companyName,
      difficulty,
      roundType,
      frequency,
      status,
      search,
      page = 1,
      limit = 20
    } = req.query;

    let query = {};

    // Role-based status filter: Students ONLY see PUBLISHED questions
    if (req.user && req.user.role === 'student') {
      query.status = 'PUBLISHED';
    } else if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    // Topic Filter
    if (topic && topic !== 'ALL') {
      query.topic = new RegExp(`^${topic.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i');
    }

    // Company Filter (match ID or name in companyName or companyNames)
    const companyFilter = company || companyId || companyName;
    if (companyFilter && companyFilter !== 'ALL') {
      const companyRegex = new RegExp(companyFilter.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      query.$or = query.$or || [];
      query.$or.push(
        { companyName: companyRegex },
        { companyNames: companyRegex }
      );
      if (typeof companyFilter === 'string' && companyFilter.length === 24 && mongoose.Types.ObjectId.isValid(companyFilter)) {
        query.$or.push({ company: companyFilter }, { companies: companyFilter });
      }
    }

    // Difficulty Filter
    if (difficulty && difficulty !== 'ALL') {
      query.difficulty = new RegExp(`^${difficulty}$`, 'i');
    }

    // Round Type Filter
    if (roundType && roundType !== 'ALL') {
      query.roundType = new RegExp(`^${roundType}$`, 'i');
    }

    // Frequency Filter
    if (frequency && frequency !== 'ALL') {
      query.frequency = new RegExp(`^${frequency}$`, 'i');
    }

    // Search filter across text, topic, company, tags, explanation
    if (search) {
      const searchRegex = new RegExp(search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      const searchOr = [
        { questionText: searchRegex },
        { question: searchRegex },
        { answer: searchRegex },
        { explanation: searchRegex },
        { topic: searchRegex },
        { companyName: searchRegex },
        { companyNames: searchRegex },
        { tags: searchRegex }
      ];

      if (query.$or) {
        // Combine company $or with search $or using $and
        query = {
          $and: [{ $or: query.$or }, { $or: searchOr }],
          ...Object.fromEntries(Object.entries(query).filter(([k]) => k !== '$or'))
        };
      } else {
        query.$or = searchOr;
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = limit === 'ALL' ? 0 : parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await Question.countDocuments(query);

    let queryExec = Question.find(query).sort({ createdAt: -1, frequency: -1 });
    if (limitNum > 0) {
      queryExec = queryExec.skip(skip).limit(limitNum);
    }

    const questions = await queryExec
      .populate('company', 'name logo industry')
      .populate('companies', 'name logo industry');

    res.json({
      success: true,
      count: questions.length,
      total,
      page: pageNum,
      pages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      data: questions
    });
  } catch (error) {
    console.error('[Get Questions Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get Question Statistics
// @route GET /api/questions/stats
// @access Private
const getQuestionStats = async (req, res) => {
  try {
    const totalQuestions = await Question.countDocuments();
    const publishedCount = await Question.countDocuments({ status: 'PUBLISHED' });
    const draftCount = await Question.countDocuments({ status: 'DRAFT' });
    const highFrequencyCount = await Question.countDocuments({ frequency: 'High' });

    const distinctCompanies = await Question.distinct('companyName');
    const distinctTopics = await Question.distinct('topic');

    res.json({
      success: true,
      data: {
        totalQuestions,
        publishedCount,
        draftCount,
        companiesCount: distinctCompanies.filter(Boolean).length,
        topicsCount: distinctTopics.filter(Boolean).length,
        highFrequencyCount
      }
    });
  } catch (error) {
    console.error('[Get Question Stats Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get Dynamic Metadata (Topics & Companies in database)
// @route GET /api/questions/meta
// @access Private
const getQuestionMeta = async (req, res) => {
  try {
    const distinctTopics = await Question.distinct('topic');
    const distinctCompanyNames = await Question.distinct('companyName');
    const dbCompanies = await Company.find({}, 'name logo industry');

    const topics = Array.from(new Set([
      'Java', 'C', 'C++', 'Python', 'JavaScript', 'React', 'HTML', 'CSS',
      'SQL', 'DBMS', 'OOP', 'Operating System', 'Computer Networks', 'DSA', 'Aptitude', 'HR',
      ...distinctTopics.filter(Boolean)
    ]));

    const companyNameSet = new Set(dbCompanies.map(c => c.name));
    distinctCompanyNames.forEach(name => {
      if (name && name !== 'General') companyNameSet.add(name);
    });
    const companies = Array.from(companyNameSet);

    res.json({
      success: true,
      data: {
        topics,
        companies,
        dbCompanies
      }
    });
  } catch (error) {
    console.error('[Get Question Meta Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get single question details by ID
// @route GET /api/questions/:id
// @access Private
const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('company', 'name logo industry')
      .populate('companies', 'name logo industry');

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    if (req.user.role === 'student' && question.status !== 'PUBLISHED') {
      return res.status(403).json({ success: false, message: 'Question not accessible.' });
    }

    res.json({ success: true, data: question });
  } catch (error) {
    console.error('[Get Question By ID Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create question
// @desc Create question
// @route POST /api/questions
// @access Private (Faculty/Admin)
const createQuestion = async (req, res) => {
  try {
    const {
      questionText,
      question,
      answer,
      explanation,
      company,
      companyId,
      companies,
      companyName,
      companyNames,
      topic,
      difficulty,
      roundType,
      frequency,
      yearAsked,
      askedInYear,
      tags,
      status
    } = req.body;

    const qText = questionText || question;
    if (!qText || !qText.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is required.' });
    }
    if (!answer || !answer.trim()) {
      return res.status(400).json({ success: false, message: 'Answer / Solution is required.' });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, message: 'Topic is required.' });
    }

    // Process company IDs
    let inputCompanyIds = [];
    if (Array.isArray(companies)) {
      inputCompanyIds = companies;
    } else if (companyId || company) {
      inputCompanyIds = [companyId || company];
    }

    // Filter valid Mongo ObjectIds
    const validObjectIds = inputCompanyIds.filter(
      id => typeof id === 'string' && id.length === 24 && mongoose.Types.ObjectId.isValid(id)
    );

    let dbCompanies = [];
    if (validObjectIds.length > 0) {
      dbCompanies = await Company.find({ _id: { $in: validObjectIds } });
    }

    if (!dbCompanies || dbCompanies.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid company reference from the database is required. Please select or add a company.'
      });
    }

    const processedCompanies = dbCompanies.map(c => c._id);
    const processedCompanyNames = dbCompanies.map(c => c.name);

    // Process tags array
    let processedTags = [];
    if (Array.isArray(tags)) {
      processedTags = tags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim()) {
      processedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const newQuestion = new Question({
      questionText: qText.trim(),
      question: qText.trim(),
      answer: answer.trim(),
      explanation: (explanation || '').trim(),
      company: processedCompanies[0],
      companies: processedCompanies,
      companyName: processedCompanyNames.join(', '),
      companyNames: processedCompanyNames,
      topic: topic.trim(),
      difficulty: difficulty || 'Medium',
      roundType: roundType || 'Technical',
      frequency: frequency || 'High',
      yearAsked: yearAsked || askedInYear || 2026,
      askedInYear: yearAsked || askedInYear || 2026,
      tags: processedTags,
      status: (status || 'PUBLISHED').toUpperCase(),
      createdBy: req.user._id,
      createdByName: req.user.name || 'Faculty Coordinator'
    });

    await newQuestion.save();

    if (req.user) {
      const qTextStr = newQuestion.questionText || newQuestion.question || 'Question';
      await createAuditLog({
        user: req.user,
        actionType: 'CREATE',
        targetEntity: 'Question',
        targetId: newQuestion._id,
        targetName: qTextStr.length > 50 ? `${qTextStr.substring(0, 50)}...` : qTextStr,
        details: `Created ${newQuestion.difficulty} question for topic ${newQuestion.topic} linked to ${processedCompanyNames.join(', ')}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Question added successfully.',
      data: newQuestion
    });
  } catch (error) {
    console.error('[Create Question Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update question
// @route PUT /api/questions/:id
// @access Private (Faculty/Admin)
const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    const {
      questionText,
      question: qBodyText,
      answer,
      explanation,
      company,
      companyId,
      companies,
      companyName,
      companyNames,
      topic,
      difficulty,
      roundType,
      frequency,
      yearAsked,
      askedInYear,
      tags,
      status
    } = req.body;

    const qText = questionText || qBodyText;
    if (qText !== undefined) {
      question.questionText = qText.trim();
      question.question = qText.trim();
    }
    if (answer !== undefined) question.answer = answer.trim();
    if (explanation !== undefined) question.explanation = explanation.trim();
    if (topic !== undefined) question.topic = topic.trim();
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (roundType !== undefined) question.roundType = roundType;
    if (frequency !== undefined) question.frequency = frequency;
    if (yearAsked !== undefined || askedInYear !== undefined) {
      const yr = yearAsked || askedInYear;
      question.yearAsked = yr;
      question.askedInYear = yr;
    }
    if (status !== undefined) question.status = status.toUpperCase();

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        question.tags = tags.map(t => String(t).trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        question.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    if (companies !== undefined || companyId !== undefined || company !== undefined) {
      let inputCompanyIds = [];
      if (Array.isArray(companies)) {
        inputCompanyIds = companies;
      } else if (companyId || company) {
        inputCompanyIds = [companyId || company];
      }

      const validObjectIds = inputCompanyIds.filter(
        id => typeof id === 'string' && id.length === 24 && mongoose.Types.ObjectId.isValid(id)
      );

      if (validObjectIds.length > 0) {
        const dbCompanies = await Company.find({ _id: { $in: validObjectIds } });
        if (dbCompanies && dbCompanies.length > 0) {
          question.companies = dbCompanies.map(c => c._id);
          question.company = dbCompanies[0]._id;
          question.companyNames = dbCompanies.map(c => c.name);
          question.companyName = dbCompanies.map(c => c.name).join(', ');
        }
      }
    }

    await question.save();

    if (req.user) {
      const qTextStr = question.questionText || question.question || 'Question';
      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Question',
        targetId: question._id,
        targetName: qTextStr.length > 50 ? `${qTextStr.substring(0, 50)}...` : qTextStr,
        details: `Updated question details for topic ${question.topic}`
      });
    }

    res.json({
      success: true,
      message: 'Question updated successfully.',
      data: question
    });
  } catch (error) {
    console.error('[Update Question Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete question
// @route DELETE /api/questions/:id
// @access Private (Faculty/Admin)
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    await Question.findByIdAndDelete(req.params.id);

    if (req.user) {
      const qTextStr = question.questionText || question.question || 'Question';
      await createAuditLog({
        user: req.user,
        actionType: 'DELETE',
        targetEntity: 'Question',
        targetId: question._id,
        targetName: qTextStr.length > 50 ? `${qTextStr.substring(0, 50)}...` : qTextStr,
        details: `Deleted question from topic ${question.topic}`
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully.'
    });
  } catch (error) {
    console.error('[Delete Question Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getQuestions,
  getQuestionStats,
  getQuestionMeta,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion
};

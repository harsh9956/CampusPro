const ResumeAnalysis = require('../models/ResumeAnalysis');
const { extractTextFromFileBuffer, analyzeResumeAgainstJD } = require('../services/resumeAnalyzerService');

/**
 * @desc Analyze Resume against Job Description (File or Text)
 * @route POST /api/resume-analyzer/analyze
 * @access Private (Student)
 */
const analyzeResume = async (req, res) => {
  try {
    let resumeText = '';
    let resumeFileName = 'Uploaded_Resume.pdf';

    // 1. Extract Resume File or Text
    if (req.files && req.files.resume && req.files.resume[0]) {
      const resumeFile = req.files.resume[0];
      resumeFileName = resumeFile.originalname;
      resumeText = await extractTextFromFileBuffer(
        resumeFile.buffer,
        resumeFile.originalname,
        resumeFile.mimetype
      );
    } else if (req.body.resumeText && req.body.resumeText.trim()) {
      resumeText = req.body.resumeText.trim();
      resumeFileName = 'Pasted_Resume_Text';
    }

    if (!resumeText) {
      return res.status(400).json({
        message: 'Please upload a valid resume document (PDF or DOCX) or paste resume text.'
      });
    }

    // 2. Extract Job Description File or Text
    let jdText = '';
    let jdFileName = 'Job_Description.txt';

    if (req.files && req.files.jdFile && req.files.jdFile[0]) {
      const jdFile = req.files.jdFile[0];
      jdFileName = jdFile.originalname;
      jdText = await extractTextFromFileBuffer(
        jdFile.buffer,
        jdFile.originalname,
        jdFile.mimetype
      );
    } else if (req.body.jdText && req.body.jdText.trim()) {
      jdText = req.body.jdText.trim();
      jdFileName = 'Pasted_Job_Description';
    }

    if (!jdText) {
      return res.status(400).json({
        message: 'Please upload a valid Job Description document (PDF or DOCX) or paste Job Description text.'
      });
    }

    // 3. Perform Fresh Dynamic ATS Analysis
    const analysis = analyzeResumeAgainstJD(resumeText, jdText);

    // 4. Save Fresh Unique Document to MongoDB
    let savedRecord = null;
    if (req.user && req.user._id) {
      savedRecord = await ResumeAnalysis.create({
        user: req.user._id,
        resumeFileName,
        jdFileName,
        jobRole: analysis.jobRole,
        score: analysis.score,
        matchLevel: analysis.matchLevel,
        scoreBreakdown: analysis.scoreBreakdown,
        requiredSkills: analysis.requiredSkills,
        preferredSkills: analysis.preferredSkills,
        matchedSkills: analysis.matchedSkills,
        missingRequiredSkills: analysis.missingRequiredSkills,
        missingPreferredSkills: analysis.missingPreferredSkills,
        softSkills: analysis.softSkills,
        educationRequirements: analysis.educationRequirements,
        experienceRequirements: analysis.experienceRequirements,
        matchedKeywords: analysis.matchedKeywords,
        missingKeywords: analysis.missingKeywords,
        skillGap: analysis.skillGap,
        suggestions: analysis.suggestions,
        preparationChecklist: analysis.preparationChecklist
      });
    }

    // 5. Return Full Structured Payload
    return res.json({
      _id: savedRecord ? savedRecord._id : undefined,
      score: analysis.score,
      matchLevel: analysis.matchLevel,
      jobRole: analysis.jobRole,
      scoreBreakdown: analysis.scoreBreakdown,
      requiredSkills: analysis.requiredSkills,
      preferredSkills: analysis.preferredSkills,
      matchedSkills: analysis.matchedSkills,
      missingRequiredSkills: analysis.missingRequiredSkills,
      missingPreferredSkills: analysis.missingPreferredSkills,
      softSkills: analysis.softSkills,
      educationRequirements: analysis.educationRequirements,
      experienceRequirements: analysis.experienceRequirements,
      matchedKeywords: analysis.matchedKeywords,
      missingKeywords: analysis.missingKeywords,
      skillGap: analysis.skillGap,
      suggestions: analysis.suggestions,
      preparationChecklist: analysis.preparationChecklist,
      disclaimer: analysis.disclaimer,
      resumeFileName,
      jdFileName,
      createdAt: savedRecord ? savedRecord.createdAt : new Date()
    });
  } catch (error) {
    console.error('[Resume Analyzer Controller Error]', error);
    return res.status(500).json({
      message: error.message || 'Server error while parsing and analyzing documents.'
    });
  }
};

/**
 * @desc Get student's previous resume analyses
 * @route GET /api/resume-analyzer/history
 * @access Private (Student)
 */
const getAnalysisHistory = async (req, res) => {
  try {
    const history = await ResumeAnalysis.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(15);

    return res.json(history);
  } catch (error) {
    console.error('[Get History Error]', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  analyzeResume,
  getAnalysisHistory
};

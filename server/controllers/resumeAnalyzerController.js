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
    let resumeUrl = '';
    let resumePublicId = '';

    // 1. Extract Resume File or Text
    if (req.files && req.files.resume && req.files.resume[0]) {
      const resumeFile = req.files.resume[0];
      resumeFileName = resumeFile.originalname;
      resumeText = await extractTextFromFileBuffer(
        resumeFile.buffer,
        resumeFile.originalname,
        resumeFile.mimetype
      );

      // Store in campuspro/students/resume-analysis
      try {
        const { uploadBuffer, CLOUDINARY_FOLDERS } = require('../services/cloudinaryService');
        const uploadResult = await uploadBuffer({
          buffer: resumeFile.buffer,
          folder: CLOUDINARY_FOLDERS.STUDENT_RESUME_ANALYSIS,
          originalname: resumeFile.originalname,
          mimetype: resumeFile.mimetype,
          resourceType: 'auto'
        });
        resumeUrl = uploadResult.secureUrl;
        resumePublicId = uploadResult.publicId;
      } catch (uploadErr) {
        console.warn('[Resume Analysis Storage Warning]', uploadErr.message);
      }
    } else if (req.body.resumeText && req.body.resumeText.trim()) {
      resumeText = req.body.resumeText.trim();
      resumeFileName = 'Pasted_Resume_Text';
    }

    if (!resumeText) {
      return res.status(400).json({
        message: 'Please upload a valid resume document (PDF, DOC, DOCX up to 10 MB) or paste resume text.'
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
        message: 'Please upload a valid Job Description document (PDF, DOC, DOCX, TXT up to 10 MB) or paste Job Description text.'
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
        resumeUrl,
        resumePublicId,
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
      resumeUrl,
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

/**
 * @desc Get single resume analysis by ID with strict privacy RBAC
 * @route GET /api/resume-analyzer/:id
 * @access Private (Student can only view their own; Faculty/Admin can view)
 */
const getAnalysisById = async (req, res) => {
  try {
    const analysis = await ResumeAnalysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Resume analysis not found.' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'STUDENT' && !analysis.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You can only view your own resume analyses.' });
    }

    return res.json(analysis);
  } catch (error) {
    console.error('[Get Analysis Error]', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Delete resume analysis and clean up storage
 * @route DELETE /api/resume-analyzer/:id
 * @access Private (Student owner or Admin)
 */
const deleteAnalysis = async (req, res) => {
  try {
    const analysis = await ResumeAnalysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Resume analysis not found.' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'STUDENT' && !analysis.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own resume analyses.' });
    }

    if (analysis.resumePublicId) {
      const { deleteAsset } = require('../services/cloudinaryService');
      await deleteAsset(analysis.resumePublicId);
    }

    await ResumeAnalysis.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Resume analysis deleted successfully.' });
  } catch (error) {
    console.error('[Delete Analysis Error]', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  analyzeResume,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis
};

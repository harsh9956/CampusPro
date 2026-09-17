const PlacementDrive = require('../models/PlacementDrive');
const Company = require('../models/Company');
const Student = require('../models/Student');
const Application = require('../models/Application');
const { checkEligibility } = require('../services/eligibilityService');
const { createAuditLog } = require('../services/auditLogService');
const path = require('path');
const fs = require('fs');

// Helper to validate URL
const isValidUrl = (urlStr) => {
  if (!urlStr || !urlStr.trim()) return true;
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return /^https?:\/\/.+/i.test(urlStr.trim());
  }
};

// @desc Upload JD PDF File
// @route POST /api/drives/upload-jd
// @access Private (Admin/Faculty)
const uploadJdPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select a PDF file to upload.' });
    }

    const fileUrl = `/uploads/jds/${req.file.filename}`;
    const jdData = {
      fileName: req.file.originalname,
      fileUrl,
      fileType: req.file.mimetype || 'application/pdf',
      fileSize: req.file.size,
      uploadedAt: new Date()
    };

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'UPLOAD',
        targetEntity: 'JD',
        targetName: req.file.originalname,
        details: `Uploaded Job Description document: ${req.file.originalname}`
      });
    }

    res.json({
      success: true,
      message: 'JD PDF uploaded successfully.',
      data: jdData
    });
  } catch (error) {
    console.error('[Upload JD PDF Error]', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all placement drives
// @route GET /api/drives
const getDrives = async (req, res) => {
  try {
    const { academicYear, status, companyId } = req.query;
    let query = {};
    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;
    if (companyId) query.company = companyId;

    let drives = await PlacementDrive.find(query)
      .populate('company', 'name logo website industry location')
      .sort({ driveDate: 1 });

    if (req.user && req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      const studentApps = await Application.find({ student: student?._id }).select('drive status');
      const appliedMap = {};
      studentApps.forEach(a => { appliedMap[a.drive.toString()] = a.status; });

      drives = drives.map(driveDoc => {
        const driveObj = driveDoc.toObject();
        const evalResult = checkEligibility(student, driveObj);
        driveObj.eligibility = evalResult;
        driveObj.isApplied = Boolean(appliedMap[driveDoc._id.toString()]);
        driveObj.applicationStatus = appliedMap[driveDoc._id.toString()] || null;
        return driveObj;
      });
    }

    res.json(drives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single drive detail
// @route GET /api/drives/:id
const getDriveById = async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id).populate('company');
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });

    let responseObj = drive.toObject();
    if (req.user && req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      responseObj.eligibility = checkEligibility(student, responseObj);
      const app = await Application.findOne({ drive: drive._id, student: student?._id });
      responseObj.isApplied = Boolean(app);
      responseObj.application = app || null;
    }

    res.json(responseObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create placement drive (supports selecting existing company OR creating new company)
// @route POST /api/drives
const createDrive = async (req, res) => {
  try {
    const {
      company,
      companyId,
      newCompanyName,
      jobRole,
      package,
      location,
      driveDate,
      deadline,
      minCgpa,
      maxBacklogs,
      eligibleBranches,
      eligiblePassingYears,
      jobDescription,
      jobDescriptionText,
      applyLink,
      selectionProcess,
      selectionRounds,
      academicYear
    } = req.body;

    let targetCompanyId = company || companyId;
    let createdNewCompany = false;

    // Check if "+ Add New Company" or newCompanyName was provided
    if (targetCompanyId === 'ADD_NEW_COMPANY' || targetCompanyId === 'NEW_COMPANY' || !targetCompanyId || (newCompanyName && !targetCompanyId)) {
      if (!newCompanyName || !newCompanyName.trim()) {
        return res.status(400).json({ message: 'Please enter a company name.' });
      }
      const cleanName = newCompanyName.trim();
      const existingCompany = await Company.findOne({
        name: new RegExp(`^${cleanName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i')
      });

      if (existingCompany) {
        targetCompanyId = existingCompany._id;
      } else {
        const newComp = await Company.create({
          name: cleanName,
          industry: 'Software & IT Services',
          location: location || 'India',
          description: `${cleanName} hiring drive.`,
          status: 'Active'
        });
        targetCompanyId = newComp._id;
        createdNewCompany = true;
      }
    }

    if (!targetCompanyId) {
      return res.status(400).json({ message: 'Please select a company or enter a new company name.' });
    }

    if (applyLink && !isValidUrl(applyLink)) {
      return res.status(400).json({ message: 'Official Apply Link must be a valid HTTP or HTTPS URL (e.g. https://company.com/careers).' });
    }

    // Process selectionProcess cleanly without hardcoded default fallback
    let formattedProcess = [];
    const rawProcess = selectionProcess || selectionRounds;
    if (Array.isArray(rawProcess)) {
      formattedProcess = rawProcess
        .filter(r => r && (r.roundName || r.name) && String(r.roundName || r.name).trim())
        .map((r, idx) => ({
          order: r.order || r.roundNumber || idx + 1,
          roundName: (r.roundName || r.name).trim(),
          roundType: r.roundType || 'Other',
          description: r.description || '',
          mode: r.mode || 'Online',
          duration: r.duration ? Number(r.duration) : null,
          date: r.date ? new Date(r.date) : null
        }));
    }

    const formattedLegacyRounds = formattedProcess.map(r => ({
      roundNumber: r.order,
      name: r.roundName,
      mode: r.mode || 'Online',
      venue: (r.mode === 'Online' || r.mode === 'ONLINE') ? 'Virtual Link / Online' : 'Placement Hall',
      date: r.date
    }));

    const drive = await PlacementDrive.create({
      company: targetCompanyId,
      jobRole,
      package,
      location: location || 'Noida',
      driveDate: new Date(driveDate),
      deadline: new Date(deadline),
      minCgpa: Number(minCgpa),
      maxBacklogs: Number(maxBacklogs),
      eligibleBranches: Array.isArray(eligibleBranches) ? eligibleBranches : String(eligibleBranches).split(',').map(b => b.trim()),
      eligiblePassingYears: eligiblePassingYears || [2027],
      jobDescription: jobDescription || null,
      jobDescriptionText: jobDescriptionText || (typeof jobDescription === 'string' ? jobDescription : ''),
      applyLink: (applyLink || '').trim(),
      selectionProcess: formattedProcess,
      selectionRounds: formattedLegacyRounds,
      academicYear: academicYear || '2026-27'
    });

    const populatedDrive = await PlacementDrive.findById(drive._id).populate('company');
    const responseObj = populatedDrive.toObject();
    responseObj.createdNewCompany = createdNewCompany;
    responseObj.message = createdNewCompany
      ? 'Company and Placement Drive created successfully.'
      : 'Placement Drive created successfully.';

    if (req.user) {
      const compName = populatedDrive.company ? populatedDrive.company.name : 'Company';
      await createAuditLog({
        user: req.user,
        actionType: 'CREATE',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${compName} ${drive.jobRole}`,
        details: `Created new placement drive for ${compName} (${drive.jobRole})`
      });
    }

    res.status(201).json(responseObj);
  } catch (error) {
    console.error('[Create Drive Error]', error);
    res.status(500).json({ message: error.message || 'Failed to create placement drive. Please try again.' });
  }
};

// @desc Update drive (supports company lookup or new company creation)
// @route PUT /api/drives/:id
const updateDrive = async (req, res) => {
  try {
    const { company, newCompanyName, applyLink, selectionProcess, selectionRounds } = req.body;
    let updateFields = { ...req.body };

    if (company === 'ADD_NEW_COMPANY' || company === 'NEW_COMPANY' || (newCompanyName && (!company || company === 'ADD_NEW_COMPANY'))) {
      if (!newCompanyName || !newCompanyName.trim()) {
        return res.status(400).json({ message: 'Please enter a company name.' });
      }
      const cleanName = newCompanyName.trim();
      const existingCompany = await Company.findOne({
        name: new RegExp(`^${cleanName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i')
      });

      if (existingCompany) {
        updateFields.company = existingCompany._id;
      } else {
        const newComp = await Company.create({
          name: cleanName,
          industry: 'Software & IT Services',
          location: req.body.location || 'India',
          description: `${cleanName} hiring drive.`,
          status: 'Active'
        });
        updateFields.company = newComp._id;
      }
      delete updateFields.newCompanyName;
    }

    if (applyLink && !isValidUrl(applyLink)) {
      return res.status(400).json({ message: 'Official Apply Link must be a valid HTTP or HTTPS URL (e.g. https://company.com/careers).' });
    }

    const rawProcess = selectionProcess || selectionRounds;
    if (Array.isArray(rawProcess)) {
      const formattedProcess = rawProcess
        .filter(r => r && (r.roundName || r.name) && String(r.roundName || r.name).trim())
        .map((r, idx) => ({
          order: r.order || r.roundNumber || idx + 1,
          roundName: (r.roundName || r.name).trim(),
          roundType: r.roundType || 'Other',
          description: r.description || '',
          mode: r.mode || 'Online',
          duration: r.duration ? Number(r.duration) : null,
          date: r.date ? new Date(r.date) : null
        }));

      updateFields.selectionProcess = formattedProcess;
      updateFields.selectionRounds = formattedProcess.map(r => ({
        roundNumber: r.order,
        name: r.roundName,
        mode: r.mode || 'Online',
        venue: (r.mode === 'Online' || r.mode === 'ONLINE') ? 'Virtual Link / Online' : 'Placement Hall',
        date: r.date
      }));
    }

    const drive = await PlacementDrive.findByIdAndUpdate(req.params.id, updateFields, { new: true }).populate('company');
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });

    if (req.user) {
      const compName = drive.company ? drive.company.name : 'Company';
      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${compName} ${drive.jobRole}`,
        details: `Updated placement drive criteria for ${compName} (${drive.jobRole})`
      });
    }

    res.json(drive);
  } catch (error) {
    console.error('[Update Drive Error]', error);
    res.status(500).json({ message: error.message || 'Failed to update placement drive. Please try again.' });
  }
};

// @desc Delete drive
// @route DELETE /api/drives/:id
const deleteDrive = async (req, res) => {
  try {
    const drive = await PlacementDrive.findByIdAndDelete(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'DELETE',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: drive.jobRole || 'Placement Drive',
        details: `Deleted placement drive for role: ${drive.jobRole}`
      });
    }

    res.json({ message: 'Drive deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadJdPdf,
  getDrives,
  getDriveById,
  createDrive,
  updateDrive,
  deleteDrive
};

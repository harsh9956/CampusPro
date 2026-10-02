const PlacementDrive = require('../models/PlacementDrive');
const Company = require('../models/Company');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Section = require('../models/Section');
const { checkEligibility } = require('../services/eligibilityService');
const { createAuditLog } = require('../services/auditLogService');
const { getCurrentAcademicYear } = require('../services/academicYearService');
const { checkHistoricalOperation } = require('../middleware/historicalGuard');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { getPaginationParams, formatPaginationResponse } = require('../utils/pagination');

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

// Validation & Normalization helper for targetAudience
const validateAndFormatTargetAudience = async (body, isNewDrive = false) => {
  let audienceType = 'ALL_ACTIVE_STUDENTS';
  if (body.targetAudience?.type) {
    audienceType = body.targetAudience.type;
  } else if (body.notificationSettings?.targetAudience) {
    audienceType = body.notificationSettings.targetAudience;
  } else if (typeof body.targetAudience === 'string') {
    audienceType = body.targetAudience;
  }

  // Normalize aliases
  if (audienceType === 'ALL_ACTIVE') audienceType = 'ALL_ACTIVE_STUDENTS';
  if (audienceType === 'ELIGIBLE_ONLY') audienceType = 'ELIGIBLE_STUDENTS_ONLY';

  let rawSectionIds = [];
  if (Array.isArray(body.targetAudience?.sectionIds)) {
    rawSectionIds = body.targetAudience.sectionIds;
  } else if (Array.isArray(body.notificationSettings?.targetSections)) {
    rawSectionIds = body.notificationSettings.targetSections;
  } else if (Array.isArray(body.targetSections)) {
    rawSectionIds = body.targetSections;
  } else if (Array.isArray(body.sectionIds)) {
    rawSectionIds = body.sectionIds;
  }

  if (audienceType === 'SPECIFIC_SECTIONS') {
    if (!rawSectionIds || rawSectionIds.length === 0) {
      const err = new Error('Please select at least one section.');
      err.statusCode = 400;
      throw err;
    }

    // De-duplicate & validate ObjectIds
    const uniqueIds = [...new Set(rawSectionIds.map(id => (id?._id || id).toString().trim()))];
    if (uniqueIds.length === 0) {
      const err = new Error('Please select at least one section.');
      err.statusCode = 400;
      throw err;
    }

    for (const id of uniqueIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const err = new Error(`Invalid section ID: ${id}`);
        err.statusCode = 400;
        throw err;
      }
    }

    // Verify all section IDs exist in MongoDB Section collection
    const existingSections = await Section.find({ _id: { $in: uniqueIds } });
    if (existingSections.length !== uniqueIds.length) {
      const err = new Error('One or more selected sections do not exist.');
      err.statusCode = 400;
      throw err;
    }

    // Inactive section guard for new drives (Requirement #14)
    if (isNewDrive) {
      const inactiveSection = existingSections.find(s => s.isActive === false || s.status === 'inactive');
      if (inactiveSection) {
        const err = new Error(`Section '${inactiveSection.name}' is inactive and cannot be targeted for new placement drives.`);
        err.statusCode = 400;
        throw err;
      }
    }

    return {
      type: 'SPECIFIC_SECTIONS',
      sectionIds: uniqueIds
    };
  }

  return {
    type: audienceType,
    sectionIds: []
  };
};

// @desc Upload JD PDF/Document File
// @route POST /api/drives/upload-jd
// @access Private (Admin/Faculty)
const uploadJdPdf = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please select a JD document to upload (PDF, DOC, DOCX, TXT up to 10 MB).' });
    }

    const { uploadBuffer, CLOUDINARY_FOLDERS } = require('../services/cloudinaryService');

    const uploadResult = await uploadBuffer({
      buffer: req.file.buffer,
      folder: CLOUDINARY_FOLDERS.DRIVE_JDS,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      resourceType: 'auto'
    });

    const jdData = {
      fileName: req.file.originalname,
      fileUrl: uploadResult.secureUrl,
      secureUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      fileType: req.file.mimetype || 'application/pdf',
      fileSize: uploadResult.fileSize,
      storageProvider: uploadResult.storageProvider,
      uploadedAt: uploadResult.uploadedAt || new Date()
    };

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'UPLOAD',
        targetEntity: 'JD',
        targetName: req.file.originalname,
        details: `Uploaded Job Description document: ${req.file.originalname} (${(uploadResult.fileSize / 1024).toFixed(1)} KB)`
      });
    }

    res.json({
      success: true,
      message: 'JD document uploaded successfully.',
      data: jdData
    });
  } catch (error) {
    console.error('[Upload JD PDF Error]', error);
    const statusCode = error.statusCode || (error.code === 'STORAGE_UNAVAILABLE' ? 503 : 500);
    res.status(statusCode).json({
      success: false,
      code: error.code || 'FILE_UPLOAD_FAILED',
      message: error.message || 'Failed to upload JD.'
    });
  }
};

// @desc Get all placement drives
// @route GET /api/drives
const getDrives = async (req, res) => {
  try {
    const { academicYear, status, companyId } = req.query;
    let query = {};

    const userRole = (req.user?.role || '').toUpperCase();
    let student = null;

    if (userRole === 'STUDENT') {
      student = await Student.findOne({ user: req.user._id })
        .select('department section branch year cgpa backlogs tenthPercentage twelfthPercentage enrollmentNo academicYear')
        .populate('department', 'name code isActive')
        .populate('section', 'name code isActive')
        .lean();

      // BACKEND ENFORCEMENT: Students strictly see ONLY placement drives for their own registered academic year
      const studentYear = student?.academicYear || req.user.academicYear || (await getCurrentAcademicYear());
      query.academicYear = studentYear;
      query.status = { $nin: ['Draft', 'DRAFT'] };
    } else {
      let targetYear = academicYear;
      if (targetYear === undefined || targetYear === null || targetYear === '') {
        targetYear = await getCurrentAcademicYear();
      }
      if (targetYear && targetYear !== 'ALL') {
        query.academicYear = String(targetYear).trim();
      }
    }

    if (status) query.status = status;
    if (companyId) query.company = companyId;

    let drives = await PlacementDrive.find(query)
      .populate('company', 'name logo website industry location')
      .populate('notificationSettings.targetSections', 'name code isActive')
      .populate('targetAudience.sectionIds', 'name code isActive')
      .sort({ driveDate: 1 })
      .lean();

    if (userRole === 'STUDENT' && student) {
      // CRITICAL SERVER-SIDE FILTER: Hide drives where student's section is not targeted
      const studentSecId = student?.section?._id
        ? student.section._id.toString()
        : (student?.section ? student.section.toString() : null);

      drives = drives.filter(driveDoc => {
        const audType = driveDoc.targetAudience?.type || driveDoc.notificationSettings?.targetAudience;
        if (audType === 'SPECIFIC_SECTIONS') {
          const allowedSecIds = (
            driveDoc.targetAudience?.sectionIds ||
            driveDoc.notificationSettings?.targetSections ||
            []
          ).map(s => (s?._id || s).toString());

          if (!studentSecId || !allowedSecIds.includes(studentSecId)) {
            return false; // Student is in a different section; exclude drive completely
          }
        }
        return true;
      });

      const studentApps = await Application.find({ student: student?._id }).select('drive status').lean();
      const appliedMap = {};
      studentApps.forEach(a => { appliedMap[a.drive.toString()] = a.status; });

      drives = drives.map(driveDoc => {
        const evalResult = checkEligibility(student, driveDoc);
        return {
          ...driveDoc,
          eligibility: evalResult,
          isApplied: Boolean(appliedMap[driveDoc._id.toString()]),
          applicationStatus: appliedMap[driveDoc._id.toString()] || null
        };
      });
    }

    // Support server-side pagination when page/format is requested
    if (req.query.page || req.query.format === 'paginated') {
      const { page, limit, skip } = getPaginationParams(req.query, { defaultLimit: 20 });
      const total = drives.length;
      const paginatedDrives = drives.slice(skip, skip + limit);
      return res.json(formatPaginationResponse(paginatedDrives, total, page, limit));
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
    const drive = await PlacementDrive.findById(req.params.id)
      .populate('company')
      .populate('notificationSettings.targetSections', 'name code isActive')
      .populate('targetAudience.sectionIds', 'name code isActive');
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });

    let responseObj = drive.toObject();

    if (req.user && (req.user.role || '').toUpperCase() === 'STUDENT') {
      if ((drive.status || '').toUpperCase() === 'DRAFT') {
        return res.status(403).json({ message: 'Access denied. This placement drive has not been published yet.' });
      }

      const student = await Student.findOne({ user: req.user._id })
        .populate('department', 'name code isActive')
        .populate('section', 'name code isActive');

      const studentYear = student?.academicYear || req.user.academicYear || (await getCurrentAcademicYear());
      if (drive.academicYear && studentYear && drive.academicYear !== studentYear) {
        return res.status(403).json({
          message: `Access denied. This placement drive belongs to Academic Year ${drive.academicYear}. You can only access drives for Academic Year ${studentYear}.`
        });
      }

      const audType = drive.targetAudience?.type || drive.notificationSettings?.targetAudience;
      if (audType === 'SPECIFIC_SECTIONS') {
        const allowedSecIds = (
          drive.targetAudience?.sectionIds ||
          drive.notificationSettings?.targetSections ||
          []
        ).map(s => (s?._id || s).toString());

        const studentSecId = student?.section?._id
          ? student.section._id.toString()
          : (student?.section ? student.section.toString() : null);

        if (!studentSecId || !allowedSecIds.includes(studentSecId)) {
          return res.status(403).json({
            message: 'You are not authorized to view this placement drive as it is restricted to specific sections.'
          });
        }
      }

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

// Validation & Normalization helper for eligibilityCriteria
const parseEligibilityCriteria = (body, defaultMinCgpa) => {
  const input = body.eligibilityCriteria || {};
  const rawMinCgpa = body.minCgpa !== undefined ? Number(body.minCgpa) : defaultMinCgpa;

  const minimumAcademic = {
    enabled: input.minimumAcademic?.enabled !== undefined ? Boolean(input.minimumAcademic.enabled) : true,
    type: (input.minimumAcademic?.type || 'CGPA').toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'CGPA',
    value: input.minimumAcademic?.value !== undefined ? Number(input.minimumAcademic.value) : (rawMinCgpa || 6.0)
  };

  const highSchool = {
    enabled: Boolean(input.highSchool?.enabled),
    minimumPercentage: input.highSchool?.minimumPercentage !== undefined ? Number(input.highSchool.minimumPercentage) : 60
  };

  const intermediate = {
    enabled: Boolean(input.intermediate?.enabled),
    minimumPercentage: input.intermediate?.minimumPercentage !== undefined ? Number(input.intermediate.minimumPercentage) : 60
  };

  if (minimumAcademic.enabled) {
    if (minimumAcademic.type === 'CGPA') {
      if (isNaN(minimumAcademic.value) || minimumAcademic.value < 0 || minimumAcademic.value > 10) {
        throw new Error('Minimum CGPA must be a valid number between 0 and 10.');
      }
    } else {
      if (isNaN(minimumAcademic.value) || minimumAcademic.value < 0 || minimumAcademic.value > 100) {
        throw new Error('Minimum Percentage must be a valid number between 0 and 100.');
      }
    }
  }

  if (highSchool.enabled) {
    if (isNaN(highSchool.minimumPercentage) || highSchool.minimumPercentage < 0 || highSchool.minimumPercentage > 100) {
      throw new Error('Minimum 10th Percentage must be a valid number between 0 and 100.');
    }
  }

  if (intermediate.enabled) {
    if (isNaN(intermediate.minimumPercentage) || intermediate.minimumPercentage < 0 || intermediate.minimumPercentage > 100) {
      throw new Error('Minimum 12th Percentage must be a valid number between 0 and 100.');
    }
  }

  return { minimumAcademic, highSchool, intermediate };
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

    const eligibilityCriteria = parseEligibilityCriteria(req.body, Number(minCgpa) || 6.0);

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

    const targetAudienceConfig = await validateAndFormatTargetAudience(req.body, true);

    const driveStatus = req.body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    const notificationSettings = {
      sendEmailNotification: req.body.notificationSettings?.sendEmailNotification !== false && req.body.sendEmailNotification !== false,
      createInAppNotification: req.body.notificationSettings?.createInAppNotification !== false && req.body.createInAppNotification !== false,
      targetAudience: targetAudienceConfig.type,
      targetSections: targetAudienceConfig.sectionIds
    };

    const currentYear = await getCurrentAcademicYear();
    const targetYear = academicYear && String(academicYear).trim() ? String(academicYear).trim() : currentYear;

    const histCheck = await checkHistoricalOperation(req, targetYear, 'Placement Drive');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    const drive = await PlacementDrive.create({
      company: targetCompanyId,
      jobRole,
      package,
      location: location || 'Noida',
      driveDate: new Date(driveDate),
      deadline: new Date(deadline),
      minCgpa: eligibilityCriteria.minimumAcademic.enabled && eligibilityCriteria.minimumAcademic.type === 'CGPA' ? eligibilityCriteria.minimumAcademic.value : (Number(minCgpa) || 6.0),
      maxBacklogs: Number(maxBacklogs),
      eligibleBranches: Array.isArray(eligibleBranches) ? eligibleBranches : String(eligibleBranches).split(',').map(b => b.trim()),
      eligiblePassingYears: eligiblePassingYears || [2027],
      eligibilityCriteria,
      jobDescription: jobDescription || null,
      jobDescriptionText: jobDescriptionText || (typeof jobDescription === 'string' ? jobDescription : ''),
      applyLink: (applyLink || '').trim(),
      selectionProcess: formattedProcess,
      selectionRounds: formattedLegacyRounds,
      status: driveStatus,
      publishedAt: driveStatus === 'PUBLISHED' ? new Date() : null,
      notificationSettings,
      targetAudience: targetAudienceConfig,
      academicYear: targetYear
    });

    const populatedDrive = await PlacementDrive.findById(drive._id)
      .populate('company')
      .populate('notificationSettings.targetSections', 'name code isActive')
      .populate('targetAudience.sectionIds', 'name code isActive');
    const responseObj = populatedDrive.toObject();
    responseObj.createdNewCompany = createdNewCompany;
    responseObj.message = createdNewCompany
      ? 'Company and Placement Drive created successfully.'
      : (driveStatus === 'PUBLISHED' ? 'Placement Drive published successfully.' : 'Placement Drive saved as draft.');

    if (req.user) {
      const compName = populatedDrive.company ? populatedDrive.company.name : 'Company';
      await createAuditLog({
        user: req.user,
        actionType: driveStatus === 'PUBLISHED' ? 'PUBLISH' : 'CREATE',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${compName} ${drive.jobRole}`,
        details: `Created new placement drive for ${compName} (${drive.jobRole}) with status ${driveStatus}`
      });
    }

    // If created directly in PUBLISHED state, trigger notifications asynchronously
    if (driveStatus === 'PUBLISHED') {
      const { processDriveNotifications } = require('../services/notificationService');
      processDriveNotifications({
        drive: populatedDrive,
        adminUser: req.user,
        options: notificationSettings
      }).catch(err => console.error('[Async Drive Notification Error]', err));
    }

    res.status(201).json(responseObj);
  } catch (error) {
    console.error('[Create Drive Error]', error);
    const statusCode = error.statusCode || (error.message && (error.message.includes('section') || error.message.includes('URL') || error.message.includes('Percentage') || error.message.includes('CGPA')) ? 400 : 500);
    res.status(statusCode).json({ message: error.message || 'Failed to create placement drive. Please try again.' });
  }
};

// @desc Update drive (supports company lookup or new company creation)
// @route PUT /api/drives/:id
const updateDrive = async (req, res) => {
  try {
    const { company, newCompanyName, applyLink, selectionProcess, selectionRounds, notificationSettings } = req.body;
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

    if (req.body.eligibilityCriteria || req.body.minCgpa !== undefined) {
      const eligibilityCriteria = parseEligibilityCriteria(req.body, Number(req.body.minCgpa) || 6.0);
      updateFields.eligibilityCriteria = eligibilityCriteria;
      if (eligibilityCriteria.minimumAcademic.enabled && eligibilityCriteria.minimumAcademic.type === 'CGPA') {
        updateFields.minCgpa = eligibilityCriteria.minimumAcademic.value;
      }
    }

    if (notificationSettings || req.body.sendEmailNotification !== undefined || req.body.targetAudience !== undefined || req.body.targetSections !== undefined || req.body.sectionIds !== undefined) {
      const targetAudienceConfig = await validateAndFormatTargetAudience(req.body);
      updateFields.notificationSettings = {
        sendEmailNotification: req.body.notificationSettings?.sendEmailNotification !== undefined
          ? Boolean(req.body.notificationSettings.sendEmailNotification)
          : (req.body.sendEmailNotification !== undefined ? Boolean(req.body.sendEmailNotification) : true),
        createInAppNotification: req.body.notificationSettings?.createInAppNotification !== undefined
          ? Boolean(req.body.notificationSettings.createInAppNotification)
          : (req.body.createInAppNotification !== undefined ? Boolean(req.body.createInAppNotification) : true),
        targetAudience: targetAudienceConfig.type,
        targetSections: targetAudienceConfig.sectionIds
      };
      updateFields.targetAudience = targetAudienceConfig;
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

    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });

    const histCheck = await checkHistoricalOperation(req, drive.academicYear, 'Placement Drive');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    const oldJdPublicId = drive.jobDescription && typeof drive.jobDescription === 'object' ? drive.jobDescription.publicId : null;

    // Explicit allowlist to prevent mass-assignment vulnerability
    const allowedDriveFields = [
      'company',
      'companyName',
      'jobRole',
      'jobDescription',
      'package',
      'minCgpa',
      'maxBacklogs',
      'eligibleBranches',
      'deadline',
      'driveDate',
      'location',
      'selectionProcess',
      'selectionRounds',
      'applyLink',
      'status',
      'academicYear',
      'eligibilityCriteria',
      'notificationSettings',
      'targetAudience'
    ];

    const safeDriveUpdate = {};
    for (const f of allowedDriveFields) {
      if (updateFields[f] !== undefined) {
        safeDriveUpdate[f] = updateFields[f];
      }
    }

    Object.assign(drive, safeDriveUpdate);
    await drive.save();

    // If JD was updated/replaced, clean up old JD if not referenced by any other drive
    const newJdPublicId = drive.jobDescription && typeof drive.jobDescription === 'object' ? drive.jobDescription.publicId : null;
    if (updateFields.jobDescription && oldJdPublicId && oldJdPublicId !== newJdPublicId) {
      const otherRef = await PlacementDrive.findOne({
        _id: { $ne: drive._id },
        'jobDescription.publicId': oldJdPublicId
      });
      if (!otherRef) {
        const { deleteAsset } = require('../services/cloudinaryService');
        await deleteAsset(oldJdPublicId);
      }
    }

    const populatedDrive = await PlacementDrive.findById(drive._id)
      .populate('company')
      .populate('notificationSettings.targetSections', 'name code isActive')
      .populate('targetAudience.sectionIds', 'name code isActive');

    if (req.user) {
      const compName = populatedDrive.company ? populatedDrive.company.name : 'Company';
      await createAuditLog({
        user: req.user,
        actionType: 'UPDATE',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${compName} ${drive.jobRole}`,
        details: `Updated placement drive criteria for ${compName} (${drive.jobRole})`
      });
    }

    res.json(populatedDrive);
  } catch (error) {
    console.error('[Update Drive Error]', error);
    const statusCode = error.statusCode || (error.message && (error.message.includes('section') || error.message.includes('URL') || error.message.includes('Percentage') || error.message.includes('CGPA')) ? 400 : 500);
    res.status(statusCode).json({ message: error.message || 'Failed to update placement drive. Please try again.' });
  }
};

// @desc Publish a placement drive & trigger notifications
// @route POST /api/drives/:id/publish
const publishDrive = async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id).populate('company');
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });

    const histCheck = await checkHistoricalOperation(req, drive.academicYear, 'Placement Drive');
    if (!histCheck.allowed) {
      return res.status(histCheck.status || 403).json({
        code: histCheck.code || 'HISTORICAL_YEAR_READ_ONLY',
        message: histCheck.message,
        isHistoricalReadOnly: true
      });
    }

    let targetAudienceConfig;
    if (req.body.targetAudience || req.body.notificationSettings?.targetAudience || req.body.targetSections || req.body.notificationSettings?.targetSections || req.body.sectionIds) {
      targetAudienceConfig = await validateAndFormatTargetAudience(req.body);
    } else {
      const currentSections = (drive.targetAudience?.sectionIds || drive.notificationSettings?.targetSections || []).map(id => (id?._id || id).toString());
      targetAudienceConfig = {
        type: drive.targetAudience?.type || drive.notificationSettings?.targetAudience || 'ALL_ACTIVE_STUDENTS',
        sectionIds: currentSections
      };
    }

    const notificationOptions = {
      sendEmailNotification: req.body.sendEmailNotification !== undefined ? Boolean(req.body.sendEmailNotification) : (drive.notificationSettings?.sendEmailNotification !== false),
      createInAppNotification: req.body.createInAppNotification !== undefined ? Boolean(req.body.createInAppNotification) : (drive.notificationSettings?.createInAppNotification !== false),
      targetAudience: targetAudienceConfig.type,
      targetSections: targetAudienceConfig.sectionIds
    };

    drive.status = 'PUBLISHED';
    drive.publishedAt = drive.publishedAt || new Date();
    drive.notificationSettings = notificationOptions;
    drive.targetAudience = targetAudienceConfig;
    await drive.save();

    const compName = drive.company ? drive.company.name : 'Company';

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'DRIVE_PUBLISHED',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${compName} ${drive.jobRole}`,
        details: `Published placement drive for ${compName} (${drive.jobRole})`
      });
    }

    // Enqueue background notifications into BullMQ queue (Non-blocking worker execution)
    let queueResult = null;
    let queueWarning = null;
    try {
      const { processDriveNotifications } = require('../services/notificationService');
      queueResult = await processDriveNotifications({
        drive,
        adminUser: req.user,
        options: notificationOptions
      });
    } catch (queueErr) {
      console.error('[Drive Notification Queue Error]', queueErr.message);
      queueWarning = `Drive published, but background notification queuing failed: ${queueErr.message}`;
    }

    const recipientCount = queueResult?.totalRecipients ?? 0;
    const message = queueWarning || `Drive published successfully. Notifications queued for ${recipientCount} students.`;

    res.json({
      success: true,
      message,
      queueWarning: queueWarning || undefined,
      totalRecipients: recipientCount,
      emailJobsQueued: queueResult?.emailJobsQueued || 0,
      inAppNotificationsQueued: queueResult?.inAppNotificationsQueued || 0,
      drive
    });
  } catch (error) {
    console.error('[Publish Drive Error]', error);
    const statusCode = error.statusCode || (error.message && (error.message.includes('section') || error.message.includes('URL')) ? 400 : 500);
    res.status(statusCode).json({ message: error.message || 'Failed to publish placement drive.' });
  }
};

// @desc Get notification delivery status metrics for a drive
// @route GET /api/drives/:id/notifications/status
const getDriveNotificationStatus = async (req, res) => {
  try {
    const { getNotificationStatus } = require('../services/notificationService');
    const statusMetrics = await getNotificationStatus(req.params.id);
    res.json({ success: true, status: statusMetrics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Retry failed email notifications for a drive
// @route POST /api/drives/:id/notifications/retry-failed
const retryFailedNotifications = async (req, res) => {
  try {
    const { retryFailedEmails } = require('../services/notificationService');
    const result = await retryFailedEmails(req.params.id, req.user);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to retry email notifications.' });
  }
};

// @desc Delete drive
// @route DELETE /api/drives/:id
const deleteDrive = async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });

    const histCheck = await checkHistoricalOperation(req, drive.academicYear, 'Placement Drive');
    if (!histCheck.allowed) {
      return res.status(histCheck.status).json({
        message: histCheck.message,
        isHistoricalReadOnly: histCheck.isHistoricalReadOnly
      });
    }

    const deletionReason = (req.body?.reason || req.body?.deletionReason || req.query?.reason || '').trim();

    const jdPublicId = drive.jobDescription && typeof drive.jobDescription === 'object' ? drive.jobDescription.publicId : null;
    const jdFileUrl = drive.jobDescription && typeof drive.jobDescription === 'object' ? drive.jobDescription.fileUrl : null;

    await PlacementDrive.findByIdAndDelete(req.params.id);

    // Safe deletion: Check if any other drive references the same JD asset before deleting it
    if (jdPublicId || jdFileUrl) {
      const otherReferencingDrive = await PlacementDrive.findOne({
        $or: [
          jdPublicId ? { 'jobDescription.publicId': jdPublicId } : null,
          jdFileUrl ? { 'jobDescription.fileUrl': jdFileUrl } : null
        ].filter(Boolean)
      });

      if (!otherReferencingDrive && jdPublicId) {
        const { deleteAsset } = require('../services/cloudinaryService');
        await deleteAsset(jdPublicId);
      }
    }

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'DELETE',
        targetEntity: 'Placement Drive',
        targetId: drive._id,
        targetName: `${drive.jobRole || 'Placement Drive'} (${drive.academicYear || 'N/A'})`,
        details: `Deleted placement drive for role: ${drive.jobRole} (Year: ${drive.academicYear})${deletionReason ? ' | Reason: ' + deletionReason : ''}`
      });
    }

    res.json({ message: 'Drive deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Send single diagnostic test email (Admin only, isolates Nodemailer from BullMQ)
// @route POST /api/drives/test-email
const testEmailDelivery = async (req, res) => {
  try {
    const recipientEmail = (req.body?.recipientEmail || req.user?.email || '').trim().toLowerCase();
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'recipientEmail is required in request body.'
      });
    }

    const { sendSimpleTestEmail } = require('../services/emailService');
    const result = await sendSimpleTestEmail(recipientEmail);

    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      recipientEmail,
      smtpResponse: result.smtpResponse,
      errorCode: result.errorCode,
      message: result.success
        ? `Test email sent successfully to ${recipientEmail}`
        : `SMTP delivery failed: ${result.reason || result.smtpResponse}`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      errorCode: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// @desc Get matching students count for a drive
// @route GET /api/drives/:id/matching-count
const getDriveMatchingCount = async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id)
      .populate('company')
      .populate('targetAudience.sectionIds')
      .populate('notificationSettings.targetSections');
    if (!drive) return res.status(404).json({ message: 'Placement drive not found' });

    const { determineAudienceCount } = require('../services/notificationService');
    const count = await determineAudienceCount(drive);
    res.json({
      success: true,
      count,
      targetAudience: drive.targetAudience?.type || drive.notificationSettings?.targetAudience || 'ALL_ACTIVE_STUDENTS'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Preview matching students count from form criteria
// @route POST /api/drives/preview-target-count
const previewTargetAudienceCount = async (req, res) => {
  try {
    const { determineAudienceCount } = require('../services/notificationService');
    const count = await determineAudienceCount(req.body);
    res.json({
      success: true,
      count,
      targetAudience: req.body.targetAudience?.type || req.body.notificationSettings?.targetAudience || 'ALL_ACTIVE_STUDENTS'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Download or stream Placement Drive JD document with strict access control
// @route GET /api/drives/:id/jd
// @access Private (Admin, Faculty, and Authorized Eligible Students)
const getDriveJd = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, code: 'INVALID_ID', message: 'Invalid placement drive ID' });
    }

    const drive = await PlacementDrive.findById(id)
      .populate('targetAudience.sectionIds notificationSettings.targetSections');

    if (!drive) {
      return res.status(404).json({ success: false, code: 'DRIVE_NOT_FOUND', message: 'Placement drive not found' });
    }

    const role = (req.user?.role || '').toUpperCase();

    // Student access control:
    if (role === 'STUDENT') {
      // Must not be Draft
      if ((drive.status || '').toUpperCase() === 'DRAFT') {
        return res.status(403).json({
          success: false,
          code: 'FILE_ACCESS_DENIED',
          message: 'Access denied. This placement drive has not been published yet.'
        });
      }

      // Check section restrictions if targeted to specific sections
      const audType = drive.targetAudience?.type || drive.notificationSettings?.targetAudience;
      if (audType === 'SPECIFIC_SECTIONS') {
        const allowedSecIds = (
          drive.targetAudience?.sectionIds ||
          drive.notificationSettings?.targetSections ||
          []
        ).map(s => (s?._id || s).toString());

        const student = await Student.findOne({ user: req.user._id });
        const studentSecId = student?.section?._id
          ? student.section._id.toString()
          : (student?.section ? student.section.toString() : null);

        if (!studentSecId || !allowedSecIds.includes(studentSecId)) {
          return res.status(403).json({
            success: false,
            code: 'FILE_ACCESS_DENIED',
            message: 'Access denied. You are not authorized to view this drive.'
          });
        }
      }
    }

    const jd = drive.jobDescription;
    if (!jd || (!jd.fileUrl && !jd.fileName)) {
      return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'No JD document attached to this placement drive.' });
    }

    const fileUrl = jd.fileUrl || '';

    // If Cloudinary / Remote URL:
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return res.redirect(fileUrl);
    }

    // Local file fallback
    const rawFilename = jd.fileName || path.basename(fileUrl);
    const safeFilename = path.basename(rawFilename);
    const diskPath = path.join(__dirname, '..', 'uploads', 'jds', safeFilename);

    if (!fs.existsSync(diskPath)) {
      const urlBase = path.basename(fileUrl.split('?')[0]);
      const altPath = path.join(__dirname, '..', 'uploads', 'jds', urlBase);
      if (fs.existsSync(altPath)) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.sendFile(altPath);
      }
      return res.status(404).json({ success: false, code: 'FILE_NOT_FOUND', message: 'JD document file not found on server.' });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(diskPath);
  } catch (error) {
    console.error('[Get Drive JD Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  uploadJdPdf,
  getDrives,
  getDriveById,
  getDriveJd,
  createDrive,
  updateDrive,
  publishDrive,
  getDriveNotificationStatus,
  retryFailedNotifications,
  deleteDrive,
  testEmailDelivery,
  getDriveMatchingCount,
  previewTargetAudienceCount
};

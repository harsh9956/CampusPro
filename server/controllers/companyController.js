const mongoose = require('mongoose');
const Company = require('../models/Company');
const { createAuditLog } = require('../services/auditLogService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d+\-\s()]{7,20}$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,10})([/\w .-]*)*\/?$/i;

// @desc Get all companies (supports optional pagination, filter, search while preserving backward compatibility)
// @route GET /api/companies
const getCompanies = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;

    const query = {};
    if (status && ['Active', 'Inactive'].includes(status)) {
      query.status = status;
    }
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: escaped, $options: 'i' };
    }

    // If page or limit is provided, return paginated payload
    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
      const skip = (pageNum - 1) * limitNum;

      const total = await Company.countDocuments(query);
      const totalPages = Math.ceil(total / limitNum) || 1;
      const companies = await Company.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      return res.json({
        success: true,
        companies,
        total,
        page: pageNum,
        totalPages,
        limit: limitNum
      });
    }

    // Default: Return raw array for backward compatibility with dropdowns and other modules
    const companies = await Company.find(query).sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single company
// @route GET /api/companies/:id
const getCompanyById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create company
// @route POST /api/companies
const createCompany = async (req, res) => {
  try {
    const { name, website, industry, location, description, logo, contactEmail, contactPhone, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 120) {
      return res.status(400).json({ message: 'Company name cannot exceed 120 characters' });
    }

    // Check for duplicate company (case-insensitive)
    const existing = await Company.findOne({
      name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });

    if (existing) {
      return res.status(400).json({ message: `Company "${trimmedName}" already exists.` });
    }

    // Validate optional website
    if (website && website.trim() && !URL_REGEX.test(website.trim())) {
      return res.status(400).json({ message: 'Please provide a valid website URL.' });
    }

    // Validate optional contact email
    if (contactEmail && contactEmail.trim() && !EMAIL_REGEX.test(contactEmail.trim())) {
      return res.status(400).json({ message: 'Please provide a valid contact email address.' });
    }

    // Validate optional contact phone
    if (contactPhone && contactPhone.trim()) {
      const cleanPhone = contactPhone.trim();
      if (!PHONE_REGEX.test(cleanPhone)) {
        return res.status(400).json({ message: 'Please provide a valid contact phone number (7-20 digits).' });
      }
    }

    // Validate optional status
    const resolvedStatus = status && ['Active', 'Inactive'].includes(status) ? status : 'Active';

    const company = await Company.create({
      name: trimmedName,
      website: website ? website.trim() : '',
      industry: industry && industry.trim() ? industry.trim() : 'Software & IT Services',
      location: location && location.trim() ? location.trim() : 'Noida / NCR',
      description: description ? description.trim() : '',
      logo: logo || '',
      status: resolvedStatus,
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : '',
      contactPhone: contactPhone ? contactPhone.trim() : ''
    });

    await createAuditLog({
      user: req.user,
      actionType: 'CREATE',
      targetEntity: 'Company',
      targetId: company._id,
      targetName: company.name,
      details: `Created company record for ${company.name}`
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update company
// @route PUT /api/companies/:id
const updateCompany = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const { name, website, industry, location, description, logo, contactEmail, contactPhone, status } = req.body;

    // Validate name if provided
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Company name cannot be empty' });
      }
      const trimmedName = name.trim();
      if (trimmedName.length > 120) {
        return res.status(400).json({ message: 'Company name cannot exceed 120 characters' });
      }

      // Check for duplicate company excluding current company (case-insensitive)
      const duplicate = await Company.findOne({
        _id: { $ne: company._id },
        name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      });

      if (duplicate) {
        return res.status(400).json({ message: `Company "${trimmedName}" already exists.` });
      }

      company.name = trimmedName;
    }

    // Validate website
    if (website !== undefined) {
      const trimmedWebsite = website ? website.trim() : '';
      if (trimmedWebsite && !URL_REGEX.test(trimmedWebsite)) {
        return res.status(400).json({ message: 'Please provide a valid website URL.' });
      }
      company.website = trimmedWebsite;
    }

    // Validate email
    if (contactEmail !== undefined) {
      const trimmedEmail = contactEmail ? contactEmail.trim().toLowerCase() : '';
      if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Please provide a valid contact email address.' });
      }
      company.contactEmail = trimmedEmail;
    }

    // Validate phone
    if (contactPhone !== undefined) {
      const trimmedPhone = contactPhone ? contactPhone.trim() : '';
      if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
        return res.status(400).json({ message: 'Please provide a valid contact phone number (7-20 digits).' });
      }
      company.contactPhone = trimmedPhone;
    }

    // Whitelist other safe editable fields
    if (industry !== undefined) {
      company.industry = industry && industry.trim() ? industry.trim() : company.industry;
    }
    if (location !== undefined) {
      company.location = location && location.trim() ? location.trim() : company.location;
    }
    if (description !== undefined) {
      company.description = description ? description.trim() : '';
    }
    if (logo !== undefined) {
      company.logo = logo || '';
    }
    if (status !== undefined) {
      if (!['Active', 'Inactive'].includes(status)) {
        return res.status(400).json({ message: 'Status must be either Active or Inactive.' });
      }
      company.status = status;
    }

    // Save updated company — preserving companyJd intact!
    await company.save();

    await createAuditLog({
      user: req.user,
      actionType: 'UPDATE',
      targetEntity: 'Company',
      targetId: company._id,
      targetName: company.name,
      details: `Updated company details for ${company.name}`
    });

    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Upload JD document for a company
// @route POST /api/companies/:id/upload-jd
// @access Private (Admin)
const uploadCompanyJd = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID format' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please select a JD document to upload (PDF, DOC, DOCX, TXT up to 10 MB).' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const { uploadBuffer, deleteAsset, rollbackUpload, CLOUDINARY_FOLDERS } = require('../services/cloudinaryService');

    const oldPublicId = company.companyJd?.publicId;

    const uploadResult = await uploadBuffer({
      buffer: req.file.buffer,
      folder: CLOUDINARY_FOLDERS.COMPANY_JDS,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      resourceType: 'auto'
    });

    company.companyJd = {
      fileName: req.file.originalname,
      fileUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      fileSize: uploadResult.fileSize,
      uploadedAt: uploadResult.uploadedAt || new Date()
    };

    try {
      await company.save();
    } catch (saveErr) {
      await rollbackUpload(uploadResult.publicId, uploadResult.resourceType);
      throw saveErr;
    }

    if (oldPublicId && oldPublicId !== uploadResult.publicId) {
      await deleteAsset(oldPublicId);
    }

    if (req.user) {
      await createAuditLog({
        user: req.user,
        actionType: 'UPLOAD',
        targetEntity: 'Company JD',
        targetId: company._id,
        targetName: company.name,
        details: `Uploaded JD document for company ${company.name}: ${req.file.originalname}`
      });
    }

    res.json({
      success: true,
      message: 'Company JD document uploaded successfully.',
      companyJd: company.companyJd
    });
  } catch (error) {
    console.error('[Upload Company JD Error]', error);
    const statusCode = error.statusCode || (error.code === 'STORAGE_UNAVAILABLE' ? 503 : 500);
    res.status(statusCode).json({
      success: false,
      code: error.code || 'FILE_UPLOAD_FAILED',
      message: error.message || 'Failed to upload Company JD.'
    });
  }
};

// @desc Delete company
// @route DELETE /api/companies/:id
const deleteCompany = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid company ID format' });
    }

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Check references to prevent orphaned historical records (Instruction 25)
    const PlacementDrive = require('../models/PlacementDrive');
    const Question = require('../models/Question');
    const MockTest = require('../models/MockTest');
    const InterviewExperience = require('../models/InterviewExperience');

    const [driveCount, questionCount, mockCount, expCount] = await Promise.all([
      PlacementDrive.countDocuments({ company: company._id }),
      Question.countDocuments({ $or: [{ company: company._id }, { companies: company._id }] }),
      MockTest.countDocuments({ company: company._id }),
      InterviewExperience.countDocuments({ company: company._id })
    ]);

    const activeReferences = [];
    if (driveCount > 0) activeReferences.push(`${driveCount} placement drive(s)`);
    if (questionCount > 0) activeReferences.push(`${questionCount} question(s)`);
    if (mockCount > 0) activeReferences.push(`${mockCount} mock test(s)`);
    if (expCount > 0) activeReferences.push(`${expCount} interview experience(s)`);

    if (activeReferences.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete company "${company.name}". It is actively referenced by ${activeReferences.join(', ')}. Please deactivate the company status instead to preserve historical records.`
      });
    }

    if (company.companyJd?.publicId) {
      const { deleteAsset } = require('../services/cloudinaryService');
      await deleteAsset(company.companyJd.publicId);
    }

    await Company.findByIdAndDelete(req.params.id);

    await createAuditLog({
      user: req.user,
      actionType: 'DELETE',
      targetEntity: 'Company',
      targetId: company._id,
      targetName: company.name,
      details: `Deleted company ${company.name}`
    });

    res.json({ message: 'Company removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  uploadCompanyJd,
  deleteCompany
};

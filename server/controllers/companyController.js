const Company = require('../models/Company');
const { createAuditLog } = require('../services/auditLogService');

// @desc Get all companies
// @route GET /api/companies
const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single company
// @route GET /api/companies/:id
const getCompanyById = async (req, res) => {
  try {
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
    const { name, website, industry, location, description, logo, contactEmail, contactPhone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const trimmedName = name.trim();

    // Check for duplicate company (case-insensitive)
    const existing = await Company.findOne({
      name: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
    });

    if (existing) {
      return res.status(400).json({ message: `Company "${trimmedName}" already exists.` });
    }

    const company = await Company.create({
      name: trimmedName,
      website: website ? website.trim() : '',
      industry: industry && industry.trim() ? industry.trim() : 'IT / Tech Services',
      location: location && location.trim() ? location.trim() : 'India',
      description: description ? description.trim() : '',
      logo: logo || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || ''
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
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });

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

// @desc Delete company
// @route DELETE /api/companies/:id
const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

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
  deleteCompany
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';
import companyService from '../../services/companyService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d+\-\s()]{7,20}$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,10})([/\w .-]*)*\/?$/i;

const initialFormData = {
  name: '',
  website: '',
  industry: '',
  location: '',
  description: '',
  contactEmail: '',
  contactPhone: '',
  status: 'Active'
};

const CompanyManager = () => {
  const [companies, setCompanies] = useState([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState(null);

  // User Feedback Banner
  const [feedback, setFeedback] = useState(null);

  const pageSize = 12;

  // Auto-dismiss success feedback after 4 seconds
  useEffect(() => {
    if (feedback?.type === 'success') {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCompanies = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const res = await companyService.getCompanies({
        page,
        limit: pageSize,
        search: debouncedSearch
      });

      if (res && res.companies) {
        setCompanies(res.companies || []);
        setTotalCompanies(res.total || 0);
        setTotalPages(res.totalPages || 1);
      } else if (Array.isArray(res)) {
        // Fallback for raw array
        setCompanies(res);
        setTotalCompanies(res.length);
        setTotalPages(Math.max(1, Math.ceil(res.length / pageSize)));
      } else {
        setCompanies([]);
        setTotalCompanies(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
      setFeedback({
        type: 'error',
        message: 'Unable to load companies. Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchCompanies(currentPage);
  }, [fetchCompanies, currentPage]);

  const handleOpenAddModal = () => {
    setEditingCompany(null);
    setFormData(initialFormData);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      website: company.website || '',
      industry: company.industry || 'Software & IT Services',
      location: company.location || 'Noida / NCR',
      description: company.description || '',
      contactEmail: company.contactEmail || '',
      contactPhone: company.contactPhone || '',
      status: company.status || 'Active'
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleFormValidation = () => {
    if (!formData.name.trim()) {
      return 'Company Name is required.';
    }
    if (formData.name.trim().length > 120) {
      return 'Company Name cannot exceed 120 characters.';
    }
    if (formData.website.trim() && !URL_REGEX.test(formData.website.trim())) {
      return 'Please enter a valid website URL (e.g. https://company.com).';
    }
    if (formData.contactEmail.trim() && !EMAIL_REGEX.test(formData.contactEmail.trim())) {
      return 'Please enter a valid contact email address.';
    }
    if (formData.contactPhone.trim() && !PHONE_REGEX.test(formData.contactPhone.trim())) {
      return 'Please enter a valid contact phone number (7-20 digits).';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const validationError = handleFormValidation();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        website: formData.website.trim(),
        industry: formData.industry.trim() || 'Software & IT Services',
        location: formData.location.trim() || 'Noida / NCR',
        description: formData.description.trim(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
        status: formData.status
      };

      if (editingCompany) {
        await companyService.updateCompany(editingCompany._id, payload);
        setFeedback({
          type: 'success',
          message: `Company "${payload.name}" updated successfully.`
        });
        fetchCompanies(currentPage);
      } else {
        await companyService.createCompany(payload);
        setFeedback({
          type: 'success',
          message: `Company "${payload.name}" created successfully.`
        });
        setCurrentPage(1);
        fetchCompanies(1);
      }

      setShowModal(false);
      setFormData(initialFormData);
      setEditingCompany(null);
    } catch (err) {
      console.error('Error saving company:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Failed to save company.';
      setFormError(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (company) => {
    if (!window.confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await companyService.deleteCompany(company._id);
      setFeedback({
        type: 'success',
        message: `Company "${company.name}" deleted successfully.`
      });

      // If last item on page, go to previous page if page > 1
      if (companies.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        fetchCompanies(currentPage);
      }
    } catch (err) {
      console.error('Failed to delete company:', err);
      const serverMsg = err.response?.data?.message || 'Failed to delete company.';
      setFeedback({
        type: 'error',
        message: serverMsg
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Company Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Manage recruiting partners, corporate profiles, and JD assets</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchCompanies(currentPage)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            title="Refresh Directory"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" /> Add New Company
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search company name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-xs">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-3 text-xs font-medium text-slate-500">Loading companies...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium space-y-3 shadow-xs">
          <Building2 className="h-10 w-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">
            {debouncedSearch ? `No companies matching "${debouncedSearch}"` : 'No companies added yet.'}
          </p>
          <p className="text-slate-400">
            {debouncedSearch ? 'Try clearing your search term.' : 'Click "Add New Company" to create your first partner profile.'}
          </p>
          {!debouncedSearch && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add First Company
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Company Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => {
              const isActive = (c.status || 'Active') === 'Active';
              return (
                <div
                  key={c._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    {/* Header Row: Industry & Action Buttons */}
                    <div className="flex justify-between items-start">
                      <div className="pr-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                          {c.industry || 'IT / Tech Services'}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
                          {c.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition"
                          title="Edit Company Profile"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                          title="Delete Company"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {c.description || 'No description provided.'}
                    </p>

                    {/* Company Details */}
                    <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{c.location || 'India'}</span>
                      </div>

                      {c.website && (
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          <a
                            href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 font-semibold hover:underline truncate"
                          >
                            {c.website}
                          </a>
                        </div>
                      )}

                      {c.contactEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <a
                            href={`mailto:${c.contactEmail}`}
                            className="text-slate-600 hover:text-blue-600 hover:underline truncate"
                          >
                            {c.contactEmail}
                          </a>
                        </div>
                      )}

                      {c.contactPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate text-slate-600">{c.contactPhone}</span>
                        </div>
                      )}

                      {c.companyJd?.fileName && (
                        <div className="flex items-center gap-2 pt-1 text-slate-700">
                          <FileText className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-[11px] font-medium text-slate-500 truncate" title={c.companyJd.fileName}>
                            JD: {c.companyJd.fileName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Status Badge */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isActive ? 'Active Recruiter' : 'Inactive Recruiter'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ID: {c._id.slice(-6)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Server-Side Pagination Bar */}
          {totalPages > 1 && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
              <span className="text-slate-500 font-semibold">
                Showing{' '}
                <span className="font-bold text-slate-900">
                  {totalCompanies === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * pageSize, totalCompanies)}
                </span>{' '}
                of <span className="font-bold text-slate-900">{totalCompanies}</span> companies
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-bold text-slate-700 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Unified Add / Edit Company Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCompany ? 'Edit Company' : 'Add Recruiting Company'}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  {editingCompany ? 'Update corporate profile and contact details' : 'Register a new hiring partner in CampusPro'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 font-bold hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Error Banner */}
            {formError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-semibold">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Company Name */}
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wide">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Industry & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wide">
                    Industry <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g. Software & IT Services"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wide">
                    Location <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Noida / NCR"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Website URL & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wide">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://company.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wide">
                    Recruiter Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Active">Active Recruiter</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Contact Email & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wide">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="hr@company.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wide">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    maxLength={20}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wide">
                  Company Description
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of company offerings, hiring domains, and work culture..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting
                    ? 'Saving...'
                    : editingCompany
                    ? 'Update Company'
                    : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManager;

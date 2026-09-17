import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  Briefcase,
  Plus,
  Calendar,
  DollarSign,
  Trash2,
  Edit,
  FileText,
  Link as LinkIcon,
  Upload,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Building
} from 'lucide-react';
import API from '../../services/api';

const DriveManager = () => {
  const { academicYear } = useAcademicYear();
  const [drives, setDrives] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriveId, setEditingDriveId] = useState(null);

  const [formError, setFormError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    company: '',
    newCompanyName: '',
    jobRole: 'Software Engineer',
    package: '',
    location: '',
    driveDate: '',
    deadline: '',
    minCgpa: 6.0,
    maxBacklogs: 0,
    eligibleBranches: 'CSE, IT, ECE',
    jobDescription: null,
    applyLink: '',
    selectionProcess: []
  });

  const fetchData = async () => {
    try {
      const [drivesRes, compRes] = await Promise.all([
        API.get(`/drives?academicYear=${academicYear}`),
        API.get('/companies')
      ]);
      setDrives(drivesRes.data || []);
      setCompanies(compRes.data || []);
      if (compRes.data?.length > 0 && !formData.company) {
        setFormData(prev => ({ ...prev, company: compRes.data[0]._id }));
      }
    } catch (err) {
      console.error('Error loading drives and companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [academicYear]);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const openCreateModal = () => {
    setEditingDriveId(null);
    setFormData({
      company: companies.length > 0 ? companies[0]._id : 'ADD_NEW_COMPANY',
      newCompanyName: '',
      jobRole: 'Software Engineer',
      package: '',
      location: '',
      driveDate: '',
      deadline: '',
      minCgpa: 6.0,
      maxBacklogs: 0,
      eligibleBranches: 'CSE, IT, ECE',
      jobDescription: null,
      applyLink: '',
      selectionProcess: []
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (drive) => {
    setEditingDriveId(drive._id);
    const driveDateFormatted = drive.driveDate ? new Date(drive.driveDate).toISOString().split('T')[0] : '';
    const deadlineFormatted = drive.deadline ? new Date(drive.deadline).toISOString().split('T')[0] : '';

    let existingProcess = [];
    if (Array.isArray(drive.selectionProcess) && drive.selectionProcess.length > 0) {
      existingProcess = drive.selectionProcess.map((r, i) => ({
        order: r.order || i + 1,
        roundName: r.roundName || r.name || '',
        roundType: r.roundType || 'Other',
        description: r.description || '',
        mode: r.mode || 'Online',
        duration: r.duration ?? '',
        date: r.date ? new Date(r.date).toISOString().split('T')[0] : ''
      }));
    } else if (Array.isArray(drive.selectionRounds) && drive.selectionRounds.length > 0) {
      existingProcess = drive.selectionRounds.map((r, i) => ({
        order: r.roundNumber || i + 1,
        roundName: r.name || '',
        roundType: 'Other',
        description: '',
        mode: r.mode || 'Online',
        duration: '',
        date: r.date ? new Date(r.date).toISOString().split('T')[0] : ''
      }));
    }

    setFormData({
      company: drive.company?._id || drive.company || '',
      newCompanyName: '',
      jobRole: drive.jobRole || '',
      package: drive.package || '',
      location: drive.location || 'Noida',
      driveDate: driveDateFormatted,
      deadline: deadlineFormatted,
      minCgpa: drive.minCgpa ?? 7.0,
      maxBacklogs: drive.maxBacklogs ?? 0,
      eligibleBranches: Array.isArray(drive.eligibleBranches) ? drive.eligibleBranches.join(', ') : drive.eligibleBranches || '',
      jobDescription: drive.jobDescription || null,
      applyLink: drive.applyLink || '',
      selectionProcess: existingProcess
    });
    setFormError(null);
    setShowModal(true);
  };

  // Round Builder Handlers
  const handleAddRound = () => {
    setFormData(prev => {
      const nextOrder = prev.selectionProcess.length + 1;
      return {
        ...prev,
        selectionProcess: [
          ...prev.selectionProcess,
          {
            order: nextOrder,
            roundName: '',
            roundType: 'Aptitude',
            description: '',
            mode: 'Online',
            duration: '',
            date: ''
          }
        ]
      };
    });
  };

  const handleRemoveRound = (index) => {
    setFormData(prev => {
      const updated = prev.selectionProcess.filter((_, i) => i !== index);
      const reIndexed = updated.map((r, i) => ({ ...r, order: i + 1 }));
      return { ...prev, selectionProcess: reIndexed };
    });
  };

  const handleMoveRoundUp = (index) => {
    if (index === 0) return;
    setFormData(prev => {
      const updated = [...prev.selectionProcess];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      const reIndexed = updated.map((r, i) => ({ ...r, order: i + 1 }));
      return { ...prev, selectionProcess: reIndexed };
    });
  };

  const handleMoveRoundDown = (index) => {
    setFormData(prev => {
      if (index >= prev.selectionProcess.length - 1) return prev;
      const updated = [...prev.selectionProcess];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      const reIndexed = updated.map((r, i) => ({ ...r, order: i + 1 }));
      return { ...prev, selectionProcess: reIndexed };
    });
  };

  const handleRoundChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.selectionProcess];
      updated[index] = { ...updated[index], [field]: value };
      // If roundType is changed and roundName is empty, auto-set default roundName to roundType
      if (field === 'roundType' && !updated[index].roundName) {
        updated[index].roundName = value;
      }
      return { ...prev, selectionProcess: updated };
    });
  };

  // Handle PDF Upload
  const handlePdfFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormError(null);

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      setFormError('Only PDF files are allowed for Job Description.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setFormError('File size exceeds maximum limit of 10 MB.');
      return;
    }

    setUploadingPdf(true);
    try {
      const dataPayload = new FormData();
      dataPayload.append('jdFile', file);

      const res = await API.post('/drives/upload-jd', dataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.data) {
        setFormData(prev => ({
          ...prev,
          jobDescription: res.data.data
        }));
        showToast('Job Description PDF uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error('Error uploading JD PDF:', err);
      setFormError(err.response?.data?.message || 'Failed to upload PDF file.');
    } finally {
      setUploadingPdf(false);
      e.target.value = null;
    }
  };

  const handleRemovePdf = () => {
    setFormData(prev => ({ ...prev, jobDescription: null }));
    showToast('Job Description PDF removed.', 'success');
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate Company Selection
    if (formData.company === 'ADD_NEW_COMPANY') {
      if (!formData.newCompanyName || !formData.newCompanyName.trim()) {
        setFormError('Please enter a company name.');
        return;
      }
    } else if (!formData.company) {
      setFormError('Please select a company or add a new company.');
      return;
    }

    // Validate Apply Link URL
    if (formData.applyLink) {
      const trimmedUrl = formData.applyLink.trim();
      if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
        setFormError('Official Apply Link must be a valid HTTP or HTTPS URL (e.g. https://company.com/careers).');
        return;
      }
    }

    // Validate Selection Process Rounds
    for (let i = 0; i < formData.selectionProcess.length; i++) {
      const round = formData.selectionProcess[i];
      if (!round.roundName || !round.roundName.trim()) {
        setFormError(`Please enter a Round Name for Round ${i + 1}.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const formattedSelectionProcess = formData.selectionProcess.map((r, i) => ({
        order: i + 1,
        roundName: r.roundName.trim(),
        roundType: r.roundType || 'Other',
        description: (r.description || '').trim(),
        mode: r.mode || 'Online',
        duration: r.duration ? Number(r.duration) : null,
        date: r.date ? r.date : null
      }));

      const payload = {
        ...formData,
        selectionProcess: formattedSelectionProcess,
        selectionRounds: formattedSelectionProcess.map(r => ({
          roundNumber: r.order,
          name: r.roundName,
          mode: r.mode,
          venue: (r.mode === 'Online' || r.mode === 'ONLINE') ? 'Virtual Link / Online' : 'Placement Hall',
          date: r.date
        })),
        newCompanyName: formData.company === 'ADD_NEW_COMPANY' ? formData.newCompanyName.trim() : '',
        applyLink: formData.applyLink ? formData.applyLink.trim() : '',
        eligibleBranches: typeof formData.eligibleBranches === 'string'
          ? formData.eligibleBranches.split(',').map(b => b.trim()).filter(Boolean)
          : formData.eligibleBranches,
        academicYear
      };

      let response;
      if (editingDriveId) {
        response = await API.put(`/drives/${editingDriveId}`, payload);
        showToast(response.data?.message || 'Placement drive updated successfully!', 'success');
      } else {
        response = await API.post('/drives', payload);
        const msg = response.data?.message || (response.data?.createdNewCompany ? 'Company and Placement Drive created successfully.' : 'Placement Drive created successfully.');
        showToast(msg, 'success');
      }

      setShowModal(false);
      await fetchData();
    } catch (err) {
      console.error('Error saving drive:', err);
      setFormError(err.response?.data?.message || 'Failed to create placement drive. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this placement drive?')) {
      try {
        await API.delete(`/drives/${id}`);
        showToast('Drive deleted successfully.', 'success');
        fetchData();
      } catch (err) {
        console.error('Error deleting drive:', err);
        showToast(err.response?.data?.message || 'Failed to delete drive.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 rounded-2xl px-5 py-3.5 text-xs font-black shadow-2xl flex items-center gap-2 border transition ${
          toastType === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'
        }`}>
          {toastType === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Placement Drives Setup</h1>
          <p className="text-xs text-slate-500 font-medium">Create and manage placement drives, official JD PDFs, and apply links for Academic Year {academicYear}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" /> Create Placement Drive
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium mt-3">Loading drives...</p>
        </div>
      ) : drives.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium">
          No placement drives configured for Academic Year {academicYear}. Click "+ Create Placement Drive" to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drives.map((d) => {
            const hasJd = Boolean(d.jobDescription?.fileUrl || (typeof d.jobDescription === 'string' && d.jobDescription));
            const hasApplyLink = Boolean(d.applyLink);

            return (
              <div key={d._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{d.company?.name}</span>
                    <h3 className="text-lg font-extrabold text-slate-900">{d.jobRole}</h3>
                    <span className="text-xs font-black text-emerald-600">Package: {d.package}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(d)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-slate-100 transition"
                      title="Edit Drive"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(d._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                      title="Delete Drive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1 text-slate-700 border border-slate-100">
                  <p>• Min CGPA: <strong className="text-blue-700">{d.minCgpa}</strong></p>
                  <p>• Max Backlogs: <strong className="text-blue-700">{d.maxBacklogs}</strong></p>
                  <p>• Eligible Branches: <strong>{d.eligibleBranches?.join(', ')}</strong></p>
                </div>

                {/* Configuration Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    hasJd ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <FileText className="h-3 w-3" /> {hasJd ? '📄 JD Available' : 'No JD File'}
                  </span>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    hasApplyLink ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <LinkIcon className="h-3 w-3" /> {hasApplyLink ? '🔗 Apply Link Available' : 'No Apply Link'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Drive Date: {new Date(d.driveDate).toLocaleDateString()}</span>
                  <span>Deadline: {new Date(d.deadline).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 my-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">
                {editingDriveId ? 'Edit Placement Drive' : 'Create Placement Drive'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold hover:text-slate-600 text-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* 1. Select Company */}
              <div>
                <label className="font-bold text-slate-700 uppercase">Select Company *</label>
                <select
                  required
                  value={formData.company}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      company: val,
                      newCompanyName: val === 'ADD_NEW_COMPANY' ? prev.newCompanyName : ''
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none bg-white"
                >
                  {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  <option value="ADD_NEW_COMPANY">+ Add New Company</option>
                </select>
              </div>

              {/* Enter New Company Name (Conditional Input) */}
              {formData.company === 'ADD_NEW_COMPANY' && (
                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-1 animate-fadeIn">
                  <label className="font-bold text-blue-900 uppercase flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-blue-600" /> Enter New Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.newCompanyName}
                    onChange={(e) => setFormData({ ...formData, newCompanyName: e.target.value })}
                    placeholder="e.g. Google, Microsoft, Adobe, Accenture..."
                    className="w-full rounded-xl border border-blue-300 p-2.5 font-bold text-slate-900 focus:outline-none bg-white"
                  />
                  <p className="text-[10px] text-blue-600 font-medium">
                    This company will be created automatically and added to the company directory.
                  </p>
                </div>
              )}

              {/* 2 & 3. Job Role & Package */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Job Role *</label>
                  <input
                    type="text"
                    required
                    value={formData.jobRole}
                    onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                    placeholder="e.g. Software Engineer"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Package (LPA) *</label>
                  <input
                    type="text"
                    required
                    value={formData.package}
                    onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                    placeholder="e.g. 6.0 LPA"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4 & 5. Min CGPA & Max Backlogs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Min CGPA Criterion *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.minCgpa}
                    onChange={(e) => setFormData({ ...formData, minCgpa: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Max Backlogs Allowed *</label>
                  <input
                    type="number"
                    required
                    value={formData.maxBacklogs}
                    onChange={(e) => setFormData({ ...formData, maxBacklogs: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* 6. Eligible Branches */}
              <div>
                <label className="font-bold text-slate-700 uppercase">Eligible Branches (Comma separated) *</label>
                <input
                  type="text"
                  required
                  value={formData.eligibleBranches}
                  onChange={(e) => setFormData({ ...formData, eligibleBranches: e.target.value })}
                  placeholder="CSE, IT, ECE"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {/* 7 & 8. Drive Date & Deadline Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Drive Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.driveDate}
                    onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Deadline Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* 9. Job Description (JD) PDF */}
              <div>
                <label className="font-bold text-slate-700 uppercase block">Job Description (JD)</label>
                <span className="text-[10px] text-slate-400 font-medium block mb-1.5">Supported format: PDF only • Max size: 10 MB</span>

                {formData.jobDescription?.fileUrl ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        <FileText className="h-5 w-5 text-red-500 shrink-0" />
                        <span className="font-bold text-slate-900 truncate">
                          📄 {formData.jobDescription.fileName || 'company-job-description.pdf'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formData.jobDescription.fileSize ? `${Math.round(formData.jobDescription.fileSize / 1024)} KB` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 text-xs inline-flex items-center gap-1 transition">
                        <RefreshCw className="h-3 w-3" /> Replace PDF
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handlePdfFileSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemovePdf}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 text-xs inline-flex items-center gap-1 transition"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className={`w-full flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition cursor-pointer ${
                      uploadingPdf ? 'bg-blue-50 border-blue-300' : 'bg-slate-50/70 border-slate-300 hover:bg-blue-50/50 hover:border-blue-400'
                    }`}>
                      {uploadingPdf ? (
                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                          <span>Uploading JD PDF...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-600">
                          <Upload className="h-5 w-5 text-slate-400" />
                          <span className="font-bold text-xs">[ Upload JD PDF ]</span>
                          <span className="text-[10px] text-slate-400">PDF up to 10 MB</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        disabled={uploadingPdf}
                        onChange={handlePdfFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 10. Official Apply Link */}
              <div>
                <label className="font-bold text-slate-700 uppercase">Official Apply Link *</label>
                <input
                  type="url"
                  required
                  value={formData.applyLink}
                  onChange={(e) => setFormData({ ...formData, applyLink: e.target.value })}
                  placeholder="https://company.com/careers/software-engineer"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {/* 11. SELECTION PROCESS / INTERVIEW ROUNDS */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-extrabold text-slate-900 uppercase tracking-wider block text-xs">
                      Selection Process / Interview Rounds
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Configure company-specific rounds in sequence order.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRound}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition border border-blue-200"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Round
                  </button>
                </div>

                {formData.selectionProcess.length === 0 ? (
                  <div className="p-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-slate-400 text-xs font-medium space-y-1">
                    <p>No rounds added yet for this drive.</p>
                    <p className="text-[10px]">Click "+ Add Round" to define custom interview stages (e.g. Aptitude, Coding, Technical, HR).</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.selectionProcess.map((round, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 relative">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="font-extrabold text-blue-900 text-xs flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                              {idx + 1}
                            </span>
                            Round {idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveRoundUp(idx)}
                              className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 text-[10px] font-bold"
                              title="Move Up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={idx === formData.selectionProcess.length - 1}
                              onClick={() => handleMoveRoundDown(idx)}
                              className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 text-[10px] font-bold"
                              title="Move Down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRound(idx)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 transition"
                              title="Delete Round"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Round Name & Type */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 text-[10px] uppercase">Round Name *</label>
                            <input
                              type="text"
                              required
                              value={round.roundName}
                              onChange={(e) => handleRoundChange(idx, 'roundName', e.target.value)}
                              placeholder="e.g. Online Assessment, Coding Round"
                              className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 bg-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 text-[10px] uppercase">Round Type</label>
                            <select
                              value={round.roundType}
                              onChange={(e) => handleRoundChange(idx, 'roundType', e.target.value)}
                              className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 bg-white focus:outline-none"
                            >
                              <option value="Aptitude">Aptitude</option>
                              <option value="Coding">Coding</option>
                              <option value="Technical Interview">Technical Interview</option>
                              <option value="Technical Round">Technical Round</option>
                              <option value="System Design">System Design</option>
                              <option value="Group Discussion">Group Discussion</option>
                              <option value="Communication">Communication</option>
                              <option value="Managerial">Managerial</option>
                              <option value="HR">HR</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="font-bold text-slate-700 text-[10px] uppercase">Description (Optional)</label>
                          <input
                            type="text"
                            value={round.description}
                            onChange={(e) => handleRoundChange(idx, 'description', e.target.value)}
                            placeholder="e.g. MCQ based aptitude and reasoning test"
                            className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-700 bg-white focus:outline-none"
                          />
                        </div>

                        {/* Mode, Duration, Date */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 text-[10px] uppercase">Mode</label>
                            <select
                              value={round.mode}
                              onChange={(e) => handleRoundChange(idx, 'mode', e.target.value)}
                              className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 bg-white focus:outline-none"
                            >
                              <option value="Online">Online</option>
                              <option value="Offline">Offline</option>
                              <option value="Hybrid">Hybrid</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 text-[10px] uppercase">Duration (mins)</label>
                            <input
                              type="number"
                              value={round.duration}
                              onChange={(e) => handleRoundChange(idx, 'duration', e.target.value)}
                              placeholder="e.g. 60"
                              className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 bg-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 text-[10px] uppercase">Round Date</label>
                            <input
                              type="date"
                              value={round.date}
                              onChange={(e) => handleRoundChange(idx, 'date', e.target.value)}
                              className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 bg-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleAddRound}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> + Add Another Round
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingPdf}
                  className="px-5 py-2 rounded-xl bg-blue-600 font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting ? 'Saving...' : editingDriveId ? 'Update Drive' : 'Create Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriveManager;

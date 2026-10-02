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
  Building,
  Bell,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import API from '../../services/api';
import sectionService from '../../services/sectionService';
import { useAuth } from '../../context/AuthContext';

const DriveManager = () => {
  const { academicYear, isHistorical, historicalManageMode } = useAcademicYear();
  const { user } = useAuth();
  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPER_ADMIN';
  const canManage = !isHistorical || (isSuperAdmin && historicalManageMode);

  const [drives, setDrives] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriveId, setEditingDriveId] = useState(null);

  const fetchActiveSections = async (year = academicYear) => {
    try {
      setSectionsLoading(true);
      setSectionsError(null);
      const res = await sectionService.getActiveSections({ academicYear: year });
      const list = Array.isArray(res) ? res : (res?.sections || res?.data || []);
      setSections(list);
      return list;
    } catch (err) {
      console.error('[DriveManager: Failed to load active sections]', err);
      setSectionsError('Unable to load sections. Please try again.');
      return [];
    } finally {
      setSectionsLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    company: '',
    newCompanyName: '',
    jobRole: '',
    package: '',
    location: '',
    driveDate: '',
    deadline: '',
    minCgpa: 6.0,
    maxBacklogs: 0,
    eligibleBranches: '',
    eligibilityCriteria: {
      minimumAcademic: {
        enabled: true,
        type: 'CGPA',
        value: 6.0
      },
      highSchool: {
        enabled: false,
        minimumPercentage: 60
      },
      intermediate: {
        enabled: false,
        minimumPercentage: 60
      }
    },
    jobDescription: null,
    applyLink: '',
    selectionProcess: [],
    notificationSettings: {
      sendEmailNotification: true,
      createInAppNotification: true,
      targetAudience: 'ALL_ACTIVE_STUDENTS',
      targetSections: []
    },
    targetAudience: {
      type: 'ALL_ACTIVE_STUDENTS',
      sectionIds: []
    },
    status: 'DRAFT'
  });

  const [formError, setFormError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [notificationStatuses, setNotificationStatuses] = useState({});
  const [previewMatchingCount, setPreviewMatchingCount] = useState(null);
  const [calculatingPreview, setCalculatingPreview] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchNotificationStatuses = async (driveList) => {
    try {
      if (!driveList || driveList.length === 0) return;
      const statusPromises = driveList.map(d =>
        API.get(`/drives/${d._id}/notifications/status`)
          .then(res => ({ id: d._id, data: res.data.status }))
          .catch(() => null)
      );
      
      const results = await Promise.all(statusPromises);
      const newMap = {};
      results.forEach(item => {
        if (item && item.id) newMap[item.id] = item.data;
      });
      setNotificationStatuses(prev => ({ ...prev, ...newMap }));
    } catch (err) {
      console.error('Error loading notification statuses:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [drivesRes, compRes] = await Promise.all([
        API.get(`/drives?academicYear=${academicYear}`),
        API.get('/companies'),
        fetchActiveSections()
      ]);
      const driveList = drivesRes.data || [];
      setDrives(driveList);
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
    setCurrentPage(1);
    fetchData();
  }, [academicYear]);

  // Total pages and paginated slice
  const totalPages = Math.max(1, Math.ceil(drives.length / pageSize));
  const paginatedDrives = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return drives.slice(start, start + pageSize);
  }, [drives, currentPage, pageSize]);

  // Fetch notification status only for visible drives on current page
  useEffect(() => {
    if (paginatedDrives.length > 0) {
      fetchNotificationStatuses(paginatedDrives);
    }
  }, [paginatedDrives]);

  // Auto-poll notification statuses every 2.5s while any visible drive has pending > 0
  useEffect(() => {
    const hasPending = paginatedDrives.some(d => {
      const stats = notificationStatuses[d._id];
      return stats && stats.pending > 0;
    });

    if (!hasPending) return;

    const pollTimer = setInterval(() => {
      fetchNotificationStatuses(paginatedDrives);
    }, 2500);

    return () => clearInterval(pollTimer);
  }, [paginatedDrives, notificationStatuses]);

  // Live Matching Students Preview calculation when editing/creating a drive in modal
  useEffect(() => {
    if (!showModal) {
      setPreviewMatchingCount(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCalculatingPreview(true);
        const branches = typeof formData.eligibleBranches === 'string'
          ? formData.eligibleBranches.split(',').map(b => b.trim()).filter(Boolean)
          : (Array.isArray(formData.eligibleBranches) ? formData.eligibleBranches : []);

        const res = await API.post('/drives/preview-target-count', {
          targetAudience: formData.targetAudience,
          notificationSettings: formData.notificationSettings,
          eligibleBranches: branches,
          minCgpa: formData.minCgpa,
          maxBacklogs: formData.maxBacklogs,
          eligibilityCriteria: formData.eligibilityCriteria
        });

        if (res.data?.success) {
          setPreviewMatchingCount(res.data.count);
        }
      } catch (err) {
        console.warn('Failed to calculate preview target count:', err.message);
      } finally {
        setCalculatingPreview(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    showModal,
    formData.targetAudience?.type,
    formData.targetAudience?.sectionIds,
    formData.notificationSettings?.targetAudience,
    formData.notificationSettings?.targetSections,
    formData.eligibleBranches,
    formData.minCgpa,
    formData.maxBacklogs,
    formData.eligibilityCriteria
  ]);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const openCreateModal = () => {
    if (!canManage) {
      alert(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`);
      return;
    }
    setEditingDriveId(null);
    fetchActiveSections(academicYear);
    setFormData({
      company: companies.length > 0 ? companies[0]._id : 'ADD_NEW_COMPANY',
      newCompanyName: '',
      jobRole: '',
      package: '',
      location: '',
      driveDate: '',
      deadline: '',
      minCgpa: 6.0,
      maxBacklogs: 0,
      eligibleBranches: '',
      eligibilityCriteria: {
        minimumAcademic: {
          enabled: true,
          type: 'CGPA',
          value: 6.0
        },
        highSchool: {
          enabled: false,
          minimumPercentage: 60
        },
        intermediate: {
          enabled: false,
          minimumPercentage: 60
        }
      },
      jobDescription: null,
      applyLink: '',
      selectionProcess: [],
      notificationSettings: {
        sendEmailNotification: true,
        createInAppNotification: true,
        targetAudience: 'ALL_ACTIVE_STUDENTS',
        targetSections: []
      },
      targetAudience: {
        type: 'ALL_ACTIVE_STUDENTS',
        sectionIds: []
      },
      status: 'DRAFT'
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (drive) => {
    if (!canManage) {
      alert(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`);
      return;
    }
    setEditingDriveId(drive._id);
    fetchActiveSections(drive.academicYear || academicYear);
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

    const existingCriteria = drive.eligibilityCriteria || {
      minimumAcademic: {
        enabled: true,
        type: 'CGPA',
        value: drive.minCgpa ?? 6.0
      },
      highSchool: {
        enabled: false,
        minimumPercentage: 60
      },
      intermediate: {
        enabled: false,
        minimumPercentage: 60
      }
    };

    const savedAudienceType = drive.targetAudience?.type || drive.notificationSettings?.targetAudience || 'ALL_ACTIVE_STUDENTS';
    const savedSections = (drive.targetAudience?.sectionIds || drive.notificationSettings?.targetSections || []).map(s => (s?._id || s).toString());

    const existingNotification = {
      sendEmailNotification: drive.notificationSettings?.sendEmailNotification !== false,
      createInAppNotification: drive.notificationSettings?.createInAppNotification !== false,
      targetAudience: savedAudienceType,
      targetSections: savedSections
    };

    setFormData({
      company: drive.company?._id || drive.company || '',
      newCompanyName: '',
      jobRole: drive.jobRole || '',
      package: drive.package || '',
      location: drive.location || 'Noida',
      driveDate: driveDateFormatted,
      deadline: deadlineFormatted,
      minCgpa: existingCriteria.minimumAcademic?.value ?? drive.minCgpa ?? 6.0,
      maxBacklogs: drive.maxBacklogs ?? 0,
      eligibleBranches: Array.isArray(drive.eligibleBranches) ? drive.eligibleBranches.join(', ') : drive.eligibleBranches || '',
      eligibilityCriteria: existingCriteria,
      jobDescription: drive.jobDescription || null,
      applyLink: drive.applyLink || '',
      selectionProcess: existingProcess,
      notificationSettings: existingNotification,
      targetAudience: {
        type: savedAudienceType,
        sectionIds: savedSections
      },
      status: drive.status || 'DRAFT'
    });
    setFormError(null);
    setShowModal(true);
  };

  // Publish Drive Handler
  const handlePublishDrive = async (driveId) => {
    setPublishingId(driveId);
    try {
      const res = await API.post(`/drives/${driveId}/publish`);
      showToast(res.data?.message || 'Placement Drive published successfully!', 'success');
      await fetchData();
    } catch (err) {
      console.error('Error publishing drive:', err);
      showToast(err.response?.data?.message || 'Failed to publish placement drive.', 'error');
    } finally {
      setPublishingId(null);
    }
  };

  // Retry Failed Emails Handler
  const handleRetryFailedEmails = async (driveId) => {
    setRetryingId(driveId);
    try {
      const res = await API.post(`/drives/${driveId}/notifications/retry-failed`);
      showToast(res.data?.result?.message || 'Failed email notifications retried.', 'success');
      await fetchData();
    } catch (err) {
      console.error('Error retrying emails:', err);
      showToast(err.response?.data?.message || 'Failed to retry emails.', 'error');
    } finally {
      setRetryingId(null);
    }
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
    const allowed = ['pdf', 'doc', 'docx', 'txt'];
    if (!allowed.includes(ext)) {
      setFormError('Only PDF, DOC, DOCX, and TXT files are allowed for Job Description.');
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
  const handleSubmit = async (e, targetStatus = null) => {
    if (e && e.preventDefault) e.preventDefault();
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

    // Validate Target Audience / Section Selection
    const currentAudienceType = formData.targetAudience?.type || formData.notificationSettings?.targetAudience || 'ALL_ACTIVE_STUDENTS';
    const currentSections = formData.targetAudience?.sectionIds || formData.notificationSettings?.targetSections || [];
    if (currentAudienceType === 'SPECIFIC_SECTIONS' && currentSections.length === 0) {
      setFormError('Please select at least one section.');
      return;
    }

    if (!canManage) {
      setFormError(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`);
      return;
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

      const finalStatus = targetStatus || formData.status || 'DRAFT';

      const payload = {
        ...formData,
        status: finalStatus,
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
        notificationSettings: {
          sendEmailNotification: formData.notificationSettings.sendEmailNotification !== false,
          createInAppNotification: formData.notificationSettings.createInAppNotification !== false,
          targetAudience: currentAudienceType,
          targetSections: currentAudienceType === 'SPECIFIC_SECTIONS' ? currentSections : []
        },
        targetAudience: {
          type: currentAudienceType,
          sectionIds: currentAudienceType === 'SPECIFIC_SECTIONS' ? currentSections : []
        },
        academicYear
      };

      let response;
      if (editingDriveId) {
        response = await API.put(`/drives/${editingDriveId}`, payload);
        if (finalStatus === 'PUBLISHED') {
          const pubRes = await API.post(`/drives/${editingDriveId}/publish`, payload);
          showToast(pubRes.data?.message || 'Placement drive updated and published successfully!', 'success');
        } else {
          showToast(response.data?.message || 'Placement drive updated as draft.', 'success');
        }
      } else {
        response = await API.post('/drives', payload);
        const msg = response.data?.message || (finalStatus === 'PUBLISHED' ? 'Placement Drive published successfully.' : 'Placement Drive saved as draft.');
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
    if (!canManage) {
      alert(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`);
      return;
    }
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
          <p className="text-xs text-slate-500 font-medium">Create, publish, and manage placement drives and email notifications for Academic Year {academicYear}</p>
        </div>
        {canManage ? (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" /> Create Placement Drive
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-xs">
            Historical View-Only
          </span>
        )}
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedDrives.map((d) => {
            const hasJd = Boolean(d.jobDescription?.fileUrl || (typeof d.jobDescription === 'string' && d.jobDescription));
            const hasApplyLink = Boolean(d.applyLink);
            const isPublished = d.status === 'PUBLISHED';
            const notifStats = notificationStatuses[d._id];

            return (
              <div key={d._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 hover:shadow-md transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{d.company?.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPublished ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {isPublished ? '📢 PUBLISHED' : '📝 DRAFT'}
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{d.jobRole}</h3>
                      <span className="text-xs font-black text-emerald-600">Package: {d.package}</span>
                    </div>

                    {canManage && (
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
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 text-slate-700 border border-slate-100">
                    <span className="font-extrabold text-slate-900 text-[10px] uppercase tracking-wider block">Academic Eligibility</span>
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                      {d.eligibilityCriteria?.minimumAcademic?.enabled ? (
                        <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                          ✓ {d.eligibilityCriteria.minimumAcademic.type === 'PERCENTAGE' ? `Minimum Percentage: ${d.eligibilityCriteria.minimumAcademic.value}%` : `Minimum CGPA: ${d.eligibilityCriteria.minimumAcademic.value}`}
                        </span>
                      ) : (
                        !d.eligibilityCriteria && <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">✓ Minimum CGPA: {d.minCgpa}</span>
                      )}

                      {d.eligibilityCriteria?.highSchool?.enabled && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ High School: {d.eligibilityCriteria.highSchool.minimumPercentage}%
                        </span>
                      )}

                      {d.eligibilityCriteria?.intermediate?.enabled && (
                        <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
                          ✓ Intermediate: {d.eligibilityCriteria.intermediate.minimumPercentage}%
                        </span>
                      )}

                      {d.eligibilityCriteria && !d.eligibilityCriteria.minimumAcademic?.enabled && !d.eligibilityCriteria.highSchool?.enabled && !d.eligibilityCriteria.intermediate?.enabled && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 font-bold">
                          No academic criteria specified
                        </span>
                      )}
                    </div>

                    <p className="pt-1 text-[11px] font-medium text-slate-600">• Max Backlogs: <strong className="text-slate-800">{d.maxBacklogs}</strong> | Branches: <strong className="text-slate-800">{d.eligibleBranches?.join(', ')}</strong></p>
                  </div>

                  {/* Target Audience & Matching Students Card */}
                  <div className="rounded-xl bg-slate-50 p-2.5 text-xs border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Target Audience</span>
                      <span className="font-bold text-slate-800">
                        {d.targetAudience?.type === 'SPECIFIC_SECTIONS'
                          ? `Specific Sections (${(d.targetAudience.sectionIds || []).map(s => s.code || s.name || s).join(', ') || 'Configured'})`
                          : d.targetAudience?.type === 'ELIGIBLE_STUDENTS_ONLY'
                          ? 'Eligible Students Only'
                          : 'All Active Students'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Matching Students</span>
                      <span className="font-extrabold text-blue-700 text-sm">
                        {notifStats?.matchingStudentsCount !== undefined
                          ? notifStats.matchingStudentsCount
                          : (notifStats?.totalRecipients !== undefined ? notifStats.totalRecipients : '...')}
                      </span>
                    </div>
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

                  {/* Notification Delivery Status Widget */}
                  {isPublished && notifStats && (
                    <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-100 text-xs space-y-2">
                      <div className="flex justify-between items-center font-bold text-slate-800">
                        <span className="flex items-center gap-1 text-blue-900"><Bell className="h-3.5 w-3.5 text-blue-600" /> Notification Status</span>
                        {notifStats.failed > 0 && (
                          <button
                            onClick={() => handleRetryFailedEmails(d._id)}
                            disabled={retryingId === d._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition"
                          >
                            <RotateCcw className="h-3 w-3" /> {retryingId === d._id ? 'Retrying...' : 'Retry Failed Emails'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">Total</span>
                          <span className="font-extrabold text-slate-800">{notifStats.totalRecipients}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                          <span className="block text-[10px] text-emerald-600 font-bold uppercase">Sent</span>
                          <span className="font-extrabold text-emerald-700">{notifStats.sent}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-rose-200">
                          <span className="block text-[10px] text-rose-600 font-bold uppercase">Failed</span>
                          <span className="font-extrabold text-rose-700">{notifStats.failed}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-amber-200">
                          <span className="block text-[10px] text-amber-600 font-bold uppercase">Pending</span>
                          <span className="font-extrabold text-amber-700">{notifStats.pending}</span>
                        </div>
                      </div>

                      {notifStats.skipped > 0 && (
                        <div className="text-[10px] text-slate-500 font-semibold text-right">
                          Skipped / Unreachable: {notifStats.skipped}
                        </div>
                      )}

                      {notifStats.failed > 0 && notifStats.recipients?.find(r => r.status === 'FAILED')?.errorMessage && (
                        <div className="p-2 rounded-lg bg-rose-100/80 border border-rose-200 text-[11px] text-rose-800 leading-snug break-words">
                          <span className="font-bold text-rose-900">Delivery Issue: </span>
                          <span>{notifStats.recipients.find(r => r.status === 'FAILED')?.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <div>Drive Date: <strong className="text-slate-700">{new Date(d.driveDate).toLocaleDateString()}</strong></div>
                    <div>Deadline: <strong className="text-rose-600">{new Date(d.deadline).toLocaleDateString()}</strong></div>
                  </div>

                  {canManage && !isPublished && (
                    <button
                      onClick={() => handlePublishDrive(d._id)}
                      disabled={publishingId === d._id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold shadow-sm hover:bg-emerald-700 transition"
                    >
                      <Send className="h-3.5 w-3.5" /> {publishingId === d._id ? 'Publishing...' : 'Publish Drive'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drives Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
            <span className="text-slate-500 font-semibold">
              Showing <span className="font-bold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, drives.length)}</span> of{' '}
              <span className="font-bold text-slate-900">{drives.length}</span> placement drives
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((pageNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={pageNum}>
                      {prev && pageNum - prev > 1 && (
                        <span className="px-1 text-slate-400 font-bold">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
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

            <form onSubmit={(e) => handleSubmit(e, formData.status)} className="space-y-4 text-xs">
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
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none"
                >
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                  <option value="ADD_NEW_COMPANY">+ Add New Company...</option>
                </select>
              </div>

              {formData.company === 'ADD_NEW_COMPANY' && (
                <div>
                  <label className="font-bold text-slate-700 uppercase">New Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.newCompanyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, newCompanyName: e.target.value }))}
                    placeholder="Enter company name..."
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              {/* 2. Job Role & Package */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Job Role *</label>
                  <input
                    type="text"
                    required
                    value={formData.jobRole}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobRole: e.target.value }))}
                    placeholder="e.g. Software Engineer"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Package (LPA/CTC) *</label>
                  <input
                    type="text"
                    required
                    value={formData.package}
                    onChange={(e) => setFormData(prev => ({ ...prev, package: e.target.value }))}
                    placeholder="e.g. 8.5 LPA"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Location & Drive Date & Deadline */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Noida / Remote"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Drive Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.driveDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, driveDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Academic Eligibility Criteria Section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Academic Eligibility Criteria</h4>

                {/* 1. Minimum Academic Criterion */}
                <div className="space-y-2 border-b border-slate-200/60 pb-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.eligibilityCriteria.minimumAcademic.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          eligibilityCriteria: {
                            ...prev.eligibilityCriteria,
                            minimumAcademic: { ...prev.eligibilityCriteria.minimumAcademic, enabled: checked }
                          }
                        }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Minimum Academic (CGPA or Percentage)</span>
                  </label>

                  {formData.eligibilityCriteria.minimumAcademic.enabled && (
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      <div>
                        <label className="font-bold text-slate-600 text-[10px] uppercase">Evaluation Type</label>
                        <select
                          value={formData.eligibilityCriteria.minimumAcademic.type}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              eligibilityCriteria: {
                                ...prev.eligibilityCriteria,
                                minimumAcademic: {
                                  ...prev.eligibilityCriteria.minimumAcademic,
                                  type: val,
                                  value: val === 'PERCENTAGE' ? 60 : 6.0
                                }
                              }
                            }));
                          }}
                          className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-semibold text-slate-800 bg-white"
                        >
                          <option value="CGPA">CGPA (0 - 10)</option>
                          <option value="PERCENTAGE">Percentage (0 - 100%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 text-[10px] uppercase">
                          Minimum {formData.eligibilityCriteria.minimumAcademic.type === 'PERCENTAGE' ? 'Percentage (%)' : 'CGPA'} *
                        </label>
                        <input
                          type="number"
                          step={formData.eligibilityCriteria.minimumAcademic.type === 'PERCENTAGE' ? '1' : '0.1'}
                          min="0"
                          max={formData.eligibilityCriteria.minimumAcademic.type === 'PERCENTAGE' ? '100' : '10'}
                          value={formData.eligibilityCriteria.minimumAcademic.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({
                              ...prev,
                              eligibilityCriteria: {
                                ...prev.eligibilityCriteria,
                                minimumAcademic: { ...prev.eligibilityCriteria.minimumAcademic, value: val }
                              }
                            }));
                          }}
                          className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-bold text-slate-800 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. High School Percentage (10th) */}
                <div className="space-y-2 border-b border-slate-200/60 pb-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.eligibilityCriteria.highSchool.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          eligibilityCriteria: {
                            ...prev.eligibilityCriteria,
                            highSchool: { ...prev.eligibilityCriteria.highSchool, enabled: checked }
                          }
                        }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>High School Percentage (10th)</span>
                  </label>

                  {formData.eligibilityCriteria.highSchool.enabled && (
                    <div className="pl-6">
                      <label className="font-bold text-slate-600 text-[10px] uppercase">Minimum 10th Percentage (%) *</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.eligibilityCriteria.highSchool.minimumPercentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            eligibilityCriteria: {
                              ...prev.eligibilityCriteria,
                              highSchool: { ...prev.eligibilityCriteria.highSchool, minimumPercentage: val }
                            }
                          }));
                        }}
                        className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-bold text-slate-800 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Intermediate Percentage (12th) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.eligibilityCriteria.intermediate.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          eligibilityCriteria: {
                            ...prev.eligibilityCriteria,
                            intermediate: { ...prev.eligibilityCriteria.intermediate, enabled: checked }
                          }
                        }));
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Intermediate Percentage (12th)</span>
                  </label>

                  {formData.eligibilityCriteria.intermediate.enabled && (
                    <div className="pl-6">
                      <label className="font-bold text-slate-600 text-[10px] uppercase">Minimum 12th Percentage (%) *</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.eligibilityCriteria.intermediate.minimumPercentage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            eligibilityCriteria: {
                              ...prev.eligibilityCriteria,
                              intermediate: { ...prev.eligibilityCriteria.intermediate, minimumPercentage: val }
                            }
                          }));
                        }}
                        className="mt-0.5 w-full rounded-xl border border-slate-200 p-2 font-bold text-slate-800 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Max Backlogs & Eligible Branches */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Max Allowed Active Backlogs *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.maxBacklogs}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxBacklogs: parseInt(e.target.value) || 0 }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Eligible Branches *</label>
                  <input
                    type="text"
                    required
                    value={formData.eligibleBranches}
                    onChange={(e) => setFormData(prev => ({ ...prev, eligibleBranches: e.target.value }))}
                    placeholder="Enter comma-separated departments or ALL"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* 6. Upload JD PDF */}
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Job Description PDF Document</label>
                {formData.jobDescription?.fileUrl ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <FileText className="h-5 w-5 text-red-500 shrink-0" />
                      <span className="font-bold text-slate-800 truncate">
                        📄 {formData.jobDescription.fileName || 'Company-JD.pdf'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePdf}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-rose-100 hover:text-rose-700 transition shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={handlePdfFileSelect}
                      disabled={uploadingPdf}
                      className="hidden"
                      id="jdPdfUploadInput"
                    />
                    <label
                      htmlFor="jdPdfUploadInput"
                      className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer font-bold text-slate-600 transition"
                    >
                      <Upload className="h-4 w-4 text-blue-600" />
                      <span>{uploadingPdf ? 'Uploading Document...' : '📄 Select Official JD Document (PDF, DOC, DOCX, TXT)'}</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 7. Official Apply Link */}
              <div>
                <label className="font-bold text-slate-700 uppercase">Official Apply Link (Optional)</label>
                <input
                  type="url"
                  value={formData.applyLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, applyLink: e.target.value }))}
                  placeholder="e.g. https://company.com/careers/job-id-101"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              {/* 8. Selection Process */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase">Selection Process Rounds</label>
                  <button
                    type="button"
                    onClick={handleAddRound}
                    className="text-xs font-extrabold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Round
                  </button>
                </div>

                {formData.selectionProcess.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    No rounds added yet. Click "+ Add Round" above to configure selection process.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {formData.selectionProcess.map((round, idx) => (
                      <div key={idx} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 relative">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="font-extrabold text-blue-700 text-xs">Round {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRound(idx)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded-lg transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
                  </div>
                )}
              </div>

              {/* Student Notification Settings Card */}
              <div className="rounded-2xl border border-slate-200 bg-blue-50/50 p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-blue-600" /> Student Notification Settings
                </h4>

                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.notificationSettings.sendEmailNotification}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notificationSettings: { ...prev.notificationSettings, sendEmailNotification: e.target.checked }
                      }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>☑ Send Email Notification</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.notificationSettings.createInAppNotification}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notificationSettings: { ...prev.notificationSettings, createInAppNotification: e.target.checked }
                      }))}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>☑ Create In-App Notification</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-blue-200/60 space-y-2">
                  <label className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">Target Audience</label>
                  <div className="flex flex-col sm:flex-row gap-3 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="targetAudience"
                        value="ALL_ACTIVE_STUDENTS"
                        checked={
                          (formData.targetAudience?.type || formData.notificationSettings?.targetAudience) === 'ALL_ACTIVE_STUDENTS'
                        }
                        onChange={() => setFormData(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            targetAudience: 'ALL_ACTIVE_STUDENTS',
                            targetSections: []
                          },
                          targetAudience: {
                            type: 'ALL_ACTIVE_STUDENTS',
                            sectionIds: []
                          }
                        }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>All Active Students</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="targetAudience"
                        value="ELIGIBLE_STUDENTS_ONLY"
                        checked={
                          (formData.targetAudience?.type || formData.notificationSettings?.targetAudience) === 'ELIGIBLE_STUDENTS_ONLY'
                        }
                        onChange={() => setFormData(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            targetAudience: 'ELIGIBLE_STUDENTS_ONLY',
                            targetSections: []
                          },
                          targetAudience: {
                            type: 'ELIGIBLE_STUDENTS_ONLY',
                            sectionIds: []
                          }
                        }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Eligible Students Only</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="targetAudience"
                        value="SPECIFIC_SECTIONS"
                        checked={
                          (formData.targetAudience?.type || formData.notificationSettings?.targetAudience) === 'SPECIFIC_SECTIONS'
                        }
                        onChange={() => {
                          fetchActiveSections();
                          setFormData(prev => ({
                            ...prev,
                            notificationSettings: {
                              ...prev.notificationSettings,
                              targetAudience: 'SPECIFIC_SECTIONS'
                            },
                            targetAudience: {
                              ...prev.targetAudience,
                              type: 'SPECIFIC_SECTIONS'
                            }
                          }));
                        }}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-bold text-indigo-900">Specific Sections</span>
                    </label>
                  </div>

                  {/* Dynamic Section Selector (Rendered ONLY when Specific Sections is selected) */}
                  {(formData.targetAudience?.type === 'SPECIFIC_SECTIONS' || formData.notificationSettings?.targetAudience === 'SPECIFIC_SECTIONS') && (
                    <div className="mt-2.5 p-3 rounded-2xl bg-white border border-indigo-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                            Select Sections *
                          </label>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {(formData.targetAudience?.sectionIds || formData.notificationSettings?.targetSections || []).length} sections selected
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px]">
                          <button
                            type="button"
                            disabled={sectionsLoading || sections.length === 0}
                            onClick={() => {
                              const allIds = sections.map(s => s._id);
                              setFormData(prev => ({
                                ...prev,
                                notificationSettings: {
                                  ...prev.notificationSettings,
                                  targetSections: allIds
                                },
                                targetAudience: {
                                  ...prev.targetAudience,
                                  type: 'SPECIFIC_SECTIONS',
                                  sectionIds: allIds
                                }
                              }));
                            }}
                            className="px-2 py-0.5 rounded-md font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition"
                          >
                            [ Select All ]
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            disabled={sectionsLoading || (formData.targetAudience?.sectionIds || []).length === 0}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                notificationSettings: {
                                  ...prev.notificationSettings,
                                  targetSections: []
                                },
                                targetAudience: {
                                  ...prev.targetAudience,
                                  type: 'SPECIFIC_SECTIONS',
                                  sectionIds: []
                                }
                              }));
                            }}
                            className="px-2 py-0.5 rounded-md font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition"
                          >
                            [ Clear All ]
                          </button>
                        </div>
                      </div>

                      {/* Requirement #8: Loading state */}
                      {sectionsLoading ? (
                        <div className="text-xs text-slate-500 py-3 flex items-center gap-2">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                          <span>Loading sections...</span>
                        </div>
                      ) : sectionsError ? (
                        /* Requirement #10: API Error state */
                        <div className="flex items-center justify-between text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                          <span>{sectionsError}</span>
                          <button
                            type="button"
                            onClick={fetchActiveSections}
                            className="text-[11px] font-bold text-rose-800 underline hover:no-underline ml-2"
                          >
                            Retry
                          </button>
                        </div>
                      ) : sections.length === 0 ? (
                        /* Requirement #9: Empty state */
                        <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          No active sections available. Please create a section from Faculty Management.
                        </div>
                      ) : (
                        /* Requirement #4: Dynamic Checkbox Grid */
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {sections.map(sec => {
                            const currentIds = formData.targetAudience?.sectionIds || formData.notificationSettings?.targetSections || [];
                            const isChecked = currentIds.includes(sec._id);
                            return (
                              <label
                                key={sec._id}
                                className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const nextIds = e.target.checked
                                      ? [...currentIds, sec._id]
                                      : currentIds.filter(id => id !== sec._id);
                                    setFormData(prev => ({
                                      ...prev,
                                      notificationSettings: {
                                        ...prev.notificationSettings,
                                        targetSections: nextIds
                                      },
                                      targetAudience: {
                                        ...prev.targetAudience,
                                        type: 'SPECIFIC_SECTIONS',
                                        sectionIds: nextIds
                                      }
                                    }));
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>{sec.name}</span>
                                {sec.code && sec.code !== sec.name && (
                                  <span className="text-[10px] text-slate-400">({sec.code})</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {!sectionsLoading && !sectionsError && (formData.targetAudience?.sectionIds || formData.notificationSettings?.targetSections || []).length === 0 && (
                        <p className="text-[11px] font-semibold text-rose-600 mt-1">
                          * Please select at least one section.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Live Matching Students Counter Banner */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-blue-200 text-xs shadow-xs mt-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-slate-700">Calculated Matching Students:</span>
                    </div>
                    <span className="font-black text-blue-700 text-sm">
                      {calculatingPreview ? (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                          <RefreshCw className="h-3 w-3 animate-spin" /> Calculating...
                        </span>
                      ) : (
                        `${previewMatchingCount !== null ? previewMatchingCount : 0} Students`
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || uploadingPdf}
                  onClick={(e) => handleSubmit(e, 'DRAFT')}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-300 disabled:opacity-50 transition"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={submitting || uploadingPdf}
                  onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50 transition text-xs flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> {submitting ? 'Publishing...' : 'Publish Drive'}
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

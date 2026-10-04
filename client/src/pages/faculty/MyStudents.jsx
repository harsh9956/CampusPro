import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  Users,
  Search,
  Filter,
  Download,
  RotateCcw,
  Building2,
  Layers,
  GraduationCap,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Mail,
  Phone,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  UserX,
  UserCheck,
  ExternalLink,
  ShieldAlert,
  X,
  BookOpen,
  Award,
  Globe,
  Lock
} from 'lucide-react';
import departmentService from '../../services/departmentService';
import sectionService from '../../services/sectionService';
import studentService from '../../services/studentService';

const MyStudents = () => {
  const { user, profile } = useAuth();
  const { academicYear, isHistorical, historicalManageMode } = useAcademicYear();

  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isFaculty = userRole === 'FACULTY';
  // Normal Admin is strictly read-only for historical academic year data
  const canEdit = !isHistorical || isSuperAdmin;

  // State for database-driven filter options
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Filter States
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [minCgpaFilter, setMinCgpaFilter] = useState('0');
  const [backlogsFilter, setBacklogsFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Data & UI states
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportState, setExportState] = useState('IDLE'); // 'IDLE' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  const [exportCompletedJob, setExportCompletedJob] = useState(null);
  const exportPollRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Toast feedback state
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'warning' }
  const toastTimeoutRef = useRef(null);

  // Clean up timers and pending requests on unmount
  useEffect(() => {
    return () => {
      if (exportPollRef.current) clearInterval(exportPollRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selection states (for Bulk Delete)
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Row Action Dropdown Menu State
  const [openMenuStudentId, setOpenMenuStudentId] = useState(null);

  // Modal States
  // 1. View Details Modal
  const [viewingStudent, setViewingStudent] = useState(null);
  const [viewDetailsData, setViewDetailsData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 2. Edit Student Modal
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    enrollmentNo: '',
    department: '',
    section: '',
    cgpa: '',
    tenthPercentage: '',
    twelfthPercentage: '',
    backlogs: 0,
    skills: '',
    academicYear: '',
    status: 'ACTIVE',
    bio: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState(null);

  // 3. Deactivate / Activate Status Modal
  const [statusTargetStudent, setStatusTargetStudent] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // 4. Delete Permanently Modal (Single)
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingPermanently, setDeletingPermanently] = useState(false);

  // 5. Bulk Delete Modal
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Faculty Department Scoping
  const facultyDeptId = profile?.department?._id || (typeof profile?.department === 'string' ? profile.department : '');
  const facultyDeptName = profile?.department?.name || profile?.department?.code || 'Department';

  // Close open dropdown menu when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.row-actions-container')) {
        setOpenMenuStudentId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Load database-driven options (Active Departments & Active Sections)
  useEffect(() => {
    let isMounted = true;
    const loadFilterOptions = async () => {
      try {
        setOptionsLoading(true);
        const [deptsData, sectionsData] = await Promise.all([
          departmentService.getActiveDepartments({ academicYear }).catch(() => []),
          sectionService.getActiveSections({ academicYear }).catch(() => [])
        ]);

        if (isMounted) {
          setDepartments(deptsData || []);
          setSections(sectionsData || []);

          if (isFaculty && facultyDeptId) {
            setSelectedDepartment(facultyDeptId);
          }
        }
      } catch (err) {
        console.error('[Error loading filter options]', err);
      } finally {
        if (isMounted) setOptionsLoading(false);
      }
    };

    loadFilterOptions();
    return () => {
      isMounted = false;
    };
  }, [isFaculty, facultyDeptId, academicYear]);

  // Debounce search input (350ms) for backend queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when any filter changes
  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  // Reset export state whenever any filter changes so the user never exports stale results
  useEffect(() => {
    if (exportPollRef.current) {
      clearInterval(exportPollRef.current);
      exportPollRef.current = null;
    }
    setExporting(false);
    setExportState('IDLE');
    setExportCompletedJob(null);
    setExportError(null);
  }, [
    selectedDepartment,
    selectedSection,
    minCgpaFilter,
    backlogsFilter,
    statusFilter,
    debouncedSearch,
    academicYear
  ]);

  // Fetch filtered students from backend with request cancellation
  const fetchFilteredStudents = async () => {
    // Abort previous in-flight request if user changed query
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);

      const params = {
        academicYear
      };

      if (selectedDepartment && selectedDepartment !== 'ALL') {
        params.department = selectedDepartment;
      } else if (isFaculty && facultyDeptId) {
        params.department = facultyDeptId;
      }

      if (selectedSection && selectedSection !== 'ALL') {
        params.section = selectedSection;
      }

      if (minCgpaFilter && minCgpaFilter !== '0') {
        params.minCgpa = minCgpaFilter;
      }

      if (backlogsFilter && backlogsFilter !== 'ALL') {
        params.backlogs = backlogsFilter;
      }

      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      params.page = currentPage;
      params.limit = pageSize;

      const res = await studentService.getStudents(params, controller.signal);
      if (res && res.pagination) {
        setStudents(Array.isArray(res.data) ? res.data : []);
        setTotalStudents(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      } else if (Array.isArray(res)) {
        setStudents(res);
        setTotalStudents(res.length);
        setTotalPages(Math.ceil(res.length / pageSize) || 1);
      } else {
        setStudents(res?.data || []);
        setTotalStudents(res?.total || res?.data?.length || 0);
        setTotalPages(res?.totalPages || Math.ceil((res?.data?.length || 0) / pageSize) || 1);
      }
    } catch (err) {
      // If superseded and aborted, silently return without clearing data or showing errors
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') {
        return;
      }
      console.error('[Fetch Students Error]', err);
      setStudents([]);
      setTotalStudents(0);
      setTotalPages(1);
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchFilteredStudents();
  }, [
    currentPage,
    pageSize,
    academicYear,
    selectedDepartment,
    selectedSection,
    minCgpaFilter,
    backlogsFilter,
    statusFilter,
    debouncedSearch,
    isFaculty,
    facultyDeptId
  ]);

  // Reset all filters
  const handleClearFilters = () => {
    setSelectedDepartment(isFaculty && facultyDeptId ? facultyDeptId : 'ALL');
    setSelectedSection('ALL');
    setMinCgpaFilter('0');
    setBacklogsFilter('ALL');
    setStatusFilter('ALL');
    setSearch('');
    setDebouncedSearch('');
    setCurrentPage(1);
    setExportError(null);
  };

  // Download helper for completed export file
  const handleDownloadCompletedExport = async (job) => {
    if (!job || !job.jobId) return;
    try {
      showToast('Downloading Excel file...', 'info');
      const res = await studentService.downloadExport(job.jobId);
      const filename = job.fileName || `CampusPro_Filtered_Students_${academicYear || 'All'}.xlsx`;
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Download error]', err);
      showToast('Failed to download exported Excel file. Please try again.', 'error');
    }
  };

  // Trigger Asynchronous Excel (.xlsx) Background Export
  const handleExportExcel = async () => {
    if (totalStudents === 0 || exporting) return;

    // If job has already completed for current filters, clicking the button triggers download directly
    if (exportState === 'COMPLETED' && exportCompletedJob) {
      return handleDownloadCompletedExport(exportCompletedJob);
    }

    if (exportPollRef.current) {
      clearInterval(exportPollRef.current);
      exportPollRef.current = null;
    }

    setExporting(true);
    setExportState('QUEUED');
    setExportError(null);

    try {
      const params = {
        academicYear
      };

      if (selectedDepartment && selectedDepartment !== 'ALL') {
        params.department = selectedDepartment;
      }
      if (selectedSection && selectedSection !== 'ALL') {
        params.section = selectedSection;
      }
      if (minCgpaFilter && minCgpaFilter !== '0') {
        params.minCgpa = minCgpaFilter;
      }
      if (backlogsFilter && backlogsFilter !== 'ALL') {
        params.backlogs = backlogsFilter;
      }
      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await studentService.exportStudents(params);
      const jobId = res?.jobId;
      if (!jobId) {
        throw new Error(res?.message || 'Failed to queue export job.');
      }

      showToast('Export queued in background. Processing...', 'info');

      // Poll export status every 1000ms for fast feedback
      exportPollRef.current = setInterval(async () => {
        try {
          const statusRes = await studentService.getExportStatus(jobId);
          const job = statusRes?.job;
          if (!job) return;

          if (job.status === 'PROCESSING') {
            setExportState('PROCESSING');
          } else if (job.status === 'COMPLETED') {
            if (exportPollRef.current) {
              clearInterval(exportPollRef.current);
              exportPollRef.current = null;
            }
            setExportState('COMPLETED');
            setExporting(false);
            const completedInfo = {
              jobId: job._id,
              fileName: job.fileName,
              totalRecords: job.processedRecords || job.totalRecords
            };
            setExportCompletedJob(completedInfo);
            showToast(`Export completed (${completedInfo.totalRecords} records)! Downloading...`, 'success');
            // Auto download on completion
            handleDownloadCompletedExport(completedInfo);
          } else if (job.status === 'FAILED') {
            if (exportPollRef.current) {
              clearInterval(exportPollRef.current);
              exportPollRef.current = null;
            }
            setExportState('FAILED');
            setExporting(false);
            const errMsg = job.errorMessage || 'Export job failed.';
            setExportError(errMsg);
            showToast(errMsg, 'error');
          }
        } catch (pollErr) {
          console.error('[Export Poll Error]', pollErr);
        }
      }, 1000);
    } catch (err) {
      console.error('[Export Error]', err);
      setExporting(false);
      setExportState('FAILED');
      const msg = err.response?.data?.message || err.message || 'Failed to initiate background export.';
      setExportError(msg);
      showToast(msg, 'error');
    }
  };

  // Active Department and Section label helpers for dynamic badge
  const selectedDeptObj = departments.find((d) => d._id === selectedDepartment);
  const selectedSecObj = sections.find((s) => s._id === selectedSection);

  const scopeBadgeText = useMemo(() => {
    let scopeParts = [];
    if (selectedDeptObj) {
      scopeParts.push(selectedDeptObj.code || selectedDeptObj.name);
    } else if (isFaculty) {
      scopeParts.push(facultyDeptName);
    } else {
      scopeParts.push('All Departments');
    }

    if (selectedSecObj) {
      scopeParts.push(selectedSecObj.name);
    }

    const scopeStr = scopeParts.join(' • ');
    return `${scopeStr} (${totalStudents} ${totalStudents === 1 ? 'Student' : 'Students'})`;
  }, [selectedDeptObj, selectedSecObj, isFaculty, facultyDeptName, totalStudents]);

  const hasActiveFilters =
    (selectedDepartment !== 'ALL' && (!isFaculty || selectedDepartment !== facultyDeptId)) ||
    selectedSection !== 'ALL' ||
    minCgpaFilter !== '0' ||
    backlogsFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    search.trim() !== '';

  // Server-side paginated students for current view
  const paginatedStudents = students;

  // Selection Checkbox Logic
  const isAllCurrentPageSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((s) => selectedStudentIds.includes(s._id));

  const isSomeCurrentPageSelected =
    paginatedStudents.some((s) => selectedStudentIds.includes(s._id)) && !isAllCurrentPageSelected;

  const handleToggleSelectAllPage = () => {
    if (isAllCurrentPageSelected) {
      // Unselect all on current page
      const pageIds = paginatedStudents.map((s) => s._id);
      setSelectedStudentIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      // Select all on current page
      const pageIds = paginatedStudents.map((s) => s._id);
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------

  const getAuthorizedResumeUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const token = localStorage.getItem('campuspro_token');
    const sep = url.includes('?') ? '&' : '?';
    return token ? `${url}${sep}token=${token}` : url;
  };

  // 1. View Details Handler
  const handleOpenViewDetails = async (student) => {
    setOpenMenuStudentId(null);
    setViewingStudent(student);
    setViewDetailsData(null);
    setLoadingDetails(true);

    try {
      const data = await studentService.getStudentById(student._id);
      setViewDetailsData(data);
    } catch (err) {
      console.error('[Error fetching student details]', err);
      showToast(err.response?.data?.message || 'Failed to load complete student details.', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // 2. Edit Student Handler
  const handleOpenEdit = (student) => {
    setOpenMenuStudentId(null);
    if (!canEdit) {
      showToast('Historical academic year data is read-only for Admin. Select the current academic year to modify data.', 'warning');
      return;
    }
    setEditingStudent(student);
    setEditFormError(null);

    let formattedDob = '';
    if (student.dateOfBirth) {
      try {
        formattedDob = new Date(student.dateOfBirth).toISOString().split('T')[0];
      } catch (e) {
        formattedDob = '';
      }
    }

    setEditFormData({
      name: student.user?.name || '',
      email: student.user?.email || '',
      phone: student.studentMobileNumber || student.phone || '',
      studentMobileNumber: student.studentMobileNumber || student.phone || '',
      enrollmentNo: student.enrollmentNo || '',
      department: student.department?._id || student.department || '',
      section: student.section?._id || student.section || '',
      cgpa: student.cgpa !== undefined && student.cgpa !== null ? student.cgpa : '',
      tenthPercentage: student.tenthPercentage !== undefined && student.tenthPercentage !== null ? student.tenthPercentage : '',
      twelfthPercentage: student.twelfthPercentage !== undefined && student.twelfthPercentage !== null ? student.twelfthPercentage : '',
      backlogs: student.backlogs !== undefined && student.backlogs !== null ? student.backlogs : 0,
      dateOfBirth: formattedDob,
      parentMobileNumber: student.parentMobileNumber || '',
      permanentAddress: student.permanentAddress || '',
      permanentPinCode: student.permanentPinCode || student.pinCode || '',
      temporaryAddress: student.temporaryAddress || '',
      temporaryPinCode: student.temporaryPinCode || (student.permanentPinCode || student.pinCode || ''),
      pinCode: student.permanentPinCode || student.pinCode || '',
      skills: Array.isArray(student.skills) ? student.skills.join(', ') : '',
      academicYear: student.academicYear || student.user?.academicYear || academicYear || '',
      status: (student.user?.status || 'ACTIVE').toUpperCase(),
      bio: student.bio || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingEdit(true);
    setEditFormError(null);

    try {
      await studentService.updateStudent(editingStudent._id, editFormData);
      showToast(`Student ${editFormData.name} updated successfully!`, 'success');
      setEditingStudent(null);
      await fetchFilteredStudents();
    } catch (err) {
      console.error('[Save Edit Error]', err);
      setEditFormError(err.response?.data?.message || 'Failed to update student profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  // 3. Deactivate / Activate Status Handler
  const handleOpenStatusModal = (student) => {
    setOpenMenuStudentId(null);
    if (!canEdit) {
      showToast('Historical academic year data is read-only for Admin. Select the current academic year to modify data.', 'warning');
      return;
    }
    setStatusTargetStudent(student);
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusTargetStudent) return;
    setTogglingStatus(true);

    const isCurrentlyActive = (statusTargetStudent.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
    const targetStatus = isCurrentlyActive ? 'INACTIVE' : 'ACTIVE';

    try {
      const res = await studentService.toggleStudentStatus(statusTargetStudent._id, targetStatus);
      showToast(res.message || `Student status changed to ${targetStatus}.`, 'success');
      setStatusTargetStudent(null);
      await fetchFilteredStudents();
    } catch (err) {
      console.error('[Toggle Status Error]', err);
      showToast(err.response?.data?.message || 'Failed to update student status.', 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  // 4. Delete Permanently Handler (Single)
  const handleOpenDelete = (student) => {
    setOpenMenuStudentId(null);
    if (!canEdit) {
      showToast('Historical academic year data is read-only for Admin. Select the current academic year to modify data.', 'warning');
      return;
    }
    setDeletingStudent(student);
    setDeleteConfirmText('');
  };

  const handleConfirmDeletePermanently = async () => {
    if (!deletingStudent || deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeletingPermanently(true);

    try {
      const res = await studentService.deleteStudent(deletingStudent._id);
      showToast(res.message || 'Student deleted permanently.', 'success');
      setSelectedStudentIds((prev) => prev.filter((id) => id !== deletingStudent._id));
      setDeletingStudent(null);
      setDeleteConfirmText('');
      await fetchFilteredStudents();
    } catch (err) {
      console.error('[Delete Permanently Error]', err);
      showToast(err.response?.data?.message || 'Unable to delete student. No data was removed.', 'error');
    } finally {
      setDeletingPermanently(false);
    }
  };

  // 5. Bulk Delete Handler
  const handleOpenBulkDelete = () => {
    if (!canEdit) {
      showToast('Historical academic year data is read-only for Admin. Select the current academic year to modify data.', 'warning');
      return;
    }
    setBulkDeleteConfirmText('');
    setShowBulkDeleteModal(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedStudentIds.length === 0 || bulkDeleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setBulkDeleting(true);

    try {
      const res = await studentService.bulkDeleteStudents(selectedStudentIds);
      showToast(res.message || `${selectedStudentIds.length} students deleted permanently.`, 'success');
      setSelectedStudentIds([]);
      setShowBulkDeleteModal(false);
      setBulkDeleteConfirmText('');
      await fetchFilteredStudents();
    } catch (err) {
      console.error('[Bulk Delete Error]', err);
      showToast(err.response?.data?.message || 'Bulk deletion failed. Please try again.', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-500/10'
              : toast.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-amber-500/10'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isAdmin ? 'Student Directory' : 'Department Students Directory'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              {scopeBadgeText}
            </span>
            {isHistorical && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                Historical View-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isAdmin
              ? `Dynamic Administrative Student Management • Academic Year: ${academicYear}${isHistorical ? ' (Historical View-Only)' : ''}`
              : `Department: ${facultyDeptName} • Academic Year: ${academicYear}${isHistorical ? ' (Historical View-Only)' : ''}`}
          </p>
        </div>

        {/* Action Buttons: Export Excel */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={students.length === 0 || (exporting && exportState !== 'COMPLETED') || loading}
              title={students.length === 0 ? 'No filtered records to export' : 'Export filtered students to Excel (.xlsx)'}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                students.length === 0 || (exporting && exportState !== 'COMPLETED') || loading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : exportState === 'COMPLETED'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
              }`}
            >
              {exportState === 'QUEUED' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Export queued...</span>
                </>
              ) : exportState === 'PROCESSING' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : exportState === 'COMPLETED' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  <span>Download Excel ({exportCompletedJob?.totalRecords || students.length})</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 text-emerald-100" />
                  <span>Export Excel ({totalStudents || students.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Export Error Alert */}
      {exportError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Dynamic Filters Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Student Directory Filters</span>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Filters Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-red-600 transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Search Student
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, enrollment no, or email..."
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-medium placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Department Filter (Database-driven) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => handleFilterChange(setSelectedDepartment, e.target.value)}
              disabled={isFaculty}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter (Database-driven) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => handleFilterChange(setSelectedSection, e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">All Sections</option>
              {sections.map((sec) => (
                <option key={sec._id} value={sec._id}>
                  Section {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* CGPA Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Minimum CGPA
            </label>
            <select
              value={minCgpaFilter}
              onChange={(e) => handleFilterChange(setMinCgpaFilter, e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="0">All CGPA Scores</option>
              <option value="6.0">Min CGPA 6.0+</option>
              <option value="7.0">Min CGPA 7.0+</option>
              <option value="8.0">Min CGPA 8.0+</option>
              <option value="8.5">Min CGPA 8.5+</option>
              <option value="9.0">Min CGPA 9.0+</option>
            </select>
          </div>
        </div>

        {/* Secondary Row: Backlogs, Status & Results Counter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            {/* Backlogs Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Backlogs:</span>
              <select
                value={backlogsFilter}
                onChange={(e) => handleFilterChange(setBacklogsFilter, e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Backlogs</option>
                <option value="0">Zero Backlogs (0)</option>
                <option value="has">Has Backlogs (&gt;0)</option>
              </select>
            </div>

            {/* Student Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">
              Showing <span className="text-slate-900 font-bold">{totalStudents.toLocaleString()}</span> matching records
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {isAdmin && canEdit && selectedStudentIds.length > 0 && (
        <div className="rounded-2xl bg-slate-900 text-white p-3 px-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-blue-600 text-white font-black px-2 py-0.5 rounded-full text-[11px]">
              {selectedStudentIds.length}
            </span>
            <span className="font-bold">
              {selectedStudentIds.length === 1 ? 'student selected' : 'students selected'}
            </span>
            <span className="text-slate-400">for bulk actions</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedStudentIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Clear Selection
            </button>
            <button
              onClick={handleOpenBulkDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/30 transition active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedStudentIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Students Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full min-w-[950px] text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {/* Select All Checkbox Header (Admin only, Current Year / Editable only) */}
                {isAdmin && canEdit && (
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeCurrentPageSelected;
                      }}
                      onChange={handleToggleSelectAllPage}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                )}
                <th className="p-4">Student Details</th>
                <th className="p-4">Enrollment No</th>
                <th className="p-4">Email</th>
                <th className="p-4">Department</th>
                <th className="p-4">Section</th>
                <th className="p-4 text-center">CGPA</th>
                <th className="p-4 text-center">10th %</th>
                <th className="p-4 text-center">12th %</th>
                <th className="p-4 text-center">Backlogs</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Skills</th>
                <th className="p-4 text-center">Status</th>
                {isAdmin && <th className="p-4 text-center w-16">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? (canEdit ? 14 : 13) : 12} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-xs font-bold text-slate-600">Loading student directory...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? (canEdit ? 14 : 13) : 12} className="text-center py-16 text-slate-400">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Users className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No students found</p>
                      <p className="text-xs text-slate-500">
                        No students found for the selected filters. Try broadening your criteria or reset the filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const deptDisplay = s.department?.name || s.department?.code || s.branch || 'N/A';
                  const secDisplay = s.section?.name || 'N/A';
                  const isZeroBacklog = Number(s.backlogs) === 0;
                  const isSelected = selectedStudentIds.includes(s._id);
                  const isInactive = (s.user?.status || 'ACTIVE').toUpperCase() !== 'ACTIVE';
                  const isMenuOpen = openMenuStudentId === s._id;

                  return (
                    <tr
                      key={s._id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-blue-50/40' : ''
                      } ${isInactive ? 'opacity-75' : ''}`}
                    >
                      {/* Checkbox */}
                      {isAdmin && canEdit && (
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(s._id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Name & Academic Year */}
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-full font-black text-[11px] flex items-center justify-center flex-shrink-0 ${
                              isInactive
                                ? 'bg-slate-200 text-slate-500'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {s.user?.name ? s.user.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {s.user?.name || 'Unnamed Student'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Year {s.year || 4} • {s.branch || deptDisplay}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Enrollment No */}
                      <td className="p-4 font-mono font-bold text-slate-700">
                        {s.enrollmentNo || 'N/A'}
                      </td>

                      {/* Email */}
                      <td className="p-4 text-slate-600">
                        {s.user?.email || 'N/A'}
                      </td>

                      {/* Department */}
                      <td className="p-4">
                        <span className="inline-block bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-blue-200">
                          {deptDisplay}
                        </span>
                      </td>

                      {/* Section */}
                      <td className="p-4">
                        {s.section?.name ? (
                          <span className="inline-block bg-purple-50 text-purple-800 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-purple-200">
                            {s.section.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">N/A</span>
                        )}
                      </td>

                      {/* CGPA */}
                      <td className="p-4 text-center font-black text-emerald-700 text-xs">
                        {s.cgpa !== undefined && s.cgpa !== null ? s.cgpa : 'N/A'}
                      </td>

                      {/* 10th % */}
                      <td className="p-4 text-center text-slate-700 font-medium">
                        {s.tenthPercentage !== undefined && s.tenthPercentage !== null ? `${s.tenthPercentage}%` : 'N/A'}
                      </td>

                      {/* 12th % */}
                      <td className="p-4 text-center text-slate-700 font-medium">
                        {s.twelfthPercentage !== undefined && s.twelfthPercentage !== null ? `${s.twelfthPercentage}%` : 'N/A'}
                      </td>

                      {/* Active Backlogs */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            isZeroBacklog
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {s.backlogs !== undefined && s.backlogs !== null ? s.backlogs : 0}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="p-4 text-slate-600 font-medium">
                        {s.phone || 'N/A'}
                      </td>

                      {/* Skills */}
                      <td className="p-4 text-slate-600 max-w-xs truncate" title={s.skills?.join(', ')}>
                        {Array.isArray(s.skills) && s.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {s.skills.slice(0, 2).map((skill, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              >
                                {skill}
                              </span>
                            ))}
                            {s.skills.length > 2 && (
                              <span className="text-[10px] font-bold text-slate-400">
                                +{s.skills.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            !isInactive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.user?.status || 'ACTIVE'}
                        </span>
                      </td>

                      {/* Actions Menu Column (Admin only) */}
                      {isAdmin && (
                        <td className="p-4 text-center relative row-actions-container">
                          {!canEdit ? (
                            <button
                              onClick={() => handleOpenViewDetails(s)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                              title="View Student Details (Historical Read-Only)"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              <span>View</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuStudentId((prev) => (prev === s._id ? null : s._id));
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                title="Student Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuOpen && (
                                <div className="absolute right-6 top-10 z-30 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl py-1 text-left animate-in fade-in zoom-in-95">
                                  <button
                                    onClick={() => handleOpenViewDetails(s)}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                                    <span>View Details</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenEdit(s)}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Edit Student</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenStatusModal(s)}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                  >
                                    {isInactive ? (
                                      <>
                                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Activate</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="h-3.5 w-3.5 text-amber-600" />
                                        <span>Deactivate</span>
                                      </>
                                    )}
                                  </button>

                                  <div className="border-t border-slate-100 my-1"></div>

                                  <button
                                    onClick={() => handleOpenDelete(s)}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                    <span>Delete Permanently</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination & Record Summary */}
        {!loading && students.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>
                Showing{' '}
                <span className="font-bold text-slate-900">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-900">
                  {Math.min(currentPage * pageSize, totalStudents)}
                </span>{' '}
                of <span className="font-bold text-slate-900">{totalStudents}</span> students
              </span>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-bold text-slate-700 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
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
                              ? 'bg-blue-600 text-white shadow-sm'
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
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: VIEW STUDENT DETAILS */}
      {/* ======================================================== */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 font-black text-lg flex items-center justify-center">
                  {viewingStudent.user?.name ? viewingStudent.user.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {viewingStudent.user?.name || 'Student Profile'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Enrollment: <span className="font-mono font-bold text-slate-700">{viewingStudent.enrollmentNo}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span>Loading complete student record...</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Contact & Status Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                    <p className="font-semibold text-slate-800 break-all">{viewingStudent.user?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
                    <p className="font-semibold text-slate-800">{viewingStudent.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Account Status</span>
                    <p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          (viewingStudent.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {viewingStudent.user?.status || 'ACTIVE'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Personal Details */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Personal Details
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Date of Birth</span>
                      <p className="font-bold text-slate-800 text-xs mt-0.5">
                        {viewingStudent.dateOfBirth
                          ? new Date(viewingStudent.dateOfBirth).toLocaleDateString('en-GB')
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Student Mobile</span>
                      <p className="font-bold text-slate-800 text-xs mt-0.5">
                        {viewingStudent.studentMobileNumber || viewingStudent.phone || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Parent Mobile</span>
                      <p className="font-bold text-slate-800 text-xs mt-0.5">
                        {viewingStudent.parentMobileNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Permanent PIN</span>
                      <p className="font-bold text-slate-800 text-xs mt-0.5">
                        {viewingStudent.permanentPinCode || viewingStudent.pinCode || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Permanent Address</span>
                        <span className="text-[10px] font-bold text-slate-500">PIN: {viewingStudent.permanentPinCode || viewingStudent.pinCode || 'N/A'}</span>
                      </div>
                      <p className="font-semibold text-slate-800 mt-0.5 whitespace-pre-wrap">
                        {viewingStudent.permanentAddress || 'N/A'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Temporary Address</span>
                        <span className="text-[10px] font-bold text-slate-500">PIN: {viewingStudent.temporaryPinCode || (viewingStudent.permanentPinCode || viewingStudent.pinCode || 'N/A')}</span>
                      </div>
                      <p className="font-semibold text-slate-800 mt-0.5 whitespace-pre-wrap">
                        {viewingStudent.temporaryAddress || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Academic Background
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                      <p className="font-bold text-slate-800 text-xs mt-0.5">
                        {viewingStudent.department?.name || viewingStudent.department?.code || viewingStudent.branch || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Section</span>
                      <p className="font-bold text-purple-700 text-xs mt-0.5">
                        {viewingStudent.section?.name ? `Section ${viewingStudent.section.name}` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Current CGPA</span>
                      <p className="font-black text-emerald-700 text-sm mt-0.5">
                        {viewingStudent.cgpa !== undefined ? viewingStudent.cgpa : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Active Backlogs</span>
                      <p
                        className={`font-black text-sm mt-0.5 ${
                          Number(viewingStudent.backlogs) === 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {viewingStudent.backlogs !== undefined ? viewingStudent.backlogs : 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">10th Percentage</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {viewingStudent.tenthPercentage !== undefined ? `${viewingStudent.tenthPercentage}%` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">12th Percentage</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {viewingStudent.twelfthPercentage !== undefined ? `${viewingStudent.twelfthPercentage}%` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Academic Year</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {viewingStudent.academicYear || viewingStudent.user?.academicYear || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Skills */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Technical Skills</h4>
                  {Array.isArray(viewingStudent.skills) && viewingStudent.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewingStudent.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-50 text-blue-800 font-semibold px-2.5 py-1 rounded-lg text-xs border border-blue-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">N/A</p>
                  )}
                </div>

                {/* Profiles & Links */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Professional & Coding Profiles
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block">LinkedIn</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {viewDetailsData?.profiles?.linkedin || 'N/A'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block">GitHub</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {viewDetailsData?.profiles?.github || 'N/A'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block">LeetCode</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {viewDetailsData?.profiles?.leetcode || 'N/A'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 block">GFG</span>
                      <span className="font-semibold text-slate-700 truncate block">
                        {viewDetailsData?.profiles?.geeksforgeeks || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resume URL & Activity Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-slate-100 bg-white">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Resume Link</span>
                    {viewingStudent.resumeUrl ? (
                      <a
                        href={getAuthorizedResumeUrl(viewingStudent.resumeUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Resume Document</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 font-medium">N/A</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-center justify-around text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Drives Applied</span>
                      <p className="font-black text-slate-800 text-base">
                        {viewDetailsData?.stats?.applications || 0}
                      </p>
                    </div>
                    <div className="border-l border-slate-100 h-8"></div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Mocks Taken</span>
                      <p className="font-black text-slate-800 text-base">
                        {viewDetailsData?.stats?.mockTestsTaken || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT STUDENT */}
      {/* ======================================================== */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Edit Student Record</h3>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editFormError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Enrollment Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.enrollmentNo}
                    onChange={(e) => setEditFormData({ ...editFormData, enrollmentNo: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono font-bold text-slate-800 uppercase focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Student Mobile Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editFormData.studentMobileNumber !== undefined ? editFormData.studentMobileNumber : editFormData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditFormData({ ...editFormData, studentMobileNumber: val, phone: val });
                    }}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editFormData.dateOfBirth}
                    onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Parent Mobile Number</label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={editFormData.parentMobileNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, parentMobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="9123456780"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Permanent Address & Permanent PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Permanent Address</label>
                  <textarea
                    rows={2}
                    value={editFormData.permanentAddress}
                    onChange={(e) => setEditFormData({ ...editFormData, permanentAddress: e.target.value })}
                    placeholder="Village / Town, District, State"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Permanent PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editFormData.permanentPinCode !== undefined ? editFormData.permanentPinCode : editFormData.pinCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setEditFormData({ ...editFormData, permanentPinCode: val, pinCode: val });
                    }}
                    placeholder="212655"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Temporary Address & Temporary PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Temporary Address</label>
                  <textarea
                    rows={2}
                    value={editFormData.temporaryAddress}
                    onChange={(e) => setEditFormData({ ...editFormData, temporaryAddress: e.target.value })}
                    placeholder="Hostel / PG / Current City"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Temporary PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editFormData.temporaryPinCode}
                    onChange={(e) => setEditFormData({ ...editFormData, temporaryPinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="208001"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Department *</label>
                  <select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} {d.code ? `(${d.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Section</label>
                  <select
                    value={editFormData.section}
                    onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {sections.map((sec) => (
                      <option key={sec._id} value={sec._id}>
                        Section {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">CGPA (0-10)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={editFormData.cgpa}
                    onChange={(e) => setEditFormData({ ...editFormData, cgpa: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">10th %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editFormData.tenthPercentage}
                    onChange={(e) => setEditFormData({ ...editFormData, tenthPercentage: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">12th %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editFormData.twelfthPercentage}
                    onChange={(e) => setEditFormData({ ...editFormData, twelfthPercentage: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Backlogs</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.backlogs}
                    onChange={(e) => setEditFormData({ ...editFormData, backlogs: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Account Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={editFormData.academicYear}
                    onChange={(e) => setEditFormData({ ...editFormData, academicYear: e.target.value })}
                    placeholder="e.g. 2026-27"
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Skills (Comma-separated)
                </label>
                <input
                  type="text"
                  value={editFormData.skills}
                  onChange={(e) => setEditFormData({ ...editFormData, skills: e.target.value })}
                  placeholder="Java, React.js, Python, SQL"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition active:scale-95 disabled:opacity-50"
                >
                  {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{savingEdit ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DEACTIVATE / ACTIVATE CONFIRMATION */}
      {/* ======================================================== */}
      {statusTargetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center ${
                  (statusTargetStudent.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {(statusTargetStudent.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? (
                  <UserX className="h-6 w-6" />
                ) : (
                  <UserCheck className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {(statusTargetStudent.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                    ? 'Deactivate Student Account?'
                    : 'Reactivate Student Account?'}
                </h3>
                <p className="text-xs text-slate-500">Student: {statusTargetStudent.user?.name}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100 text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">Student Name:</span>
                <span className="font-bold text-slate-800">{statusTargetStudent.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">Enrollment No:</span>
                <span className="font-mono font-bold text-slate-800">{statusTargetStudent.enrollmentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">Current Status:</span>
                <span className="font-bold text-slate-800">{statusTargetStudent.user?.status || 'ACTIVE'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {(statusTargetStudent.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                ? 'This student will be unable to access CampusPro or apply to new placement drives, but their historical records will be preserved.'
                : 'This student will regain access to CampusPro and be able to view and apply for eligible placement drives.'}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusTargetStudent(null)}
                disabled={togglingStatus}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={togglingStatus}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 ${
                  (statusTargetStudent.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {togglingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {(statusTargetStudent.user?.status || 'ACTIVE').toUpperCase() === 'ACTIVE'
                    ? 'Deactivate'
                    : 'Activate'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DELETE PERMANENTLY (SINGLE) */}
      {/* ======================================================== */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Student Permanently?</h3>
                <p className="text-xs text-rose-600 font-semibold">Irreversible Administrative Action</p>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50/70 p-3.5 border border-rose-200 text-xs space-y-1.5">
              <p className="font-bold text-rose-900">You are about to permanently delete:</p>
              <div className="font-semibold text-rose-800 space-y-0.5">
                <p>• Name: <span className="font-bold">{deletingStudent.user?.name}</span></p>
                <p>• Enrollment: <span className="font-mono font-bold">{deletingStudent.enrollmentNo}</span></p>
                <p>• Email: <span className="font-bold">{deletingStudent.user?.email}</span></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently remove the student's account and associated student-owned records (applications, test results, resumes) from CampusPro. Master data (departments, drives, companies) is safe.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Type <span className="text-red-600 font-mono font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono font-bold focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none uppercase"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                disabled={deletingPermanently}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePermanently}
                disabled={deletingPermanently || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-95"
              >
                {deletingPermanently && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: BULK DELETE CONFIRMATION */}
      {/* ======================================================== */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {selectedStudentIds.length} Selected Students?
                </h3>
                <p className="text-xs text-rose-600 font-semibold">Bulk Permanent Deletion</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              The following student accounts and their student-owned records will be permanently removed from CampusPro. This action cannot be undone.
            </p>

            {/* List of students to delete */}
            <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 divide-y divide-slate-100 text-xs">
              {students
                .filter((s) => selectedStudentIds.includes(s._id))
                .map((s) => (
                  <div key={s._id} className="py-1.5 flex items-center justify-between">
                    <span className="font-bold text-slate-800">{s.user?.name}</span>
                    <span className="font-mono text-[11px] text-slate-500 font-semibold">{s.enrollmentNo}</span>
                  </div>
                ))}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Type <span className="text-red-600 font-mono font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={bulkDeleteConfirmText}
                onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono font-bold focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none uppercase"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={bulkDeleting || bulkDeleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-red-600/20 transition active:scale-95"
              >
                {bulkDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete {selectedStudentIds.length} Students</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStudents;

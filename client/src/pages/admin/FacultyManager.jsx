import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import departmentService from '../../services/departmentService';
import sectionService from '../../services/sectionService';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  UserCheck,
  Plus,
  Trash2,
  Mail,
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  GraduationCap,
  Layers,
  Lock,
  Calendar
} from 'lucide-react';

const FacultyManager = () => {
  const { academicYear, isCurrentYear, isHistorical } = useAcademicYear();

  // Faculty State
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyError, setFacultyError] = useState('');

  // Department State
  const [departmentList, setDepartmentList] = useState([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptFormError, setDeptFormError] = useState('');

  // Section State
  const [sectionList, setSectionList] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(true);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionFormError, setSectionFormError] = useState('');
  const [sectionFormData, setSectionFormData] = useState({
    name: '',
    code: ''
  });

  // Global Toast Messages
  const [globalMessage, setGlobalMessage] = useState(null); // { text, type: 'success' | 'warning' | 'error' }

  // Faculty Form State
  const [facultyFormData, setFacultyFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    employeeId: '',
    designation: 'Department Placement Coordinator',
    phone: ''
  });

  // Department Form State
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  // Fetch Departments (Scoped to selected academic year)
  const fetchDepartments = async (year = academicYear) => {
    try {
      setDepartmentLoading(true);
      const data = await departmentService.getDepartments({ all: true, academicYear: year });
      setDepartmentList(data || []);
      // If faculty form department is not set yet, initialize it with first active department
      const activeDepts = (data || []).filter(d => d.isActive !== false && d.status !== 'inactive');
      if (activeDepts.length > 0) {
        setFacultyFormData(prev => ({
          ...prev,
          department: prev.department && activeDepts.some(d => d._id === prev.department)
            ? prev.department
            : activeDepts[0]._id
        }));
      }
    } catch (err) {
      console.error('[Fetch Departments Error]', err);
      showToast(err.response?.data?.message || 'Unable to load departments. Please try again.', 'error');
    } finally {
      setDepartmentLoading(false);
    }
  };

  // Fetch Sections (Scoped to selected academic year)
  const fetchSections = async (year = academicYear) => {
    try {
      setSectionLoading(true);
      const data = await sectionService.getSections({ all: true, academicYear: year });
      setSectionList(data || []);
    } catch (err) {
      console.error('[Fetch Sections Error]', err);
      showToast(err.response?.data?.message || 'Unable to load sections. Please try again.', 'error');
    } finally {
      setSectionLoading(false);
    }
  };

  // Fetch Faculty List
  const fetchFaculty = async () => {
    try {
      setFacultyLoading(true);
      const res = await API.get('/users/faculty');
      setFacultyList(res.data || []);
    } catch (err) {
      console.error('[Fetch Faculty Error]', err);
      showToast('Failed to load faculty directory', 'error');
    } finally {
      setFacultyLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments(academicYear);
    fetchSections(academicYear);
    fetchFaculty();
  }, [academicYear]);

  const showToast = (text, type = 'success') => {
    setGlobalMessage({ text, type });
    setTimeout(() => {
      setGlobalMessage(null);
    }, 6000);
  };

  // -------------------------
  // Department Handlers
  // -------------------------
  const handleDeptChange = (e) => {
    setDeptFormData({ ...deptFormData, [e.target.name]: e.target.value });
    setDeptFormError('');
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setDeptFormError('');

    if (isHistorical) {
      setDeptFormError(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`);
      return;
    }

    const trimmedName = deptFormData.name.trim();
    if (!trimmedName) {
      setDeptFormError('Department name is required.');
      return;
    }
    if (trimmedName.length < 2) {
      setDeptFormError('Department name must be at least 2 characters long.');
      return;
    }
    if (trimmedName.length > 100) {
      setDeptFormError('Department name cannot exceed 100 characters.');
      return;
    }

    // Client-side duplicate check within current academic year
    const isDuplicate = departmentList.some(
      d => d.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setDeptFormError(`A department with the name "${trimmedName}" already exists for Academic Year ${academicYear}.`);
      return;
    }

    try {
      const res = await departmentService.createDepartment({
        name: trimmedName,
        code: deptFormData.code.trim().toUpperCase(),
        description: deptFormData.description.trim(),
        academicYear
      });

      showToast(res.message || `Department "${trimmedName}" added successfully for ${academicYear}!`, 'success');
      setShowDeptModal(false);
      setDeptFormData({ name: '', code: '', description: '' });
      await fetchDepartments(academicYear);
    } catch (err) {
      setDeptFormError(err.response?.data?.message || 'Failed to create department.');
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (isHistorical) {
      showToast(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`, 'warning');
      return;
    }
    const confirmPrompt = `Are you sure you want to remove the department "${dept.name}" (${academicYear})? If existing students or faculty belong to it, it will be safely deactivated instead of deleted.`;
    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await departmentService.deleteDepartment(dept._id);
      if (res.deactivated) {
        showToast(res.message, 'warning');
      } else {
        showToast(res.message || 'Department deleted successfully.', 'success');
      }
      await fetchDepartments(academicYear);
      await fetchFaculty();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete department', 'error');
    }
  };

  const handleToggleDepartmentStatus = async (dept) => {
    if (isHistorical) {
      showToast(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`, 'warning');
      return;
    }
    const newStatus = !(dept.isActive !== false && dept.status !== 'inactive');
    try {
      await departmentService.updateDepartment(dept._id, {
        isActive: newStatus,
        status: newStatus ? 'active' : 'inactive'
      });
      showToast(`Department "${dept.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
      await fetchDepartments(academicYear);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update department status', 'error');
    }
  };

  // -------------------------
  // Section Handlers
  // -------------------------
  const handleSectionChange = (e) => {
    setSectionFormData({ ...sectionFormData, [e.target.name]: e.target.value });
    setSectionFormError('');
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setSectionFormError('');

    if (isHistorical) {
      setSectionFormError(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`);
      return;
    }

    const trimmedName = sectionFormData.name.trim();
    if (!trimmedName) {
      setSectionFormError('Section name is required.');
      return;
    }
    if (trimmedName.length > 20) {
      setSectionFormError('Section name cannot exceed 20 characters.');
      return;
    }

    // Client-side duplicate check within current academic year
    const isDuplicate = sectionList.some(
      s => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setSectionFormError(`A section with the name "${trimmedName}" already exists for Academic Year ${academicYear}.`);
      return;
    }

    try {
      const res = await sectionService.createSection({
        name: trimmedName,
        code: sectionFormData.code.trim().toUpperCase(),
        academicYear
      });

      showToast(res.message || `Section "${trimmedName}" added successfully for ${academicYear}!`, 'success');
      setShowSectionModal(false);
      setSectionFormData({ name: '', code: '' });
      await fetchSections(academicYear);
    } catch (err) {
      setSectionFormError(err.response?.data?.message || 'Failed to create section.');
    }
  };

  const handleDeleteSection = async (sec) => {
    if (isHistorical) {
      showToast(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`, 'warning');
      return;
    }
    const confirmPrompt = `Are you sure you want to remove the section "${sec.name}" (${academicYear})? If existing students belong to it, it will be safely deactivated instead of deleted.`;
    if (!window.confirm(confirmPrompt)) return;

    try {
      const res = await sectionService.deleteSection(sec._id);
      if (res.deactivated) {
        showToast(res.message, 'warning');
      } else {
        showToast(res.message || 'Section deleted successfully.', 'success');
      }
      await fetchSections(academicYear);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete section', 'error');
    }
  };

  const handleToggleSectionStatus = async (sec) => {
    if (isHistorical) {
      showToast(`Academic Year ${academicYear} is in View-Only mode. Historical academic year data is read-only for Admin.`, 'warning');
      return;
    }
    const newStatus = !(sec.isActive !== false && sec.status !== 'inactive');
    try {
      await sectionService.updateSection(sec._id, {
        isActive: newStatus,
        status: newStatus ? 'active' : 'inactive'
      });
      showToast(`Section "${sec.name}" is now ${newStatus ? 'Active' : 'Inactive'}.`, 'success');
      await fetchSections(academicYear);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update section status', 'error');
    }
  };

  // -------------------------
  // Faculty Handlers
  // -------------------------
  const handleFacultyChange = (e) => {
    setFacultyFormData({ ...facultyFormData, [e.target.name]: e.target.value });
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    setFacultyError('');

    if (!facultyFormData.department) {
      setFacultyError('Please select a valid active department.');
      return;
    }

    try {
      await API.post('/users/faculty', facultyFormData);
      showToast(`Faculty coordinator "${facultyFormData.name}" created successfully!`, 'success');
      setShowFacultyModal(false);
      
      const activeDepts = departmentList.filter(d => d.isActive !== false && d.status !== 'inactive');
      setFacultyFormData({
        name: '',
        email: '',
        password: '',
        department: activeDepts.length > 0 ? activeDepts[0]._id : '',
        employeeId: '',
        designation: 'Department Placement Coordinator',
        phone: ''
      });
      fetchFaculty();
    } catch (err) {
      setFacultyError(err.response?.data?.message || 'Failed to create faculty member');
    }
  };

  const handleDeleteFaculty = async (userId, facultyName) => {
    if (!window.confirm(`Are you sure you want to remove ${facultyName} from faculty coordinators?`)) return;

    try {
      await API.delete(`/users/${userId}`);
      showToast('Faculty coordinator removed successfully', 'success');
      fetchFaculty();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete faculty member', 'error');
    }
  };

  // Filtered Lists
  const filteredFaculty = facultyList.filter((f) => {
    const nameMatch = f.user?.name?.toLowerCase().includes(facultySearch.toLowerCase());
    const emailMatch = f.user?.email?.toLowerCase().includes(facultySearch.toLowerCase());
    const empMatch = f.employeeId?.toLowerCase().includes(facultySearch.toLowerCase());
    const deptMatch = (f.department?.name || f.department?.code || f.department || '')
      .toLowerCase()
      .includes(facultySearch.toLowerCase());
    return nameMatch || emailMatch || empMatch || deptMatch;
  });

  const activeDepartments = departmentList.filter(d => d.isActive !== false && d.status !== 'inactive');
  const activeSections = sectionList.filter(s => s.isActive !== false && s.status !== 'inactive');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Faculty & Department Management</h1>
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              <Calendar className="h-3 w-3 text-blue-600" /> {academicYear}
            </span>
            {isHistorical && (
              <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                <Lock className="h-3 w-3 text-amber-700" /> Historical View (Read-Only)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">Manage academic departments, faculty coordinators, and student sections for Academic Year {academicYear}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
          {!isHistorical ? (
            <>
              <button
                onClick={() => {
                  setDeptFormError('');
                  setShowDeptModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 h-10 px-4 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition whitespace-nowrap"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Department</span>
              </button>

              <button
                onClick={() => {
                  setSectionFormError('');
                  setShowSectionModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 h-10 px-4 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition whitespace-nowrap"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Section</span>
              </button>

              <button
                onClick={() => {
                  setFacultyError('');
                  setShowFacultyModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 h-10 px-4 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition whitespace-nowrap"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Faculty Coordinator</span>
              </button>
            </>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-amber-800 text-xs font-bold">
              <Lock className="h-4 w-4 text-amber-600" />
              <span>Historical Year (View-Only) — Modifications Disabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Alert / Toast Notification */}
      {globalMessage && (
        <div
          className={`p-3 text-xs font-semibold rounded-xl border flex items-center gap-2 ${
            globalMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : globalMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {globalMessage.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          ) : globalMessage.type === 'warning' ? (
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{globalMessage.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: MASTER DEPARTMENT MANAGEMENT */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Department Management ({academicYear})</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {departmentList.length} Total Departments ({activeDepartments.length} Active)
          </span>
        </div>

        {departmentLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading departments for {academicYear}...</div>
        ) : departmentList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isHistorical
              ? `No departments found for Academic Year ${academicYear}.`
              : <>No departments created for Academic Year {academicYear}. Click <strong className="text-blue-600">"+ Add Department"</strong> to create the first department for this year.</>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-4">Department Name</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {departmentList.map((dept) => {
                  const isActive = dept.isActive !== false && dept.status !== 'inactive';
                  return (
                    <tr key={dept._id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 pl-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span>{dept.name}</span>
                        </div>
                        {dept.description && (
                          <p className="text-[11px] text-slate-400 font-normal mt-0.5 ml-6">{dept.description}</p>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {dept.code || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-right space-x-2">
                        {!isHistorical ? (
                          <>
                            <button
                              onClick={() => handleToggleDepartmentStatus(dept)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition inline-flex items-center gap-1 ${
                                isActive
                                  ? 'text-slate-600 hover:bg-slate-100'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={isActive ? 'Deactivate Department' : 'Activate Department'}
                            >
                              {isActive ? (
                                <>
                                  <ToggleRight className="h-4 w-4 text-emerald-600" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 text-slate-400" /> Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteDepartment(dept)}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center gap-1"
                              title="Delete / Deactivate Department"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: MASTER SECTION MANAGEMENT */}
      {/* ======================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Section Management ({academicYear})</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {sectionList.length} Total Sections ({activeSections.length} Active)
          </span>
        </div>

        {sectionLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading sections for {academicYear}...</div>
        ) : sectionList.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isHistorical
              ? `No sections found for Academic Year ${academicYear}.`
              : <>No sections created for Academic Year {academicYear}. Click <strong className="text-indigo-600">"+ Add Section"</strong> to create the first section for this year.</>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-4">Section Name</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sectionList.map((sec) => {
                  const isActive = sec.isActive !== false && sec.status !== 'inactive';
                  return (
                    <tr key={sec._id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 pl-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {sec.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span>{sec.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {sec.code || sec.name}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right pr-4 space-x-1">
                        {!isHistorical ? (
                          <>
                            <button
                              onClick={() => handleToggleSectionStatus(sec)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition inline-flex items-center gap-1 ${
                                isActive
                                  ? 'text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={isActive ? 'Deactivate Section' : 'Activate Section'}
                            >
                              {isActive ? (
                                <>
                                  <ToggleRight className="h-4 w-4 text-emerald-600" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 text-slate-400" /> Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteSection(sec)}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition inline-flex items-center gap-1"
                              title="Delete / Deactivate Section"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400 italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: FACULTY COORDINATORS DIRECTORY */}
      {/* ======================================================== */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={facultySearch}
              onChange={(e) => setFacultySearch(e.target.value)}
              placeholder="Search faculty by coordinator name, email, department, or employee ID..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs font-medium focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Faculty Cards Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Department Faculty Members ({filteredFaculty.length})</h2>
            <span className="text-xs text-slate-400">Total authorized coordinators</span>
          </div>

          {facultyLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading faculty directory...</div>
          ) : filteredFaculty.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No faculty members found matching your search.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredFaculty.map((item) => {
                const deptDisplay = item.department?.name || item.department?.code || item.department || 'N/A';
                return (
                  <div key={item._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm">
                        {item.user?.name?.charAt(0) || 'F'}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{item.user?.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {item.user?.email}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {deptDisplay} ({item.employeeId})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs text-slate-600 font-medium">{item.designation}</span>
                      {item.user?._id && (
                        <button
                          onClick={() => handleDeleteFaculty(item.user._id, item.user.name)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Remove Faculty Coordinator"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD DEPARTMENT MODAL */}
      {/* ======================================================== */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-base text-slate-900">Add New Department ({academicYear})</h2>
              </div>
              <button
                onClick={() => setShowDeptModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {deptFormError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200">
                {deptFormError}
              </div>
            )}

            <form onSubmit={handleCreateDepartment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase">Department Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={deptFormData.name}
                  onChange={handleDeptChange}
                  placeholder="e.g. Artificial Intelligence & Machine Learning"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">Must be unique. Trimming and casing are normalized automatically.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Department Code (Optional)</label>
                <input
                  type="text"
                  name="code"
                  value={deptFormData.code}
                  onChange={handleDeptChange}
                  placeholder="e.g. AI-ML (Auto-generated if empty)"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium uppercase focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Description (Optional)</label>
                <textarea
                  name="description"
                  rows="2"
                  value={deptFormData.description}
                  onChange={handleDeptChange}
                  placeholder="e.g. Department of AI and Modern Machine Learning Systems"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
                >
                  Add Department
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD SECTION MODAL */}
      {/* ======================================================== */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base text-slate-900">Add Academic Section ({academicYear})</h2>
              <button
                onClick={() => setShowSectionModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {sectionFormError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200">
                {sectionFormError}
              </div>
            )}

            <form onSubmit={handleCreateSection} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase">Section Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={sectionFormData.name}
                  onChange={handleSectionChange}
                  placeholder="e.g. P1, P2, S1, A, B"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-indigo-600 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">Unique identifier for class/batch sections (e.g. P1, S2).</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Section Code (Optional)</label>
                <input
                  type="text"
                  name="code"
                  value={sectionFormData.code}
                  onChange={handleSectionChange}
                  placeholder="e.g. P1 (Auto-generated if empty)"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium uppercase focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
                >
                  Add Section
                </button>
                <button
                  type="button"
                  onClick={() => setShowSectionModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD FACULTY COORDINATOR MODAL */}
      {/* ======================================================== */}
      {showFacultyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base text-slate-900">Add Faculty Placement Coordinator</h2>
              <button
                onClick={() => setShowFacultyModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {facultyError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200">
                {facultyError}
              </div>
            )}

            <form onSubmit={handleCreateFaculty} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase">Faculty Full Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={facultyFormData.name}
                  onChange={handleFacultyChange}
                  placeholder="Dr. Ramesh Kumar"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={facultyFormData.email}
                  onChange={handleFacultyChange}
                  placeholder="ramesh@college.edu"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Temporary Password *</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={facultyFormData.password}
                  onChange={handleFacultyChange}
                  placeholder="Min 6 characters"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Department *</label>
                  {departmentLoading ? (
                    <select disabled className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium bg-slate-50 text-slate-400">
                      <option>Loading departments...</option>
                    </select>
                  ) : activeDepartments.length === 0 ? (
                    <select disabled className="mt-1 w-full rounded-xl border border-amber-200 p-2.5 font-medium bg-amber-50 text-amber-800">
                      <option>No departments available. Please add a department first.</option>
                    </select>
                  ) : (
                    <select
                      name="department"
                      required
                      value={facultyFormData.department}
                      onChange={handleFacultyChange}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                    >
                      {activeDepartments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={facultyFormData.employeeId}
                    onChange={handleFacultyChange}
                    placeholder="EMP-CSE-102"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={facultyFormData.designation}
                  onChange={handleFacultyChange}
                  placeholder="Department Placement Coordinator"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Contact Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={facultyFormData.phone}
                  onChange={handleFacultyChange}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={activeDepartments.length === 0}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Create Faculty Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowFacultyModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyManager;

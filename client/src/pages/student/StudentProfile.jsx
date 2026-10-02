import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  UserCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  User,
  BookOpen,
  Link2,
  Globe,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  X,
  FileText,
  UploadCloud,
  Download,
  Code2,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Shield,
  Building2,
  Sparkles,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import API from '../../services/api';
import studentService from '../../services/studentService';

const StudentProfile = () => {
  const { user, profile, updateProfileState } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Editable Form Data
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    studentMobileNumber: '',
    parentMobileNumber: '',
    phone: '',
    permanentAddress: '',
    permanentPinCode: '',
    temporaryAddress: '',
    temporaryPinCode: '',
    cgpa: '',
    tenthPercentage: '',
    twelfthPercentage: '',
    backlogs: '',
    skills: '',
    resumeUrl: '',
    bio: ''
  });

  // Profile Links (GitHub, LinkedIn, LeetCode, GFG, Custom)
  const [profileLinks, setProfileLinks] = useState({
    github: '',
    linkedin: '',
    leetcode: '',
    geeksforgeeks: '',
    custom: []
  });

  // Backup data for Cancel button restoration
  const [backupData, setBackupData] = useState({
    formData: null,
    profileLinks: null
  });

  const [customLinkModal, setCustomLinkModal] = useState({
    isOpen: false,
    editIndex: null,
    label: '',
    url: ''
  });

  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  // Resume document management state
  const [resumeMeta, setResumeMeta] = useState({
    fileName: '',
    fileSize: 0,
    uploadedAt: null,
    resumeUrl: ''
  });
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState('');

  // Today's date in YYYY-MM-DD for max date picker
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to sync state from student & user data objects
  const populateFromData = (studentData, userData) => {
    if (!studentData) return;

    let formattedDob = '';
    if (studentData.dateOfBirth) {
      try {
        formattedDob = new Date(studentData.dateOfBirth).toISOString().split('T')[0];
      } catch (e) {
        formattedDob = '';
      }
    }

    const perm = studentData.permanentAddress || '';
    const temp = studentData.temporaryAddress || '';
    const permPin = studentData.permanentPinCode || studentData.pinCode || '';
    const tempPin = studentData.temporaryPinCode || (studentData.permanentPinCode || studentData.pinCode || '');
    const studentMobile = studentData.studentMobileNumber || studentData.phone || '';
    const currentName = userData?.name || studentData.user?.name || user?.name || '';

    const newFormData = {
      name: currentName,
      dateOfBirth: formattedDob,
      studentMobileNumber: studentMobile,
      parentMobileNumber: studentData.parentMobileNumber || '',
      phone: studentMobile,
      permanentAddress: perm,
      permanentPinCode: permPin,
      temporaryAddress: temp,
      temporaryPinCode: tempPin,
      cgpa: studentData.cgpa !== undefined && studentData.cgpa !== null ? studentData.cgpa : '',
      tenthPercentage: studentData.tenthPercentage !== undefined && studentData.tenthPercentage !== null ? studentData.tenthPercentage : '',
      twelfthPercentage: studentData.twelfthPercentage !== undefined && studentData.twelfthPercentage !== null ? studentData.twelfthPercentage : '',
      backlogs: studentData.backlogs !== undefined && studentData.backlogs !== null ? studentData.backlogs : '',
      skills: Array.isArray(studentData.skills) ? studentData.skills.join(', ') : (studentData.skills || ''),
      resumeUrl: studentData.resumeUrl || '',
      bio: studentData.bio || ''
    };

    const newLinks = {
      github: studentData.profileLinks?.github || '',
      linkedin: studentData.profileLinks?.linkedin || '',
      leetcode: studentData.profileLinks?.leetcode || '',
      geeksforgeeks: studentData.profileLinks?.geeksforgeeks || '',
      custom: Array.isArray(studentData.profileLinks?.custom) ? studentData.profileLinks.custom : []
    };

    setFormData(newFormData);
    setProfileLinks(newLinks);
    setBackupData({
      formData: { ...newFormData },
      profileLinks: { ...newLinks, custom: [...newLinks.custom] }
    });

    if (perm && temp && perm === temp && permPin && tempPin && permPin === tempPin) {
      setSameAsPermanent(true);
    } else {
      setSameAsPermanent(false);
    }

    setResumeMeta({
      fileName: studentData.resumeFileName || (studentData.resumeUrl ? 'Uploaded_Resume.pdf' : ''),
      fileSize: studentData.resumeFileSize || 0,
      uploadedAt: studentData.resumeUploadedAt || null,
      resumeUrl: studentData.resumeUrl || ''
    });
  };

  // Fetch full student profile from backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchFullProfile = async () => {
      setLoading(true);
      try {
        const data = await studentService.getProfile();
        if (!isMounted) return;

        if (data.student) {
          updateProfileState(data.student, data.student.user || data.user);
          populateFromData(data.student, data.student.user || data.user);
        }
      } catch (err) {
        console.error('Error fetching student profile:', err);
        // Fallback to AuthContext profile if available
        if (profile) {
          populateFromData(profile, user);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // When AuthContext profile updates (e.g. from background sync) and not editing, sync data
  useEffect(() => {
    if (profile && !isEditing && !loading) {
      populateFromData(profile, user);
    }
  }, [profile, user]);

  // Handle resume file upload
  const handleResumeFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setResumeError('');
    setError('');
    setMessage('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc'].includes(ext)) {
      setResumeError('Invalid file format. Supported formats: PDF, Word (.docx, .doc).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResumeError('File size exceeds 10 MB maximum limit.');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('resume', file);

    setUploadingResume(true);
    try {
      const data = await studentService.uploadResume(uploadData);
      if (data.success && data.resume) {
        setResumeMeta({
          fileName: data.resume.resumeFileName,
          fileSize: data.resume.resumeFileSize,
          uploadedAt: data.resume.resumeUploadedAt,
          resumeUrl: data.resume.resumeUrl
        });
        setFormData(prev => ({ ...prev, resumeUrl: data.resume.resumeUrl }));
        setMessage('Resume document uploaded successfully!');
      }
    } catch (err) {
      setResumeError(err.response?.data?.message || 'Failed to upload resume file.');
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  // Handle resume file deletion
  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your uploaded resume?')) return;
    try {
      await studentService.deleteResume();
      setResumeMeta({ fileName: '', fileSize: 0, uploadedAt: null, resumeUrl: '' });
      setFormData(prev => ({ ...prev, resumeUrl: '' }));
      setMessage('Resume document removed successfully.');
    } catch (err) {
      setResumeError(err.response?.data?.message || 'Failed to delete resume.');
    }
  };

  const getAuthorizedFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const token = localStorage.getItem('campuspro_token');
    const sep = url.includes('?') ? '&' : '?';
    return token ? `${url}${sep}token=${token}` : url;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'permanentAddress') {
      setFormData(prev => ({
        ...prev,
        permanentAddress: value,
        temporaryAddress: sameAsPermanent ? value : prev.temporaryAddress
      }));
    } else if (name === 'permanentPinCode') {
      const numericVal = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({
        ...prev,
        permanentPinCode: numericVal,
        temporaryPinCode: sameAsPermanent ? numericVal : prev.temporaryPinCode
      }));
    } else if (name === 'temporaryPinCode') {
      const numericVal = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({ ...prev, temporaryPinCode: numericVal }));
    } else if (name === 'studentMobileNumber' || name === 'phone' || name === 'parentMobileNumber') {
      const numericVal = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: numericVal,
        ...(name === 'studentMobileNumber' ? { phone: numericVal } : {})
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLinkChange = (field, value) => {
    setProfileLinks(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpenAddCustomLink = () => {
    setCustomLinkModal({
      isOpen: true,
      editIndex: null,
      label: '',
      url: ''
    });
  };

  const handleOpenEditCustomLink = (index) => {
    const item = profileLinks.custom[index];
    if (!item) return;
    setCustomLinkModal({
      isOpen: true,
      editIndex: index,
      label: item.label || '',
      url: item.url || ''
    });
  };

  const handleSaveCustomLink = (e) => {
    e.preventDefault();
    const cleanLabel = customLinkModal.label.trim();
    let cleanUrl = customLinkModal.url.trim();

    if (!cleanLabel) {
      alert('Please enter a link label (e.g. Portfolio, HackerRank, Twitter).');
      return;
    }
    if (!cleanUrl) {
      alert('Please enter a link URL.');
      return;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    if (!validateUrl(cleanUrl)) {
      alert('Please enter a valid URL.');
      return;
    }

    const updatedCustom = [...(profileLinks.custom || [])];
    if (customLinkModal.editIndex !== null) {
      updatedCustom[customLinkModal.editIndex] = { label: cleanLabel, url: cleanUrl };
    } else {
      updatedCustom.push({ label: cleanLabel, url: cleanUrl });
    }

    setProfileLinks(prev => ({ ...prev, custom: updatedCustom }));
    setCustomLinkModal({ isOpen: false, editIndex: null, label: '', url: '' });
  };

  const handleDeleteCustomLink = (index) => {
    if (!window.confirm('Are you sure you want to remove this link?')) return;
    const updatedCustom = profileLinks.custom.filter((_, i) => i !== index);
    setProfileLinks(prev => ({ ...prev, custom: updatedCustom }));
  };

  const validateUrl = (urlStr) => {
    if (!urlStr || !urlStr.trim()) return true;
    try {
      const formatted = urlStr.trim().startsWith('http://') || urlStr.trim().startsWith('https://')
        ? urlStr.trim()
        : `https://${urlStr.trim()}`;
      const parsed = new URL(formatted);
      return Boolean(parsed.hostname);
    } catch (e) {
      return false;
    }
  };

  const handleSameAsPermanentToggle = (e) => {
    const checked = e.target.checked;
    setSameAsPermanent(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        temporaryAddress: prev.permanentAddress,
        temporaryPinCode: prev.permanentPinCode
      }));
    }
  };

  // Start Editing Handler
  const handleStartEditing = () => {
    setMessage('');
    setError('');
    setBackupData({
      formData: { ...formData },
      profileLinks: { ...profileLinks, custom: [...(profileLinks.custom || [])] }
    });
    setIsEditing(true);
  };

  // Cancel Editing Handler (Restores previous values)
  const handleCancelEditing = () => {
    if (backupData.formData) {
      setFormData({ ...backupData.formData });
    }
    if (backupData.profileLinks) {
      setProfileLinks({
        ...backupData.profileLinks,
        custom: [...(backupData.profileLinks.custom || [])]
      });
    }
    setError('');
    setIsEditing(false);
  };

  // Submit profile update to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    // Validations
    if (formData.name && formData.name.trim().length < 2) {
      setError('Full Name must be at least 2 characters long.');
      setSaving(false);
      return;
    }

    if (formData.studentMobileNumber) {
      const cleanMobile = String(formData.studentMobileNumber).trim();
      if (!/^\d{10}$/.test(cleanMobile)) {
        setError('Student Mobile Number must be exactly 10 numeric digits.');
        setSaving(false);
        return;
      }
    }

    if (formData.parentMobileNumber) {
      const cleanMobile = String(formData.parentMobileNumber).trim();
      if (!/^\d{10}$/.test(cleanMobile)) {
        setError('Parent Mobile Number must be exactly 10 numeric digits.');
        setSaving(false);
        return;
      }
    }

    if (formData.permanentPinCode) {
      const cleanPin = String(formData.permanentPinCode).trim();
      if (!/^\d{6}$/.test(cleanPin)) {
        setError('Permanent PIN Code must be exactly 6 numeric digits.');
        setSaving(false);
        return;
      }
    }

    const tempPinCheck = sameAsPermanent ? formData.permanentPinCode : formData.temporaryPinCode;
    if (tempPinCheck) {
      const cleanPin = String(tempPinCheck).trim();
      if (!/^\d{6}$/.test(cleanPin)) {
        setError('Temporary PIN Code must be exactly 6 numeric digits.');
        setSaving(false);
        return;
      }
    }

    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        setError('Date of Birth cannot be in the future.');
        setSaving(false);
        return;
      }
    }

    if (formData.cgpa !== '' && formData.cgpa !== null && formData.cgpa !== undefined) {
      const numCgpa = parseFloat(formData.cgpa);
      if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
        setError('Current CGPA must be a valid number between 0 and 10.');
        setSaving(false);
        return;
      }
    }

    if (formData.tenthPercentage !== '' && formData.tenthPercentage !== null && formData.tenthPercentage !== undefined) {
      const num10 = parseFloat(formData.tenthPercentage);
      if (isNaN(num10) || num10 < 0 || num10 > 100) {
        setError('10th Percentage must be a valid number between 0 and 100.');
        setSaving(false);
        return;
      }
    }

    if (formData.twelfthPercentage !== '' && formData.twelfthPercentage !== null && formData.twelfthPercentage !== undefined) {
      const num12 = parseFloat(formData.twelfthPercentage);
      if (isNaN(num12) || num12 < 0 || num12 > 100) {
        setError('12th Percentage must be a valid number between 0 and 100.');
        setSaving(false);
        return;
      }
    }

    if (formData.backlogs !== '' && formData.backlogs !== null && formData.backlogs !== undefined) {
      const numBacklogs = parseInt(formData.backlogs, 10);
      if (isNaN(numBacklogs) || numBacklogs < 0) {
        setError('Active Backlogs must be a non-negative integer.');
        setSaving(false);
        return;
      }
    }

    // Profile links validations
    if (profileLinks.github && !validateUrl(profileLinks.github)) {
      setError('Please provide a valid GitHub profile URL.');
      setSaving(false);
      return;
    }
    if (profileLinks.linkedin && !validateUrl(profileLinks.linkedin)) {
      setError('Please provide a valid LinkedIn profile URL.');
      setSaving(false);
      return;
    }
    if (profileLinks.leetcode && !validateUrl(profileLinks.leetcode)) {
      setError('Please provide a valid LeetCode profile URL.');
      setSaving(false);
      return;
    }
    if (profileLinks.geeksforgeeks && !validateUrl(profileLinks.geeksforgeeks)) {
      setError('Please provide a valid GeeksforGeeks profile URL.');
      setSaving(false);
      return;
    }

    try {
      const submitData = {
        name: formData.name ? formData.name.trim() : undefined,
        cgpa: formData.cgpa === '' ? null : formData.cgpa,
        tenthPercentage: formData.tenthPercentage === '' ? null : formData.tenthPercentage,
        twelfthPercentage: formData.twelfthPercentage === '' ? null : formData.twelfthPercentage,
        backlogs: formData.backlogs === '' ? 0 : formData.backlogs,
        skills: formData.skills,
        dateOfBirth: formData.dateOfBirth || null,
        studentMobileNumber: formData.studentMobileNumber || '',
        parentMobileNumber: formData.parentMobileNumber || '',
        permanentAddress: formData.permanentAddress || '',
        permanentPinCode: formData.permanentPinCode || '',
        temporaryAddress: sameAsPermanent ? (formData.permanentAddress || '') : (formData.temporaryAddress || ''),
        temporaryPinCode: sameAsPermanent ? (formData.permanentPinCode || '') : (formData.temporaryPinCode || ''),
        resumeUrl: formData.resumeUrl || '',
        bio: formData.bio || '',
        profileLinks
      };

      const data = await studentService.updateProfile(submitData);
      if (data.student) {
        updateProfileState(data.student, data.user || data.student.user);
        populateFromData(data.student, data.user || data.student.user);
      }
      setIsEditing(false);
      setMessage('Profile updated successfully! Professional links synced to your Resume and Placement Profile.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile. Please verify your inputs.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-3">
        <div className="h-9 w-9 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Student Profile...</p>
      </div>
    );
  }

  // Display values
  const displayName = formData.name || user?.name || profile?.user?.name || 'Student';
  const displayEmail = user?.email || profile?.user?.email || 'N/A';
  const enrollmentNo = profile?.enrollmentNo || 'N/A';
  const departmentName = profile?.department?.name || profile?.department?.code || profile?.branch || 'N/A';
  const sectionName = profile?.section?.name ? `Section ${profile.section.name}` : (profile?.section?.code || 'N/A');
  const academicYear = profile?.academicYear || user?.academicYear || 'N/A';
  const branchName = profile?.branch || profile?.department?.name || 'N/A';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-blue-500/20 uppercase">
            {displayName.charAt(0) || 'S'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{displayName}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200 flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> STUDENT
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                ACTIVE
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" /> {displayEmail}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-slate-700">
                <Shield className="h-3.5 w-3.5 text-slate-400" /> {enrollmentNo}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> AY: {academicYear}
              </span>
            </div>
          </div>
        </div>

        {/* Header Action: Edit / Cancel Button */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEditing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Edit2 className="h-4 w-4" /> Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-800 border border-rose-200 flex items-center gap-2 shadow-xs">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Editing Mode Banner */}
      {isEditing && (
        <div className="rounded-2xl bg-blue-50 p-4 text-xs font-bold text-blue-900 border border-blue-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Editing Profile Mode active. Modify your allowed details and click Save Changes when finished.</span>
          </div>
          <button
            type="button"
            onClick={handleCancelEditing}
            className="text-xs text-blue-700 hover:text-blue-900 underline font-bold"
          >
            Discard
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ==================================================== */}
        {/* CARD 1: INSTITUTIONAL & ACADEMIC REPUTATION (LOCKED) */}
        {/* ==================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <h2 className="font-extrabold text-slate-800 uppercase text-xs tracking-wider">
                Institutional Records (Admin-Controlled)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Shield className="h-3 w-3" /> Read Only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">Enrollment Number</span>
              <p className="font-black text-slate-800 text-sm mt-1">{enrollmentNo}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">Department / Branch</span>
              <p className="font-black text-slate-800 text-sm mt-1">{departmentName}</p>
              <p className="text-[10px] text-slate-500 font-medium">{branchName}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">Class Section</span>
              <p className="font-black text-purple-700 text-sm mt-1">{sectionName}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">Academic Year</span>
              <p className="font-black text-slate-800 text-sm mt-1">{academicYear}</p>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 2: PERSONAL & CONTACT INFORMATION */}
        {/* ==================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <h2 className="font-extrabold text-slate-800 uppercase text-xs tracking-wider">
                Personal & Contact Details
              </h2>
            </div>
            {isEditing && (
              <span className="text-[11px] text-blue-600 font-bold">
                Student & Parent Mobile must be 10 digits
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-bold text-slate-800">
                  {displayName}
                </div>
              )}
            </div>

            {/* Email Address (Account bound) */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1 flex items-center justify-between">
                <span>College Email</span>
                <span className="text-[9px] text-slate-400 lowercase font-medium">account bound</span>
              </label>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-medium text-slate-600 flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{displayEmail}</span>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  name="dateOfBirth"
                  max={todayStr}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-semibold text-slate-800">
                  {formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString() : 'Not Provided'}
                </div>
              )}
            </div>

            {/* Student Mobile Number */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">Student Mobile Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="studentMobileNumber"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="10 numeric digits"
                  value={formData.studentMobileNumber}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{formData.studentMobileNumber || 'Not Provided'}</span>
                </div>
              )}
            </div>

            {/* Parent Mobile Number */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">Parent Mobile Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="parentMobileNumber"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="10 numeric digits"
                  value={formData.parentMobileNumber}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-semibold text-slate-800 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{formData.parentMobileNumber || 'Not Provided'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 3: ACADEMIC METRICS & PLACEMENT CRITERIA */}
        {/* ==================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-600" />
              <h2 className="font-extrabold text-slate-800 uppercase text-xs tracking-wider">
                Academic & Placement Scores
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Used by Company Eligibility Engine
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {/* CGPA */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">Current CGPA (0-10)</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="e.g. 8.5"
                  value={formData.cgpa}
                  onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-black text-slate-800 focus:outline-none focus:border-blue-600 text-sm"
                />
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">CGPA</span>
                  <p className="text-xl font-black text-emerald-900 mt-0.5">
                    {formData.cgpa !== '' && formData.cgpa !== null ? formData.cgpa : 'N/A'}
                  </p>
                </div>
              )}
            </div>

            {/* 10th Percentage */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">10th Class (%)</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 85.00"
                  value={formData.tenthPercentage}
                  onChange={(e) => setFormData({ ...formData, tenthPercentage: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-black text-slate-800 focus:outline-none focus:border-blue-600 text-sm"
                />
              ) : (
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">10th Class</span>
                  <p className="text-xl font-black text-blue-900 mt-0.5">
                    {formData.tenthPercentage !== '' && formData.tenthPercentage !== null ? `${formData.tenthPercentage}%` : 'N/A'}
                  </p>
                </div>
              )}
            </div>

            {/* 12th Percentage */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">12th Class (%)</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 82.00"
                  value={formData.twelfthPercentage}
                  onChange={(e) => setFormData({ ...formData, twelfthPercentage: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-black text-slate-800 focus:outline-none focus:border-blue-600 text-sm"
                />
              ) : (
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 block">12th Class</span>
                  <p className="text-xl font-black text-indigo-900 mt-0.5">
                    {formData.twelfthPercentage !== '' && formData.twelfthPercentage !== null ? `${formData.twelfthPercentage}%` : 'N/A'}
                  </p>
                </div>
              )}
            </div>

            {/* Active Backlogs */}
            <div>
              <label className="font-bold text-slate-700 uppercase block mb-1">Active Backlogs</label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.backlogs}
                  onChange={(e) => setFormData({ ...formData, backlogs: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-black text-slate-800 focus:outline-none focus:border-blue-600 text-sm"
                />
              ) : (
                <div className={`p-3.5 rounded-2xl border ${Number(formData.backlogs) > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50/60 border-slate-100'}`}>
                  <span className={`text-[10px] uppercase font-bold block ${Number(formData.backlogs) > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    Active Backlogs
                  </span>
                  <p className={`text-xl font-black mt-0.5 ${Number(formData.backlogs) > 0 ? 'text-amber-900' : 'text-slate-800'}`}>
                    {formData.backlogs !== '' && formData.backlogs !== null ? formData.backlogs : '0'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Technical Skills */}
          <div className="pt-2">
            <label className="font-bold text-slate-700 uppercase block mb-1">Technical Skills</label>
            {isEditing ? (
              <input
                type="text"
                placeholder="e.g. Java, Python, React, Node.js, SQL, Data Structures"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-blue-600 text-xs"
              />
            ) : (
              <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 min-h-[46px] items-center">
                {formData.skills ? (
                  formData.skills.split(',').map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[11px] shadow-2xs"
                    >
                      {skill.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 text-xs italic">No technical skills added yet.</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 4: RESIDENTIAL ADDRESSES */}
        {/* ==================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-600" />
              <h2 className="font-extrabold text-slate-800 uppercase text-xs tracking-wider">
                Residential Addresses
              </h2>
            </div>
            {isEditing && (
              <span className="text-[11px] text-slate-500 font-medium">
                PIN code must be 6 numeric digits
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Permanent Address */}
            <div className="space-y-3">
              <span className="font-bold text-slate-700 uppercase block">Permanent Address</span>
              {isEditing ? (
                <>
                  <textarea
                    rows={2}
                    name="permanentAddress"
                    placeholder="Village / Town, District, State, Country"
                    value={formData.permanentAddress}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    name="permanentPinCode"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="Permanent PIN (6 digits)"
                    value={formData.permanentPinCode}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 min-h-[90px] flex flex-col justify-between">
                  <p className="font-medium text-slate-800 text-xs">
                    {formData.permanentAddress || 'No permanent address recorded.'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 mt-2">
                    PIN: {formData.permanentPinCode || 'N/A'}
                  </p>
                </div>
              )}
            </div>

            {/* Temporary Address */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase block">Temporary / Current Address</span>
                {isEditing && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 font-bold select-none">
                    <input
                      type="checkbox"
                      checked={sameAsPermanent}
                      onChange={handleSameAsPermanentToggle}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    Same as permanent
                  </label>
                )}
              </div>
              {isEditing ? (
                <>
                  <textarea
                    rows={2}
                    name="temporaryAddress"
                    disabled={sameAsPermanent}
                    readOnly={sameAsPermanent}
                    placeholder="Hostel, PG, or Current City Address"
                    value={formData.temporaryAddress}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <input
                    type="text"
                    name="temporaryPinCode"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    disabled={sameAsPermanent}
                    readOnly={sameAsPermanent}
                    placeholder="Temporary PIN (6 digits)"
                    value={formData.temporaryPinCode}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 min-h-[90px] flex flex-col justify-between">
                  <p className="font-medium text-slate-800 text-xs">
                    {formData.temporaryAddress || 'No temporary address recorded.'}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 mt-2">
                    PIN: {formData.temporaryPinCode || 'N/A'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CARD 5: PROFESSIONAL LINKS & CODING PROFILES */}
        {/* ==================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-600" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-slate-800 uppercase text-xs tracking-wider">
                    Professional Links & Coding Profiles
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-wider border border-blue-200">
                    Single Source of Truth
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Automatically synced to Resume Builder and Student Placement Directory.
                </p>
              </div>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={handleOpenAddCustomLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition shadow-2xs self-start"
              >
                <Plus className="h-3.5 w-3.5" /> Add Custom Link
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* GitHub */}
            <div>
              <label className="font-bold text-slate-700 uppercase flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-500" /> GitHub URL
                </span>
                {profileLinks.github && validateUrl(profileLinks.github) && (
                  <a
                    href={profileLinks.github.startsWith('http') ? profileLinks.github : `https://${profileLinks.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline normal-case font-semibold text-[11px] inline-flex items-center gap-1"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </label>
              {isEditing ? (
                <input
                  type="url"
                  placeholder="https://github.com/your-username"
                  value={profileLinks.github}
                  onChange={(e) => handleLinkChange('github', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 truncate text-slate-700 font-semibold">
                  {profileLinks.github || <span className="text-slate-400 font-normal">Not provided</span>}
                </div>
              )}
            </div>

            {/* LinkedIn */}
            <div>
              <label className="font-bold text-slate-700 uppercase flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-500" /> LinkedIn URL
                </span>
                {profileLinks.linkedin && validateUrl(profileLinks.linkedin) && (
                  <a
                    href={profileLinks.linkedin.startsWith('http') ? profileLinks.linkedin : `https://${profileLinks.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline normal-case font-semibold text-[11px] inline-flex items-center gap-1"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </label>
              {isEditing ? (
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/your-profile"
                  value={profileLinks.linkedin}
                  onChange={(e) => handleLinkChange('linkedin', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 truncate text-slate-700 font-semibold">
                  {profileLinks.linkedin || <span className="text-slate-400 font-normal">Not provided</span>}
                </div>
              )}
            </div>

            {/* LeetCode */}
            <div>
              <label className="font-bold text-slate-700 uppercase flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-slate-500" /> LeetCode URL
                </span>
                {profileLinks.leetcode && validateUrl(profileLinks.leetcode) && (
                  <a
                    href={profileLinks.leetcode.startsWith('http') ? profileLinks.leetcode : `https://${profileLinks.leetcode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline normal-case font-semibold text-[11px] inline-flex items-center gap-1"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </label>
              {isEditing ? (
                <input
                  type="url"
                  placeholder="https://leetcode.com/u/your-handle"
                  value={profileLinks.leetcode}
                  onChange={(e) => handleLinkChange('leetcode', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 truncate text-slate-700 font-semibold">
                  {profileLinks.leetcode || <span className="text-slate-400 font-normal">Not provided</span>}
                </div>
              )}
            </div>

            {/* GeeksforGeeks */}
            <div>
              <label className="font-bold text-slate-700 uppercase flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-slate-500" /> GeeksforGeeks URL
                </span>
                {profileLinks.geeksforgeeks && validateUrl(profileLinks.geeksforgeeks) && (
                  <a
                    href={profileLinks.geeksforgeeks.startsWith('http') ? profileLinks.geeksforgeeks : `https://${profileLinks.geeksforgeeks}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline normal-case font-semibold text-[11px] inline-flex items-center gap-1"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </label>
              {isEditing ? (
                <input
                  type="url"
                  placeholder="https://geeksforgeeks.org/user/your-handle"
                  value={profileLinks.geeksforgeeks}
                  onChange={(e) => handleLinkChange('geeksforgeeks', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 truncate text-slate-700 font-semibold">
                  {profileLinks.geeksforgeeks || <span className="text-slate-400 font-normal">Not provided</span>}
                </div>
              )}
            </div>
          </div>

          {/* Custom Links Display / Edit */}
          {profileLinks.custom && profileLinks.custom.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-700 uppercase text-[11px] block">
                Custom Portfolio & Platform Links
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {profileLinks.custom.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 transition shadow-2xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-slate-800 text-xs truncate block">{c.label}</span>
                      <a
                        href={c.url?.startsWith('http') ? c.url : `https://${c.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline truncate block text-[11px] font-medium mt-0.5"
                      >
                        {c.url}
                      </a>
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCustomLink(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit link"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomLink(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* CARD 6: OFFICIAL RESUME & CAREER ASSETS */}
        {/* ==================================================== */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <h2 className="font-extrabold text-slate-800 uppercase text-xs tracking-wider">
                  Official Placement Resume & Career Bio
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Submitted with placement applications. Build an ATS-friendly resume or upload a PDF/Word file.
                </p>
              </div>
            </div>
            <Link
              to="/student/resume-builder"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition shadow-2xs self-start"
            >
              <Sparkles className="h-3.5 w-3.5" /> Resume Builder <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {resumeError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {resumeError}
            </div>
          )}

          {/* Current Attached Resume Card */}
          {(resumeMeta.resumeUrl || formData.resumeUrl) ? (
            <div className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-blue-200 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-blue-100/60 text-blue-700 flex-shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {resumeMeta.fileName || 'Official_Placement_Resume.pdf'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {resumeMeta.fileSize > 0 ? `${(resumeMeta.fileSize / 1024).toFixed(1)} KB • ` : ''}
                    {resumeMeta.uploadedAt ? `Uploaded on ${new Date(resumeMeta.uploadedAt).toLocaleDateString()}` : 'Linked Document'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={getAuthorizedFileUrl(resumeMeta.resumeUrl || formData.resumeUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> View
                </a>
                <button
                  type="button"
                  onClick={handleDeleteResume}
                  className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                  title="Remove Resume"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-xs font-bold text-slate-600">No official resume document uploaded yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Upload your PDF/DOC resume below to apply for upcoming placement drives.</p>
            </div>
          )}

          {/* Upload Button */}
          <div className="pt-1">
            <label className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-blue-200 bg-white hover:bg-blue-50/50 cursor-pointer transition text-xs font-bold text-blue-700">
              <UploadCloud className="h-4 w-4" />
              {uploadingResume ? 'Uploading resume to secure storage...' : ((resumeMeta.resumeUrl || formData.resumeUrl) ? 'Replace Resume (Choose File)' : 'Upload Resume Document (PDF / DOC / DOCX - Max 10MB)')}
              <input
                type="file"
                accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={handleResumeFileUpload}
                disabled={uploadingResume}
                className="hidden"
              />
            </label>
          </div>

          {/* External Resume Link Input */}
          <div className="pt-2 text-xs">
            <label className="font-bold text-slate-700 uppercase block mb-1">
              External Resume Link (Google Drive / Portfolio URL)
            </label>
            {isEditing ? (
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={formData.resumeUrl}
                onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              />
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 truncate text-slate-700 font-medium">
                {formData.resumeUrl ? (
                  <a
                    href={formData.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    {formData.resumeUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-slate-400">No external link provided</span>
                )}
              </div>
            )}
          </div>

          {/* Career Bio */}
          <div className="pt-2 text-xs">
            <label className="font-bold text-slate-700 uppercase block mb-1">
              Profile Summary / Bio
            </label>
            {isEditing ? (
              <textarea
                rows={3}
                placeholder="Brief summary of your academic background, passions, and career objectives..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              />
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                {formData.bio || <span className="text-slate-400 italic">No summary provided yet.</span>}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Save & Cancel Bar in Edit Mode */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        )}
      </form>

      {/* Custom Link Add/Edit Modal */}
      {customLinkModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                {customLinkModal.editIndex !== null ? 'Edit Custom Link' : 'Add Custom Link'}
              </h3>
              <button
                type="button"
                onClick={() => setCustomLinkModal({ isOpen: false, editIndex: null, label: '', url: '' })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomLink} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Platform or Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Portfolio, HackerRank, CodeChef, Blog"
                  value={customLinkModal.label}
                  onChange={(e) => setCustomLinkModal(prev => ({ ...prev, label: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={customLinkModal.url}
                  onChange={(e) => setCustomLinkModal(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCustomLinkModal({ isOpen: false, editIndex: null, label: '', url: '' })}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm cursor-pointer"
                >
                  {customLinkModal.editIndex !== null ? 'Update Link' : 'Add Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;

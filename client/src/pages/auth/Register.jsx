import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import departmentService from '../../services/departmentService';
import sectionService from '../../services/sectionService';
import { GraduationCap, ShieldCheck, ArrowRight, User, BookOpen } from 'lucide-react';

export const getAcademicFieldError = (name, value, isRequiredCheck = false) => {
  if (value === '' || value === null || value === undefined) {
    if (isRequiredCheck) {
      if (name === 'cgpa') return 'Current CGPA is required.';
      if (name === 'tenthPercentage') return '10th Percentage is required.';
      if (name === 'twelfthPercentage') return '12th Percentage is required.';
      if (name === 'backlogs') return 'Active backlogs is required.';
    }
    return '';
  }

  const strVal = String(value).trim();
  if (strVal === '') {
    if (isRequiredCheck) {
      if (name === 'cgpa') return 'Current CGPA is required.';
      if (name === 'tenthPercentage') return '10th Percentage is required.';
      if (name === 'twelfthPercentage') return '12th Percentage is required.';
      if (name === 'backlogs') return 'Active backlogs is required.';
    }
    return '';
  }

  if (name === 'cgpa') {
    const num = Number(strVal);
    if (isNaN(num) || num < 0 || num > 10) {
      return 'CGPA must be between 0 and 10.';
    }
    return '';
  }

  if (name === 'tenthPercentage') {
    const num = Number(strVal);
    if (isNaN(num) || num < 1 || num > 100) {
      return '10th percentage must be between 1 and 100.';
    }
    return '';
  }

  if (name === 'twelfthPercentage') {
    const num = Number(strVal);
    if (isNaN(num) || num < 1 || num > 100) {
      return '12th percentage must be between 1 and 100.';
    }
    return '';
  }

  if (name === 'backlogs') {
    const num = Number(strVal);
    if (isNaN(num) || strVal.includes('.') || !Number.isInteger(num) || num < 0 || num > 20) {
      return 'Active backlogs must be an integer between 0 and 20.';
    }
    return '';
  }

  return '';
};

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    studentMobileNumber: '',
    parentMobileNumber: '',
    permanentAddress: '',
    permanentPinCode: '',
    temporaryAddress: '',
    temporaryPinCode: '',
    enrollmentNo: '',
    department: '',
    section: '',
    branch: '',
    year: 4,
    cgpa: '',
    tenthPercentage: '',
    twelfthPercentage: '',
    backlogs: ''
  });

  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptError, setDeptError] = useState('');

  const [sections, setSections] = useState([]);
  const [sectionLoading, setSectionLoading] = useState(true);
  const [sectionError, setSectionError] = useState('');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Calculate today's date in YYYY-MM-DD for max date picker
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setDeptLoading(true);
        setDeptError('');
        const data = await departmentService.getActiveDepartments();
        const activeList = Array.isArray(data) ? data : [];
        setDepartments(activeList);
        if (activeList.length > 0) {
          setFormData(prev => ({
            ...prev,
            department: prev.department && activeList.some(d => d._id === prev.department)
              ? prev.department
              : activeList[0]._id,
            branch: prev.branch || activeList[0].name
          }));
        }
      } catch (err) {
        console.error('[Register: Failed to load departments]', err);
        setDeptError('Unable to load departments. Please try again.');
      } finally {
        setDeptLoading(false);
      }
    };

    const loadSections = async () => {
      try {
        setSectionLoading(true);
        setSectionError('');
        const data = await sectionService.getActiveSections();
        const activeList = Array.isArray(data) ? data : [];
        setSections(activeList);
        if (activeList.length > 0) {
          setFormData(prev => ({
            ...prev,
            section: prev.section && activeList.some(s => s._id === prev.section)
              ? prev.section
              : activeList[0]._id
          }));
        }
      } catch (err) {
        console.error('[Register: Failed to load sections]', err);
        setSectionError('Unable to load sections. Please try again.');
      } finally {
        setSectionLoading(false);
      }
    };

    loadDepartments();
    loadSections();
  }, []);

  const handleAcademicChange = (e) => {
    const { name, value, validity } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    let err = '';
    if (validity && validity.badInput) {
      if (name === 'cgpa') err = 'CGPA must be between 0 and 10.';
      else if (name === 'tenthPercentage') err = '10th percentage must be between 1 and 100.';
      else if (name === 'twelfthPercentage') err = '12th percentage must be between 1 and 100.';
      else if (name === 'backlogs') err = 'Active backlogs must be an integer between 0 and 20.';
    } else {
      err = getAcademicFieldError(name, value, value === '');
    }

    setFieldErrors(prev => {
      const next = { ...prev };
      if (err) {
        next[name] = err;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const handleAcademicPaste = (e) => {
    const { name } = e.target;
    const pastedVal = e.clipboardData ? e.clipboardData.getData('text') : '';
    if (pastedVal !== '') {
      const err = getAcademicFieldError(name, pastedVal, true);
      if (err) {
        setFieldErrors(prev => ({ ...prev, [name]: err }));
      }
    }
  };

  const handleAcademicBlur = (e) => {
    const { name, value, validity } = e.target;
    let err = '';
    if (validity && validity.badInput) {
      if (name === 'cgpa') err = 'CGPA must be between 0 and 10.';
      else if (name === 'tenthPercentage') err = '10th percentage must be between 1 and 100.';
      else if (name === 'twelfthPercentage') err = '12th percentage must be between 1 and 100.';
      else if (name === 'backlogs') err = 'Active backlogs must be an integer between 0 and 20.';
    } else {
      err = getAcademicFieldError(name, value, true);
    }

    setFieldErrors(prev => {
      const next = { ...prev };
      if (err) {
        next[name] = err;
      } else {
        delete next[name];
      }
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['cgpa', 'tenthPercentage', 'twelfthPercentage', 'backlogs'].includes(name)) {
      handleAcademicChange(e);
      return;
    }
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (name === 'department') {
      const selected = departments.find(d => d._id === value);
      setFormData(prev => ({
        ...prev,
        department: value,
        branch: selected ? selected.name : prev.branch
      }));
    } else if (name === 'permanentAddress') {
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
    } else if (name === 'studentMobileNumber' || name === 'parentMobileNumber') {
      const numericVal = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: numericVal }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!formData.dateOfBirth) {
      setError('Please select your Date of Birth.');
      return;
    }

    const dob = new Date(formData.dateOfBirth);
    if (isNaN(dob.getTime()) || dob > new Date()) {
      setError('Date of Birth cannot be in the future.');
      return;
    }

    const studentMobileClean = String(formData.studentMobileNumber || '').trim();
    if (!/^\d{10}$/.test(studentMobileClean)) {
      setError('Student Mobile Number must be exactly 10 numeric digits.');
      return;
    }

    const parentMobileClean = String(formData.parentMobileNumber || '').trim();
    if (!/^\d{10}$/.test(parentMobileClean)) {
      setError('Parent Mobile Number must be exactly 10 numeric digits.');
      return;
    }

    if (!formData.permanentAddress.trim()) {
      setError('Permanent Address is required.');
      return;
    }

    const permPinClean = String(formData.permanentPinCode || '').trim();
    if (!/^\d{6}$/.test(permPinClean)) {
      setError('Permanent PIN Code must be exactly 6 numeric digits.');
      return;
    }

    const tempAddressClean = sameAsPermanent ? formData.permanentAddress.trim() : formData.temporaryAddress.trim();
    if (!tempAddressClean) {
      setError('Temporary Address is required.');
      return;
    }

    const tempPinClean = sameAsPermanent ? permPinClean : String(formData.temporaryPinCode || '').trim();
    if (!/^\d{6}$/.test(tempPinClean)) {
      setError('Temporary PIN Code must be exactly 6 numeric digits.');
      return;
    }

    if (!formData.department) {
      setError('Please select an active department.');
      return;
    }

    if (!formData.section) {
      setError('Please select an active section.');
      return;
    }

    const academicErrors = {};

    // Academic Fields Real-time & Range Validation
    const cgpaErr = getAcademicFieldError('cgpa', formData.cgpa, true);
    if (cgpaErr) academicErrors.cgpa = cgpaErr;

    const tenthErr = getAcademicFieldError('tenthPercentage', formData.tenthPercentage, true);
    if (tenthErr) academicErrors.tenthPercentage = tenthErr;

    const twelfthErr = getAcademicFieldError('twelfthPercentage', formData.twelfthPercentage, true);
    if (twelfthErr) academicErrors.twelfthPercentage = twelfthErr;

    const backlogsErr = getAcademicFieldError('backlogs', formData.backlogs, true);
    if (backlogsErr) academicErrors.backlogs = backlogsErr;

    if (Object.keys(academicErrors).length > 0) {
      setFieldErrors(prev => ({ ...prev, ...academicErrors }));
      setError(Object.values(academicErrors)[0]);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        dateOfBirth: formData.dateOfBirth,
        studentMobileNumber: studentMobileClean,
        parentMobileNumber: parentMobileClean,
        permanentAddress: formData.permanentAddress.trim(),
        permanentPinCode: permPinClean,
        temporaryAddress: tempAddressClean,
        temporaryPinCode: tempPinClean,
        enrollmentNo: formData.enrollmentNo.trim().toUpperCase(),
        department: formData.department,
        section: formData.section,
        branch: formData.branch || 'Engineering',
        year: Number(formData.year || 4),
        cgpa: Number(formData.cgpa),
        tenthPercentage: Number(formData.tenthPercentage),
        twelfthPercentage: Number(formData.twelfthPercentage),
        backlogs: Number(formData.backlogs)
      };

      await register(payload);
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasAcademicError = Boolean(
    fieldErrors.cgpa ||
    fieldErrors.tenthPercentage ||
    fieldErrors.twelfthPercentage ||
    fieldErrors.backlogs ||
    getAcademicFieldError('cgpa', formData.cgpa, false) ||
    getAcademicFieldError('tenthPercentage', formData.tenthPercentage, false) ||
    getAcademicFieldError('twelfthPercentage', formData.twelfthPercentage, false) ||
    getAcademicFieldError('backlogs', formData.backlogs, false)
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#f8faff] via-[#edf3fc] to-[#e4eefb] text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Subtle flowing abstract background shapes */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full bg-indigo-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-sky-200/35 blur-3xl" />

      {/* Decorative SVG Geometric Lines (Subtle Corner Accents matching Login page) */}
      <svg
        className="pointer-events-none absolute top-0 right-0 w-96 h-96 text-blue-300/20"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="400" cy="0" r="300" stroke="currentColor" strokeWidth="1" strokeDasharray="6 8" />
        <circle cx="400" cy="0" r="200" stroke="currentColor" strokeWidth="1" />
        <circle cx="400" cy="0" r="100" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" />
      </svg>

      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-80 h-80 text-indigo-300/20"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0,400 Q150,250 400,200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
        <path d="M0,350 Q200,250 400,320" stroke="currentColor" strokeWidth="1" />
      </svg>

      {/* Main Container */}
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center">
        {/* Top Header / Branding */}
        <header className="mb-6 text-center">
          <div className="inline-flex flex-col items-center">
            {/* Graduation Cap in Blue Gradient Square */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-4 ring-white/80 transition-transform duration-300 hover:scale-105">
              <GraduationCap className="h-8 w-8" />
            </div>

            {/* Wordmark */}
            <h1 className="mt-3.5 text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="text-[#0f172a]">CAMPUS</span>
              <span className="text-blue-600">PRO</span>
            </h1>

            {/* Subtitle / Page Header */}
            <h2 className="mt-1 text-base sm:text-lg font-bold text-slate-800">
              Student Registration
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500 max-w-md">
              Create your verified student account to access training &amp; placement opportunities
            </p>
          </div>
        </header>

        {/* Premium White Registration Card */}
        <div className="relative rounded-[24px] bg-white p-6 sm:p-8 md:p-10 shadow-[0_20px_50px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.05)] border border-blue-100/80 transition-all">
          <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-blue-50/80 text-blue-800 text-xs font-semibold border border-blue-200/60">
            <ShieldCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span>Public registration is dedicated exclusively to college students.</span>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200/80 animate-in fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6 text-xs">
            {/* ==================================================== */}
            {/* SECTION 1: PERSONAL DETAILS */}
            {/* ==================================================== */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
                <User className="h-4 w-4 text-blue-600" />
                <h3 className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wider">
                  Personal Details
                </h3>
              </div>

              <div className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="font-bold text-slate-700 uppercase">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Rahul Sharma"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                {/* College Email */}
                <div>
                  <label className="font-bold text-slate-700 uppercase">Registered College Email *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="rahul@campuspro.com"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Drive notifications & interview updates will be sent to this email.</p>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Password *</label>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 6 characters"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>

                {/* Date of Birth & Student Mobile Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Date of Birth *</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      max={todayStr}
                      required
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Student Mobile Number *</label>
                    <input
                      type="tel"
                      name="studentMobileNumber"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                      value={formData.studentMobileNumber}
                      onChange={handleChange}
                      placeholder="9876543210"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>

                {/* Parent Mobile Number */}
                <div>
                  <label className="font-bold text-slate-700 uppercase">Parent Mobile Number *</label>
                  <input
                    type="tel"
                    name="parentMobileNumber"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    required
                    value={formData.parentMobileNumber}
                    onChange={handleChange}
                    placeholder="9123456780"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                {/* Permanent Address & Permanent PIN Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 uppercase">Permanent Address *</label>
                    <textarea
                      rows={2}
                      name="permanentAddress"
                      required
                      value={formData.permanentAddress}
                      onChange={handleChange}
                      placeholder="Village Khaga, District Fatehpur, Uttar Pradesh, India"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Permanent PIN Code *</label>
                    <input
                      type="text"
                      name="permanentPinCode"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      value={formData.permanentPinCode}
                      onChange={handleChange}
                      placeholder="212655"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>

                {/* Checkbox: Same Address UX */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="sameAsPermanent"
                    checked={sameAsPermanent}
                    onChange={handleSameAsPermanentToggle}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="sameAsPermanent" className="text-slate-600 font-semibold cursor-pointer select-none">
                    Temporary address is same as permanent address
                  </label>
                </div>

                {/* Temporary Address & Temporary PIN Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 uppercase">Temporary Address *</label>
                    <textarea
                      rows={2}
                      name="temporaryAddress"
                      required
                      disabled={sameAsPermanent}
                      readOnly={sameAsPermanent}
                      value={formData.temporaryAddress}
                      onChange={handleChange}
                      placeholder="Room 203, XYZ PG, Kanpur, Uttar Pradesh"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Temporary PIN Code *</label>
                    <input
                      type="text"
                      name="temporaryPinCode"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      disabled={sameAsPermanent}
                      readOnly={sameAsPermanent}
                      value={formData.temporaryPinCode}
                      onChange={handleChange}
                      placeholder="208001"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================== */}
            {/* SECTION 2: ACADEMIC & PLACEMENT DETAILS */}
            {/* ==================================================== */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <h3 className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wider">
                  Academic & Placement Details
                </h3>
              </div>

              {/* Row 1: Enrollment No & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Enrollment No *</label>
                  <input
                    type="text"
                    name="enrollmentNo"
                    required
                    value={formData.enrollmentNo}
                    onChange={handleChange}
                    placeholder="EN2023CSE042"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 uppercase focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Department *</label>
                  {deptLoading ? (
                    <select
                      disabled
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-400 bg-slate-50 focus:outline-none"
                    >
                      <option>Loading departments...</option>
                    </select>
                  ) : deptError ? (
                    <select
                      disabled
                      className="mt-1 w-full rounded-xl border border-rose-200 p-2.5 font-medium text-rose-600 bg-rose-50 focus:outline-none"
                    >
                      <option>{deptError}</option>
                    </select>
                  ) : departments.length === 0 ? (
                    <select
                      disabled
                      className="mt-1 w-full rounded-xl border border-amber-200 p-2.5 font-medium text-amber-800 bg-amber-50 focus:outline-none"
                    >
                      <option>No departments available. Please contact administrator.</option>
                    </select>
                  ) : (
                    <select
                      name="department"
                      required
                      value={formData.department}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    >
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Row 2: Section & CGPA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Section *</label>
                  {sectionLoading ? (
                    <select
                      disabled
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-400 bg-slate-50 focus:outline-none"
                    >
                      <option>Loading sections...</option>
                    </select>
                  ) : sectionError ? (
                    <select
                      disabled
                      className="mt-1 w-full rounded-xl border border-rose-200 p-2.5 font-medium text-rose-600 bg-rose-50 focus:outline-none"
                    >
                      <option>{sectionError}</option>
                    </select>
                  ) : sections.length === 0 ? (
                    <select
                      disabled
                      className="mt-1 w-full rounded-xl border border-amber-200 p-2.5 font-medium text-amber-800 bg-amber-50 focus:outline-none"
                    >
                      <option>No sections available. Please contact administrator.</option>
                    </select>
                  ) : (
                    <select
                      name="section"
                      required
                      value={formData.section}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    >
                      {sections.map((sec) => (
                        <option key={sec._id} value={sec._id}>
                          Section {sec.name} {sec.code && sec.code !== sec.name ? `(${sec.code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Current CGPA (0 - 10) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    required
                    name="cgpa"
                    placeholder="e.g. 8.2"
                    value={formData.cgpa}
                    onChange={handleAcademicChange}
                    onInput={handleAcademicChange}
                    onBlur={handleAcademicBlur}
                    onPaste={handleAcademicPaste}
                    className={`mt-1 w-full rounded-xl border p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 ${
                      fieldErrors.cgpa
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-600/20'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/20'
                    }`}
                  />
                  {fieldErrors.cgpa && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">{fieldErrors.cgpa}</p>
                  )}
                </div>
              </div>

              {/* Row 3: 10th %, 12th %, and Active Backlogs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">10th Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="100"
                    required
                    name="tenthPercentage"
                    placeholder="e.g. 82.0"
                    value={formData.tenthPercentage}
                    onChange={handleAcademicChange}
                    onInput={handleAcademicChange}
                    onBlur={handleAcademicBlur}
                    onPaste={handleAcademicPaste}
                    className={`mt-1 w-full rounded-xl border p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 ${
                      fieldErrors.tenthPercentage
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-600/20'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/20'
                    }`}
                  />
                  {fieldErrors.tenthPercentage && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">{fieldErrors.tenthPercentage}</p>
                  )}
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">12th Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="100"
                    required
                    name="twelfthPercentage"
                    placeholder="e.g. 79.0"
                    value={formData.twelfthPercentage}
                    onChange={handleAcademicChange}
                    onInput={handleAcademicChange}
                    onBlur={handleAcademicBlur}
                    onPaste={handleAcademicPaste}
                    className={`mt-1 w-full rounded-xl border p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 ${
                      fieldErrors.twelfthPercentage
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-600/20'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/20'
                    }`}
                  />
                  {fieldErrors.twelfthPercentage && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">{fieldErrors.twelfthPercentage}</p>
                  )}
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Active Backlogs *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="20"
                    required
                    name="backlogs"
                    placeholder="e.g. 0"
                    value={formData.backlogs}
                    onChange={handleAcademicChange}
                    onInput={handleAcademicChange}
                    onBlur={handleAcademicBlur}
                    onPaste={handleAcademicPaste}
                    className={`mt-1 w-full rounded-xl border p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 ${
                      fieldErrors.backlogs
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-600/20'
                        : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/20'
                    }`}
                  />
                  {fieldErrors.backlogs && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">{fieldErrors.backlogs}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || deptLoading || sectionLoading || departments.length === 0 || sections.length === 0 || hasAcademicError}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-600/35 focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              >
                <span>{loading ? 'Creating Student Account...' : 'Complete Registration'}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Lower Content & Footer Links */}
        <footer className="mt-8 text-center space-y-3 pb-6">
          <p className="text-xs sm:text-sm text-slate-600">
            Already registered?{' '}
            <Link 
              to="/login" 
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition"
            >
              Sign In
            </Link>
          </p>

          <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
            <Link to="/privacy" className="hover:text-slate-600 transition">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-600 transition">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Register;

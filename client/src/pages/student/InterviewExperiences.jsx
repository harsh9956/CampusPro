import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  User,
  Calendar,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Building,
  Briefcase,
  HelpCircle,
  Lightbulb,
  Globe,
  MapPin,
  Tag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import experienceService from '../../services/experienceService';
import { useAcademicYear } from '../../context/AcademicYearContext';

const InterviewExperiences = () => {
  const { availableYears, academicYear } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('published'); // 'published' | 'my'
  const [experiences, setExperiences] = useState([]);
  const [myExperiences, setMyExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedExp, setSelectedExp] = useState(null); // For detail view modal

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [myPage, setMyPage] = useState(1);
  const myPageSize = 5;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('ALL');

  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    jobRole: '',
    difficulty: 'Medium',
    questionsAsked: '',
    narrative: '',
    advice: '',
    interviewDate: new Date().toISOString().split('T')[0],
    interviewMode: 'ONLINE',
    selectionStatus: 'NOT_DISCLOSED'
  });

  // Validation error state
  const [formErrors, setFormErrors] = useState({});
  const [bannerMsg, setBannerMsg] = useState(null);
  const [bannerType, setBannerType] = useState('success');

  const fetchPublishedExperiences = async (isMountedRef = { current: true }) => {
    setLoading(true);
    try {
      const params = {};
      if (selectedAcademicYear && selectedAcademicYear !== 'ALL') {
        params.academicYear = selectedAcademicYear;
      }
      const res = await experienceService.getExperiences(params);
      if (!isMountedRef.current) return;
      const list = Array.isArray(res) ? res : res.data || [];
      setExperiences(list);
    } catch (err) {
      if (isMountedRef.current) console.error('Error fetching published experiences:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const fetchMySubmissions = async (isMountedRef = { current: true }) => {
    try {
      const res = await experienceService.getMyExperiences();
      if (!isMountedRef.current) return;
      const list = Array.isArray(res) ? res : res.data || [];
      setMyExperiences(list);
    } catch (err) {
      if (isMountedRef.current) console.error('Error fetching my experiences:', err);
    }
  };

  useEffect(() => {
    const isMountedRef = { current: true };
    fetchPublishedExperiences(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, [selectedAcademicYear]);

  useEffect(() => {
    const isMountedRef = { current: true };
    fetchMySubmissions(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required.';
    }
    if (!formData.jobRole.trim()) {
      errors.jobRole = 'Job role is required.';
    }
    if (!formData.difficulty) {
      errors.difficulty = 'Overall difficulty must be selected.';
    }
    if (!formData.questionsAsked.trim()) {
      errors.questionsAsked = 'Questions asked cannot be empty.';
    }
    if (!formData.narrative.trim()) {
      errors.narrative = 'Experience narrative is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBannerMsg(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        companyName: formData.companyName.trim(),
        jobRole: formData.jobRole.trim(),
        difficulty: formData.difficulty.toUpperCase(),
        questions: formData.questionsAsked,
        narrative: formData.narrative.trim(),
        advice: formData.advice.trim(),
        interviewDate: formData.interviewDate,
        interviewMode: formData.interviewMode,
        selectionStatus: formData.selectionStatus
      };

      const res = await experienceService.createExperience(payload);

      setBannerType('success');
      setBannerMsg(res.message || 'Experience submitted successfully and is waiting for admin approval.');
      setShowModal(false);
      
      // Reset form
      setFormData({
        companyName: '',
        jobRole: '',
        difficulty: 'Medium',
        questionsAsked: '',
        narrative: '',
        advice: '',
        interviewDate: new Date().toISOString().split('T')[0],
        interviewMode: 'ONLINE',
        selectionStatus: 'NOT_DISCLOSED'
      });
      setFormErrors({});

      // Refresh submissions list & switch tab to "my"
      await fetchMySubmissions();
      setActiveTab('my');
    } catch (err) {
      console.error('Experience submission error:', err);
      setBannerType('error');
      const errDetail = err.response?.data?.message || 'Unable to submit experience right now. Please try again.';
      setBannerMsg(errDetail);
    } finally {
      setSubmitting(false);
    }
  };

  // Auto reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCompany, selectedDifficulty, selectedRole]);

  // Extract unique companies & roles for filtering
  const companyList = React.useMemo(() => {
    return Array.from(new Set(experiences.map((exp) => exp.companyName || 'General'))).filter(Boolean);
  }, [experiences]);

  const roleList = React.useMemo(() => {
    return Array.from(new Set(experiences.map((exp) => exp.jobRole || exp.role))).filter(Boolean);
  }, [experiences]);

  // Filtered published experiences memoized
  const filteredExperiences = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return experiences.filter((exp) => {
      const roleText = (exp.jobRole || exp.role || '').toLowerCase();
      const companyText = (exp.companyName || '').toLowerCase();
      const diffText = (exp.difficulty || '').toUpperCase();
      const questionsText = (exp.questions || exp.questionsAsked || []).join(' ').toLowerCase();
      const narrativeText = (exp.narrative || exp.experienceText || '').toLowerCase();

      const matchesSearch =
        !q ||
        companyText.includes(q) ||
        roleText.includes(q) ||
        questionsText.includes(q) ||
        narrativeText.includes(q);

      const matchesCompany = selectedCompany === 'ALL' || companyText === selectedCompany.toLowerCase();
      const matchesDifficulty = selectedDifficulty === 'ALL' || diffText === selectedDifficulty.toUpperCase();
      const matchesRole = selectedRole === 'ALL' || roleText === selectedRole.toLowerCase();

      return matchesSearch && matchesCompany && matchesDifficulty && matchesRole;
    });
  }, [experiences, searchQuery, selectedCompany, selectedDifficulty, selectedRole]);

  const totalPages = Math.ceil(filteredExperiences.length / pageSize) || 1;
  const paginatedExperiences = filteredExperiences.slice((page - 1) * pageSize, page * pageSize);

  const totalMyPages = Math.ceil(myExperiences.length / myPageSize) || 1;
  const paginatedMyExperiences = myExperiences.slice((myPage - 1) * myPageSize, myPage * myPageSize);

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="h-3.5 w-3.5" /> Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="h-3.5 w-3.5" /> Pending Approval
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Interview Experiences</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Read real interview experiences shared by seniors & candidates
          </p>
        </div>
        <button
          onClick={() => {
            setFormErrors({});
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" /> Share Your Experience
        </button>
      </div>

      {/* Global Alert Banner */}
      {bannerMsg && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold flex items-start justify-between border ${
            bannerType === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerType === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
            <span>{bannerMsg}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('published')}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === 'published'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Published Experiences ({experiences.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'my'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          My Submissions
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-extrabold">
            {myExperiences.length}
          </span>
        </button>
      </div>

      {/* TAB 1: PUBLISHED EXPERIENCES */}
      {activeTab === 'published' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company, role, or question keyword..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Company Filter */}
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Companies</option>
                  {companyList.map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>

                {/* Difficulty Filter */}
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>

                {/* Role Filter */}
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Job Roles</option>
                  {roleList.map((rl) => (
                    <option key={rl} value={rl}>
                      {rl}
                    </option>
                  ))}
                </select>

                {/* Academic Year Filter */}
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-700 focus:outline-none bg-white"
                >
                  <option value="ALL">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* List of Published Experiences */}
          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
              <p className="text-xs text-slate-400 font-medium mt-3">Loading interview experiences...</p>
            </div>
          ) : filteredExperiences.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium space-y-2">
              <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
              <p>No published interview experiences found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedExperiences.map((exp) => {
                const roleName = exp.jobRole || exp.role;
                const difficultyVal = (exp.difficulty || 'MEDIUM').toUpperCase();
                const qList = exp.questions || exp.questionsAsked || [];
                const narrativeVal = exp.narrative || exp.experienceText || '';

                return (
                  <div key={exp._id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 hover:border-slate-300 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-black text-blue-600 uppercase tracking-wider">{exp.companyName}</span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{roleName}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <User className="h-3.5 w-3.5 text-slate-400" /> Shared by: <strong>CampusPro Student</strong>
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" /> {new Date(exp.interviewDate || exp.createdAt).toLocaleDateString()}
                          </span>
                          {exp.interviewMode && (
                            <span className="flex items-center gap-1 font-medium">
                              <Globe className="h-3.5 w-3.5 text-slate-400" /> Mode: <strong>{exp.interviewMode}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                            difficultyVal === 'EASY'
                              ? 'bg-emerald-100 text-emerald-800'
                              : difficultyVal === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {difficultyVal} Difficulty
                        </span>
                        {exp.academicYear && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                            {exp.academicYear}
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedExp(exp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                        >
                          <Eye className="h-3.5 w-3.5" /> Read Full
                        </button>
                      </div>
                    </div>

                    {/* Questions Snippet */}
                    {qList.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-500" /> Questions Asked:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {qList.map((q, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200">
                              • {q}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Narrative Snippet */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Experience Highlights:</h4>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 line-clamp-3 whitespace-pre-line">
                        {narrativeVal}
                      </p>
                    </div>

                    {exp.advice && (
                      <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Advice for Juniors:</strong> {exp.advice}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Published Experiences Pagination */}
              {!loading && filteredExperiences.length > pageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm text-xs text-slate-600">
                  <div>
                    Showing <strong className="text-slate-900">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredExperiences.length)}</strong> of <strong className="text-slate-900">{filteredExperiences.length}</strong> experiences
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <span className="px-3 py-1 font-bold text-slate-700">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SUBMISSIONS */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-medium text-slate-600">
            Below is the status of interview experiences you have submitted for admin moderation.
          </div>

          {myExperiences.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium">
              You haven't submitted any interview experiences yet.
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedMyExperiences.map((exp) => {
                const roleName = exp.jobRole || exp.role;
                const difficultyVal = (exp.difficulty || 'MEDIUM').toUpperCase();
                const qList = exp.questions || exp.questionsAsked || [];

                return (
                  <div key={exp._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{exp.companyName}</span>
                        <h3 className="text-base font-extrabold text-slate-900">{roleName}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Submitted on: {new Date(exp.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">{difficultyVal}</span>
                        {renderStatusBadge(exp.approvalStatus)}
                      </div>
                    </div>

                    {exp.approvalStatus === 'REJECTED' && exp.rejectionReason && (
                      <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-900 border border-rose-200">
                        <strong>Reason for Rejection:</strong> {exp.rejectionReason}
                      </div>
                    )}

                    <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-2">
                      {exp.narrative || exp.experienceText}
                    </div>
                  </div>
                );
              })}

              {/* My Submissions Pagination */}
              {myExperiences.length > myPageSize && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm text-xs text-slate-600">
                  <div>
                    Showing <strong className="text-slate-900">{(myPage - 1) * myPageSize + 1}–{Math.min(myPage * myPageSize, myExperiences.length)}</strong> of <strong className="text-slate-900">{myExperiences.length}</strong> submissions
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMyPage((p) => Math.max(1, p - 1))}
                      disabled={myPage <= 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <span className="px-3 py-1 font-bold text-slate-700">
                      Page {myPage} of {totalMyPages}
                    </span>
                    <button
                      onClick={() => setMyPage((p) => Math.min(totalMyPages, p + 1))}
                      disabled={myPage >= totalMyPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SHARE EXPERIENCE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Share Your Interview Experience</h2>
                <p className="text-xs text-slate-500 font-medium">Help fellow candidates prepare effectively</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Company Name */}
              <div>
                <label className="font-bold text-slate-700 uppercase">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => {
                    setFormData({ ...formData, companyName: e.target.value });
                    if (formErrors.companyName) setFormErrors({ ...formErrors, companyName: null });
                  }}
                  placeholder="e.g. Acme Corporation"
                  className={`mt-1 w-full rounded-xl border p-2.5 font-medium text-slate-800 focus:outline-none ${
                    formErrors.companyName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {formErrors.companyName && <p className="text-rose-500 text-[11px] font-bold mt-1">{formErrors.companyName}</p>}
              </div>

              {/* Job Role & Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">
                    Job Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.jobRole}
                    onChange={(e) => {
                      setFormData({ ...formData, jobRole: e.target.value });
                      if (formErrors.jobRole) setFormErrors({ ...formErrors, jobRole: null });
                    }}
                    placeholder="e.g. Software Developer"
                    className={`mt-1 w-full rounded-xl border p-2.5 font-medium text-slate-800 focus:outline-none ${
                      formErrors.jobRole ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  />
                  {formErrors.jobRole && <p className="text-rose-500 text-[11px] font-bold mt-1">{formErrors.jobRole}</p>}
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">
                    Overall Difficulty <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none bg-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Optional Fields: Date, Mode, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Interview Date</label>
                  <input
                    type="date"
                    value={formData.interviewDate}
                    onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Interview Mode</label>
                  <select
                    value={formData.interviewMode}
                    onChange={(e) => setFormData({ ...formData, interviewMode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none bg-white"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Selection Status</label>
                  <select
                    value={formData.selectionStatus}
                    onChange={(e) => setFormData({ ...formData, selectionStatus: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 font-medium text-slate-800 focus:outline-none bg-white"
                  >
                    <option value="NOT_DISCLOSED">Not Disclosed</option>
                    <option value="SELECTED">Selected</option>
                    <option value="NOT_SELECTED">Not Selected</option>
                    <option value="WAITING">Waiting Result</option>
                  </select>
                </div>
              </div>

              {/* Questions Asked */}
              <div>
                <label className="font-bold text-slate-700 uppercase">
                  Questions Asked <span className="text-rose-500">* (One per line)</span>
                </label>
                <textarea
                  rows="3"
                  value={formData.questionsAsked}
                  onChange={(e) => {
                    setFormData({ ...formData, questionsAsked: e.target.value });
                    if (formErrors.questionsAsked) setFormErrors({ ...formErrors, questionsAsked: null });
                  }}
                  placeholder={`What is HashMap in Java?\nExplain OOP concepts.\nWrite SQL query to find second highest salary.`}
                  className={`mt-1 w-full rounded-xl border p-2.5 font-medium text-slate-800 focus:outline-none ${
                    formErrors.questionsAsked ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {formErrors.questionsAsked && <p className="text-rose-500 text-[11px] font-bold mt-1">{formErrors.questionsAsked}</p>}
              </div>

              {/* Experience Narrative */}
              <div>
                <label className="font-bold text-slate-700 uppercase">
                  Experience Narrative <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="4"
                  value={formData.narrative}
                  onChange={(e) => {
                    setFormData({ ...formData, narrative: e.target.value });
                    if (formErrors.narrative) setFormErrors({ ...formErrors, narrative: null });
                  }}
                  placeholder="Describe interview rounds, technical questions asked, coding test format..."
                  className={`mt-1 w-full rounded-xl border p-2.5 font-medium text-slate-800 focus:outline-none ${
                    formErrors.narrative ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                {formErrors.narrative && <p className="text-rose-500 text-[11px] font-bold mt-1">{formErrors.narrative}</p>}
              </div>

              {/* Advice */}
              <div>
                <label className="font-bold text-slate-700 uppercase">Advice for Juniors</label>
                <input
                  type="text"
                  value={formData.advice}
                  onChange={(e) => setFormData({ ...formData, advice: e.target.value })}
                  placeholder="Focus on DSA, Java core concepts, and DBMS..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

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
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPERIENCE DETAIL VIEW MODAL */}
      {selectedExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{selectedExp.companyName}</span>
                <h2 className="text-xl font-extrabold text-slate-900">{selectedExp.jobRole || selectedExp.role}</h2>
              </div>
              <button
                onClick={() => setSelectedExp(null)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 block font-semibold">Difficulty</span>
                <span className="font-extrabold text-slate-800">{selectedExp.difficulty || 'MEDIUM'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Date</span>
                <span className="font-extrabold text-slate-800">{new Date(selectedExp.interviewDate || selectedExp.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Mode</span>
                <span className="font-extrabold text-slate-800">{selectedExp.interviewMode || 'ONLINE'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Selection Status</span>
                <span className="font-extrabold text-slate-800">{selectedExp.selectionStatus || 'NOT_DISCLOSED'}</span>
              </div>
            </div>

            {/* Questions Asked */}
            {(selectedExp.questions || selectedExp.questionsAsked || []).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Questions Asked:</h4>
                <div className="space-y-1.5">
                  {(selectedExp.questions || selectedExp.questionsAsked).map((q, idx) => (
                    <div key={idx} className="bg-slate-100 text-slate-800 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200">
                      {idx + 1}. {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Narrative */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Detailed Narrative:</h4>
              <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                {selectedExp.narrative || selectedExp.experienceText}
              </p>
            </div>

            {/* Advice */}
            {selectedExp.advice && (
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900 border border-blue-100">
                <strong>💡 Advice for Juniors:</strong> {selectedExp.advice}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
              <span>Shared by a CampusPro student</span>
              <button
                onClick={() => setSelectedExp(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewExperiences;

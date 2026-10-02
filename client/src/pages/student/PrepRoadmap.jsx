import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
  Clock,
  Target,
  Building,
  Briefcase,
  RotateCcw,
  BookOpen,
  HelpCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Layers,
  Check,
  AlertCircle,
  Lightbulb,
  FileText,
  Upload,
  Trash2
} from 'lucide-react';
import API from '../../services/api';
import companyService from '../../services/companyService';

const PrepRoadmap = () => {
  // Form Inputs
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [daysLeft, setDaysLeft] = useState('3');
  const [customCompanyInput, setCustomCompanyInput] = useState(false);

  // Job Description Upload State
  const [jdFile, setJdFile] = useState(null);
  const [jdFileName, setJdFileName] = useState('');
  const [jdFileUrl, setJdFileUrl] = useState('');
  const [extractedJdText, setExtractedJdText] = useState('');
  const [jdAnalysisData, setJdAnalysisData] = useState(null);
  const [uploadingJd, setUploadingJd] = useState(false);
  const [jdUploadError, setJdUploadError] = useState(null);

  // Output State
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Researching target company & job role...');
  const [initialLoading, setInitialLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [openDays, setOpenDays] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);

  const timersRef = useRef([]);

  // Load Companies and Active Roadmap on Mount
  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      setInitialLoading(true);
      try {
        // Load company dropdown list with in-memory TTL caching
        const compList = await companyService.getCompanies();
        if (!isMounted) return;
        setCompanies(compList || []);

        if (compList && compList.length > 0) {
          setCompanyName(compList[0].name);
          setSelectedCompanyId(compList[0]._id);
        }

        // Load active persistent roadmap if present
        const roadRes = await API.get('/analytics/ai-roadmap/active');
        if (!isMounted) return;
        if (roadRes.data && roadRes.data._id) {
          const activeData = roadRes.data;
          setRoadmap(activeData);
          setCompanyName(activeData.company || activeData.companyName || '');
          setTargetRole(activeData.jobRole || activeData.targetRole || 'Software Developer');
          setDaysLeft(String(activeData.days || activeData.daysRemaining || 3));

          if (activeData.fileName) {
            setJdFileName(activeData.fileName);
            setJdFileUrl(activeData.fileUrl || '');
            setExtractedJdText(activeData.extractedText || '');
            setJdAnalysisData(activeData.jdAnalysis || null);
          }

          // Open all day accordions by default
          const defaultOpen = {};
          const plans = activeData.daysPlan || activeData.days || [];
          plans.forEach((d) => {
            defaultOpen[d.day || d.dayNumber] = true;
          });
          setOpenDays(defaultOpen);
        }
      } catch (err) {
        if (isMounted) console.error('Error initializing AI roadmap:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    initData();
    return () => {
      isMounted = false;
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  // Handle Company Selection
  const handleCompanySelectChange = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setCustomCompanyInput(true);
      setCompanyName('');
      setSelectedCompanyId('');
    } else {
      setCustomCompanyInput(false);
      const matched = companies.find((c) => c._id === val || c.name === val);
      if (matched) {
        setCompanyName(matched.name);
        setSelectedCompanyId(matched._id);
      } else {
        setCompanyName(val);
      }
    }
  };

  // Handle JD File Selection and Upload
  const handleJdFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExts = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExts.includes(ext)) {
      setJdUploadError('Invalid file format. Only PDF, DOC, DOCX, and TXT files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setJdUploadError('File size exceeds maximum limit of 10 MB.');
      return;
    }

    setJdUploadError(null);
    setUploadingJd(true);
    setJdFile(file);
    setJdFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('jdFile', file);

      const { data } = await API.post('/analytics/ai-roadmap/upload-jd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        setJdFileName(data.fileName);
        setJdFileUrl(data.fileUrl);
        setExtractedJdText(data.extractedText);
        setJdAnalysisData(data.jdAnalysis);
      }
    } catch (err) {
      console.error('Error uploading JD file:', err);
      setJdUploadError(err.response?.data?.message || 'Failed to upload and extract Job Description file.');
    } finally {
      setUploadingJd(false);
    }
  };

  // Handle JD File Removal
  const handleRemoveJd = () => {
    setJdFile(null);
    setJdFileName('');
    setJdFileUrl('');
    setExtractedJdText('');
    setJdAnalysisData(null);
    setJdUploadError(null);
  };

  // Generate / Regenerate Roadmap Handler
  const handleGenerate = async (e, forceNew = false) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const compToUse = companyName.trim();
    if (!compToUse) {
      setErrorMsg('Please select or enter a target company.');
      return;
    }
    if (!targetRole.trim()) {
      setErrorMsg('Please enter a target job role.');
      return;
    }

    setLoading(true);

    // Multi-step loading messages
    setLoadingStep('Researching target company & job role...');
    const timer1 = setTimeout(() => {
      setLoadingStep('Analyzing Job Description & skill gap...');
    }, 800);
    const timer2 = setTimeout(() => {
      setLoadingStep('Building your personalized AI preparation roadmap...');
    }, 1600);
    timersRef.current.push(timer1, timer2);

    try {
      const { data } = await API.post('/analytics/ai-roadmap', {
        company: compToUse,
        jobRole: targetRole.trim(),
        days: parseInt(daysLeft, 10) || 3,
        forceNew,
        jdText: extractedJdText || '',
        fileName: jdFileName || '',
        fileUrl: jdFileUrl || '',
        jdAnalysis: jdAnalysisData || null
      });

      setRoadmap(data);

      // Open all day accordions for newly generated plan
      const openState = {};
      const plans = data.daysPlan || data.days || [];
      plans.forEach((d) => {
        openState[d.day || d.dayNumber] = true;
      });
      setOpenDays(openState);
    } catch (err) {
      console.error('Error generating AI roadmap:', err);
      setErrorMsg(err.response?.data?.message || 'AI roadmap generation is temporarily unavailable. Please try again.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      timersRef.current = timersRef.current.filter((t) => t !== timer1 && t !== timer2);
      setLoading(false);
    }
  };

  // Task Check-off Handler
  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    if (!roadmap || !roadmap._id) return;
    const nextStatus = currentStatus === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED';
    setUpdatingTaskId(taskId);

    try {
      const { data } = await API.patch(`/analytics/ai-roadmap/${roadmap._id}/task`, {
        taskId,
        status: nextStatus
      });
      setRoadmap(data);
    } catch (err) {
      console.error('Error updating task progress:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Toggle Day Accordion
  const toggleDayAccordion = (dayNum) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum]
    }));
  };

  if (initialLoading) {
    return (
      <div className="text-center py-16">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
        <p className="text-xs text-slate-500 font-medium mt-3">Loading AI Preparation Roadmap Generator...</p>
      </div>
    );
  }

  const daysList = roadmap ? roadmap.daysPlan || roadmap.days || [] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
          <Sparkles className="h-3.5 w-3.5" /> AI Placement Career Planner
        </div>
        <h1 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">AI Preparation Roadmap Generator</h1>
        <p className="text-xs text-slate-500 font-medium">
          Dynamically analyze company hiring patterns, Job Descriptions, technical interview requirements, and job role expectations
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Input Generator Form */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={(e) => handleGenerate(e, false)} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 uppercase flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-blue-600" /> Target Company
            </label>
            {!customCompanyInput ? (
              <select
                value={selectedCompanyId || companyName}
                onChange={handleCompanySelectChange}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none bg-white"
              >
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
                <option value="CUSTOM">+ Type Other Company Name</option>
              </select>
            ) : (
              <div className="flex gap-1.5 mt-1">
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name..."
                  className="flex-1 rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCustomCompanyInput(false);
                    if (companies.length > 0) {
                      setCompanyName(companies[0].name);
                      setSelectedCompanyId(companies[0]._id);
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 text-[11px]"
                >
                  Select List
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-blue-600" /> Job Role
            </label>
            <input
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Software Developer, Data Analyst, QA Engineer..."
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-blue-600" /> Days Left for Interview
            </label>
            <select
              value={daysLeft}
              onChange={(e) => setDaysLeft(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none bg-white"
            >
              <option value="1">1 Day (Crash Revision Sprint)</option>
              <option value="2">2 Days (Accelerated Prep)</option>
              <option value="3">3 Days (Sprint Revision)</option>
              <option value="5">5 Days (Targeted Topic Preparation)</option>
              <option value="7">7 Days (Comprehensive Prep)</option>
              <option value="14">14 Days (Deep Foundations & Practice)</option>
            </select>
          </div>

          {/* Job Description Optional Upload Section */}
          <div className="sm:col-span-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <div>
                <label className="font-bold text-slate-800 uppercase text-xs flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-blue-600" /> JOB DESCRIPTION <span className="text-slate-400 font-normal lowercase text-[11px]">(optional)</span>
                </label>
                <p className="text-[11px] text-slate-500 font-medium">
                  Upload the JD for more accurate, skill-targeted preparation
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                Supported: PDF, DOC, DOCX, TXT • Max: 10 MB
              </span>
            </div>

            {!jdFileName ? (
              <div className="relative">
                <label className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 cursor-pointer hover:bg-blue-100/50 hover:border-blue-400 transition text-xs font-bold text-blue-700">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span>{uploadingJd ? 'Analyzing Job Description Document...' : '📄 Upload Job Description'}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleJdFileChange}
                    disabled={uploadingJd}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Selected: <span className="text-blue-900 underline">{jdFileName}</span></span>
                  {uploadingJd && <span className="text-[11px] text-amber-600 font-medium animate-pulse">(Analyzing...)</span>}
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-[11px] flex items-center gap-1">
                    <Upload className="h-3 w-3 text-slate-500" /> Replace
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleJdFileChange}
                      disabled={uploadingJd}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveJd}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 text-[11px] flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3 text-rose-600" /> Remove
                  </button>
                </div>
              </div>
            )}

            {jdUploadError && (
              <p className="mt-1.5 text-xs text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {jdUploadError}
              </p>
            )}
          </div>

          <div className="sm:col-span-3 pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading || uploadingJd}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  {loadingStep}
                </>
              ) : (
                <>
                  Generate AI Preparation Roadmap <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {roadmap && (
              <button
                type="button"
                disabled={loading || uploadingJd}
                onClick={(e) => handleGenerate(e, true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 px-5 py-3 text-xs font-bold hover:bg-purple-100 transition disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" /> Generate New Roadmap Strategy
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Generated Roadmap Display */}
      {roadmap && (
        <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-xl space-y-6">
          {/* Top Banner Overview */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-blue-600" /> AI Placement Research
                </span>
                {roadmap.strategyName && (
                  <span className="text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <Layers className="h-3 w-3 text-purple-600" /> Strategy: {roadmap.strategyName}
                  </span>
                )}
                {roadmap.hasJd && (
                  <span className="text-[11px] font-extrabold px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    📄 JD Informed
                  </span>
                )}
              </div>

              <h2 className="text-xl font-black text-slate-900">
                {roadmap.days || roadmap.daysRemaining}-Day Roadmap for {roadmap.company || roadmap.companyName} ({roadmap.jobRole || roadmap.targetRole})
              </h2>
            </div>

            {/* Overall Task Progress */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[240px]">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                <span>Overall Progress</span>
                <span className="text-blue-600 text-sm">{roadmap.progressPercentage || 0}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${roadmap.progressPercentage || 0}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block text-right">
                {roadmap.completedTasks || 0} of {roadmap.totalTasks || 0} tasks completed
              </span>
            </div>
          </div>

          {/* Fallback JD Warning if present */}
          {roadmap.jdWarning && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs font-bold text-amber-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>{roadmap.jdWarning}</span>
            </div>
          )}

          {/* Job Description Analysis Section */}
          {(roadmap.jdAnalysis || (roadmap.hasJd && roadmap.extractedText)) && (
            <div className="rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-blue-900 text-sm">
                  <FileText className="h-4.5 w-4.5 text-blue-600" />
                  <span>JOB DESCRIPTION ANALYSIS</span>
                </div>
                {roadmap.fileName && (
                  <span className="text-[11px] font-bold text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-200">
                    Source: {roadmap.fileName}
                  </span>
                )}
              </div>

              {roadmap.jdAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Required Skills */}
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-slate-700 text-[11px] block">Required Skills:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(roadmap.jdAnalysis.requiredSkills || []).map((sk, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[11px]">
                          • {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Important Topics */}
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-slate-700 text-[11px] block">Important Topics:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(roadmap.jdAnalysis.likelyTopics || []).map((top, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-[11px]">
                          {top}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Priority Areas */}
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-slate-700 text-[11px] block">Priority Areas:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(roadmap.priorityAreas || []).map((pa, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[11px]">
                          ⚡ {pa}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Interview Focus */}
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-slate-700 text-[11px] block">Interview Focus:</span>
                    <p className="font-bold text-slate-800 bg-white p-2 rounded-xl border border-slate-200">
                      🎯 {roadmap.jdAnalysis.interviewFocus || 'Technical + Coding + HR'}
                    </p>
                  </div>
                </div>
              )}

              {/* Skill Gap Alignment */}
              {roadmap.jdAnalysis && (
                <div className="pt-2 border-t border-blue-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <span className="font-extrabold text-emerald-900 text-[10px] uppercase block mb-1">Strong (In Your Profile):</span>
                    <span className="font-bold text-emerald-800 text-xs">
                      {roadmap.jdAnalysis.strongSkills && roadmap.jdAnalysis.strongSkills.length > 0
                        ? roadmap.jdAnalysis.strongSkills.join(', ')
                        : 'None matched'}
                    </span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <span className="font-extrabold text-amber-900 text-[10px] uppercase block mb-1">Needs Preparation:</span>
                    <span className="font-bold text-amber-800 text-xs">
                      {roadmap.jdAnalysis.needsPrepSkills && roadmap.jdAnalysis.needsPrepSkills.length > 0
                        ? roadmap.jdAnalysis.needsPrepSkills.join(', ')
                        : 'Review standard topics'}
                    </span>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <span className="font-extrabold text-rose-900 text-[10px] uppercase block mb-1">Missing / High Priority:</span>
                    <span className="font-bold text-rose-800 text-xs">
                      {roadmap.jdAnalysis.missingSkills && roadmap.jdAnalysis.missingSkills.length > 0
                        ? roadmap.jdAnalysis.missingSkills.join(', ')
                        : 'None'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Research Summary Section */}
          {roadmap.researchSummary && (
            <div className="rounded-2xl bg-blue-50/60 border border-blue-200 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-extrabold text-blue-900 text-sm">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>AI Research & Strategy Analysis</span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">{roadmap.researchSummary}</p>
            </div>
          )}

          {/* Priority Technical Areas Pills */}
          {roadmap.priorityAreas && roadmap.priorityAreas.length > 0 && !roadmap.jdAnalysis && (
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-500 uppercase text-[10px] block">Key Preparation Priority Areas:</span>
              <div className="flex flex-wrap gap-2">
                {roadmap.priorityAreas.map((area, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-800 text-xs flex items-center gap-1">
                    🎯 {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Day-by-Day Preparation Plan */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Day-by-Day Schedule</h3>

            {daysList.map((d) => {
              const dayNum = d.day || d.dayNumber;
              const isOpen = !!openDays[dayNum];
              const completedInDay = d.tasks.filter((t) => t.status === 'COMPLETED').length;

              return (
                <div key={dayNum} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  {/* Day Accordion Header */}
                  <div
                    onClick={() => toggleDayAccordion(dayNum)}
                    className="p-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer transition flex items-center justify-between border-b border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        D{dayNum}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{d.title}</h4>
                        <p className="text-xs text-slate-500 font-medium">Focus: {d.focus || d.focusArea}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                        ⏱ {d.estimatedHours} Hours
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        {completedInDay}/{d.tasks.length} Done
                      </span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Day Accordion Body */}
                  {isOpen && (
                    <div className="p-5 space-y-4">
                      {/* Topics */}
                      {d.topics && d.topics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100 text-xs">
                          <span className="font-bold text-slate-500 uppercase text-[10px] mr-1">Key Topics:</span>
                          {d.topics.map((top, tIdx) => (
                            <span key={tIdx} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-100">
                              {top}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Tasks List with Checkboxes & Explanations */}
                      <div className="space-y-2">
                        {d.tasks.map((t) => {
                          const isDone = t.status === 'COMPLETED';
                          const isUpdating = updatingTaskId === t.id;

                          return (
                            <div
                              key={t.id}
                              className={`p-3.5 rounded-2xl border transition flex items-start gap-3 ${
                                isDone ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleToggleTaskStatus(t.id, t.status)}
                                className="mt-0.5 flex-shrink-0"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-slate-300 hover:text-blue-600 transition" />
                                )}
                              </button>

                              <div className="flex-1 space-y-1">
                                <span className={`font-bold text-xs block ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {t.title}
                                </span>
                                {t.reason && (
                                  <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                    💡 Reason: {t.reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Expected Outcome */}
                      {(d.expectedOutcome || d.outcome) && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span>
                            <strong>Expected Outcome:</strong> {d.expectedOutcome || d.outcome}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Final AI Strategic Recommendations */}
          {roadmap.finalRecommendations && roadmap.finalRecommendations.length > 0 && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>AI Strategic Interview Recommendations</span>
              </div>
              <ul className="space-y-2 text-slate-700 font-medium">
                {roadmap.finalRecommendations.map((rec, rIdx) => (
                  <li key={rIdx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PrepRoadmap;

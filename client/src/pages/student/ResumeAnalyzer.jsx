import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileCheck,
  Info,
  History,
  ArrowRight,
  ShieldAlert,
  Layers,
  Award,
  BookOpen,
  Briefcase,
  UserCheck,
  Zap,
  Target,
  CheckSquare,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import API from '../../services/api';

const ResumeAnalyzer = () => {
  // Option 1: Resume State
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeInputMode, setResumeInputMode] = useState('file'); // 'file' or 'text'
  const [isResumeDragging, setIsResumeDragging] = useState(false);

  // Option 2: Job Description State
  const [jdMode, setJdMode] = useState('file'); // 'file' or 'text'
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [isJdDragging, setIsJdDragging] = useState(false);

  // General State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch history on mount & check for pre-populated resume text from Resume Builder
  useEffect(() => {
    fetchHistory();
    const transferredText = localStorage.getItem('campuspro_builder_resume_text');
    if (transferredText) {
      setResumeText(transferredText);
      setResumeInputMode('text');
      localStorage.removeItem('campuspro_builder_resume_text');
    }
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await API.get('/resume-analyzer/history');
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load analysis history:', err);
    }
  };

  // File validator (Max 10MB, PDF/DOCX/DOC/TXT)
  const validateFile = (file) => {
    const validExtensions = ['pdf', 'docx', 'doc', 'txt'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      return 'Invalid file format. Supported formats: PDF, Word (.docx, .doc), and Text (.txt).';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size exceeds 10MB maximum limit. Please upload a smaller file.';
    }
    return null;
  };

  // Resume File Drag & Drop
  const handleResumeDrop = (e) => {
    e.preventDefault();
    setIsResumeDragging(false);
    setErrorMsg('');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const err = validateFile(file);
      if (err) setErrorMsg(err);
      else setResumeFile(file);
    }
  };

  const handleResumeSelect = (e) => {
    setErrorMsg('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const err = validateFile(file);
      if (err) setErrorMsg(err);
      else setResumeFile(file);
    }
  };

  // JD File Drag & Drop
  const handleJdDrop = (e) => {
    e.preventDefault();
    setIsJdDragging(false);
    setErrorMsg('');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const err = validateFile(file);
      if (err) setErrorMsg(err);
      else setJdFile(file);
    }
  };

  const handleJdSelect = (e) => {
    setErrorMsg('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const err = validateFile(file);
      if (err) setErrorMsg(err);
      else setJdFile(file);
    }
  };

  // Check if ready
  const hasResume = resumeInputMode === 'file' ? !!resumeFile : !!resumeText.trim();
  const hasJd = jdMode === 'file' ? !!jdFile : !!jdText.trim();
  const canAnalyze = hasResume && hasJd && !loading;

  // Submit Handler
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!canAnalyze) return;

    setLoading(true);
    setErrorMsg('');
    setAnalysis(null);

    const formData = new FormData();

    if (resumeInputMode === 'file' && resumeFile) {
      formData.append('resume', resumeFile);
    } else {
      formData.append('resumeText', resumeText);
    }

    if (jdMode === 'file' && jdFile) {
      formData.append('jdFile', jdFile);
    } else {
      formData.append('jdText', jdText);
    }

    try {
      const { data } = await API.post('/resume-analyzer/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAnalysis(data);
      fetchHistory(); // Refresh history list
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || 'Failed to analyze resume. Please check your files and try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  // Reset form & clear analysis
  const handleReset = () => {
    setResumeFile(null);
    setResumeText('');
    setJdFile(null);
    setJdText('');
    setAnalysis(null);
    setErrorMsg('');
  };

  // Score Color Helper
  const getScoreColor = (score) => {
    if (score >= 82) return { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-200', bgLight: 'bg-emerald-50' };
    if (score >= 68) return { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-200', bgLight: 'bg-blue-50' };
    if (score >= 45) return { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', bgLight: 'bg-amber-50' };
    return { bg: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-200', bgLight: 'bg-rose-50' };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" /> CampusPro Smart ATS Engine
          </div>
          <h1 className="mt-2 text-3xl font-black text-slate-900 tracking-tight">Resume Analyzer</h1>
          <p className="text-sm text-slate-500 font-medium">
            Upload your Resume & Job Description to calculate a dynamic, transparent CampusPro ATS Match Score.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
          >
            <History className="h-4 w-4 text-blue-600" />
            {showHistory ? 'Hide Previous Analyses' : `View Previous Analyses (${history.length})`}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-xs font-semibold flex items-start gap-3 shadow-xs">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Analysis Error</p>
            <p className="mt-0.5 text-rose-700 font-medium">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
            &times;
          </button>
        </div>
      )}

      {/* History Drawer */}
      {showHistory && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" /> Previous Resume Analyses
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No previous analyses recorded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((item) => {
                const colors = getScoreColor(item.score);
                return (
                  <div
                    key={item._id}
                    onClick={() => {
                      setAnalysis(item);
                      setShowHistory(false);
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900 truncate max-w-[170px]">
                        {item.jobRole || 'Software Engineer'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString()} &bull; {item.resumeFileName}
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-black text-white ${colors.bg}`}>
                      {item.score}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleAnalyze} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OPTION 1: UPLOAD RESUME */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                    1
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Option 1: Upload Resume</h2>
                </div>
                <div className="flex gap-1 text-[11px] font-bold bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setResumeInputMode('file')}
                    className={`px-2.5 py-1 rounded-md transition ${resumeInputMode === 'file' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
                  >
                    File
                  </button>
                  <button
                    type="button"
                    onClick={() => setResumeInputMode('text')}
                    className={`px-2.5 py-1 rounded-md transition ${resumeInputMode === 'text' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-4 font-medium">
                Upload your resume document in <strong className="text-slate-700">PDF</strong> or <strong className="text-slate-700">DOCX</strong> format.
              </p>

              {resumeInputMode === 'file' ? (
                resumeFile ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-blue-600 text-white">
                        <FileCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{resumeFile.name}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {(resumeFile.size / 1024).toFixed(1)} KB &bull; <span className="text-emerald-600 font-bold">Ready</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Remove file"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsResumeDragging(true); }}
                    onDragLeave={() => setIsResumeDragging(false)}
                    onDrop={handleResumeDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      isResumeDragging ? 'border-blue-500 bg-blue-50/60 scale-[0.99]' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <UploadCloud className="h-10 w-10 text-blue-500 mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      Drag & drop your resume file here, or{' '}
                      <label className="text-blue-600 hover:underline cursor-pointer">
                        browse
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                          onChange={handleResumeSelect}
                          className="hidden"
                        />
                      </label>
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 font-semibold">Supported formats: PDF, DOCX, DOC, TXT (Max 10MB)</span>
                  </div>
                )
              ) : (
                <textarea
                  rows="6"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume content, summary, skills, and projects here..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Resume Status:</span>
              {hasResume ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Provided
                </span>
              ) : (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Pending Upload
                </span>
              )}
            </div>
          </div>

          {/* OPTION 2: UPLOAD JOB DESCRIPTION */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Option 2: Job Description</h2>
                </div>
                <div className="flex gap-1 text-[11px] font-bold bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setJdMode('file')}
                    className={`px-2.5 py-1 rounded-md transition ${jdMode === 'file' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setJdMode('text')}
                    className={`px-2.5 py-1 rounded-md transition ${jdMode === 'text' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}
                  >
                    Paste Text
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-4 font-medium">
                Upload Job Description (<strong className="text-slate-700">PDF/DOCX</strong>) or paste target job requirements.
              </p>

              {jdMode === 'file' ? (
                jdFile ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-blue-600 text-white">
                        <FileCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{jdFile.name}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {(jdFile.size / 1024).toFixed(1)} KB &bull; <span className="text-emerald-600 font-bold">Ready</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setJdFile(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Remove file"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsJdDragging(true); }}
                    onDragLeave={() => setIsJdDragging(false)}
                    onDrop={handleJdDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      isJdDragging ? 'border-blue-500 bg-blue-50/60 scale-[0.99]' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <UploadCloud className="h-10 w-10 text-blue-500 mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      Drag & drop Job Description file here, or{' '}
                      <label className="text-blue-600 hover:underline cursor-pointer">
                        browse
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain"
                          onChange={handleJdSelect}
                          className="hidden"
                        />
                      </label>
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 font-semibold">Supported formats: PDF, DOCX, DOC, TXT (Max 10MB)</span>
                  </div>
                )
              ) : (
                <textarea
                  rows="6"
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste job description, required skills, qualifications, and role responsibilities here..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Job Description Status:</span>
              {hasJd ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Provided
                </span>
              ) : (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Pending Upload
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Scores are generated dynamically from actual Resume & JD text.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {(hasResume || hasJd || analysis) && (
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-center"
              >
                Analyze Another Job / Reset
              </button>
            )}

            <button
              type="submit"
              disabled={!canAnalyze}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-6 sm:px-8 py-3.5 text-xs font-bold text-white shadow-lg transition ${
                canAnalyze
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 cursor-pointer'
                  : 'bg-slate-300 shadow-none cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Parsing & Calculating ATS Score...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Analyze Resume</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* RESULTS DISPLAY DASHBOARD */}
      {analysis && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-8 animate-fadeIn">
          {/* Top Score Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                <Award className="h-4 w-4" /> CampusPro ATS Match Score
              </span>
              <h2 className="text-3xl font-black text-slate-900">{analysis.jobRole || 'Software Engineer'}</h2>
              <p className="text-xs text-slate-500 font-medium">
                Analyzed documents: <span className="font-bold text-slate-700">{analysis.resumeFileName}</span> vs{' '}
                <span className="font-bold text-slate-700">{analysis.jdFileName}</span>
              </p>
            </div>

            {/* ATS Score visualizer */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-500 uppercase block">Match Rating</span>
                <span className={`text-base font-black ${getScoreColor(analysis.score).text}`}>
                  {analysis.matchLevel}
                </span>
              </div>

              <div
                className={`flex flex-col items-center justify-center h-24 w-28 rounded-2xl ${
                  getScoreColor(analysis.score).bg
                } text-white shadow-xl p-2 text-center`}
              >
                <span className="text-3xl font-black leading-none">{analysis.score}</span>
                <span className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-wider">out of 100</span>
              </div>
            </div>
          </div>

          {/* 7-PART SCORE BREAKDOWN */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="h-4 w-4 text-blue-600" /> Transparent Score Breakdown (100 Points Total)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-center shadow-2xs">
                <span className="text-slate-500 font-medium block text-[10px]">Required Skills</span>
                <p className="text-base font-black text-slate-900">
                  {analysis.scoreBreakdown?.requiredSkills ?? 0} <span className="text-[10px] font-bold text-slate-400">/ 35</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-center shadow-2xs">
                <span className="text-slate-500 font-medium block text-[10px]">JD Keywords</span>
                <p className="text-base font-black text-slate-900">
                  {analysis.scoreBreakdown?.jdKeywords ?? 0} <span className="text-[10px] font-bold text-slate-400">/ 20</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-center shadow-2xs">
                <span className="text-slate-500 font-medium block text-[10px]">Role Relevance</span>
                <p className="text-base font-black text-slate-900">
                  {analysis.scoreBreakdown?.roleRelevance ?? 0} <span className="text-[10px] font-bold text-slate-400">/ 15</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-center shadow-2xs">
                <span className="text-slate-500 font-medium block text-[10px]">Education</span>
                <p className="text-base font-black text-slate-900">
                  {analysis.scoreBreakdown?.education ?? 0} <span className="text-[10px] font-bold text-slate-400">/ 10</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-center shadow-2xs">
                <span className="text-slate-500 font-medium block text-[10px]">Projects/Exp</span>
                <p className="text-base font-black text-slate-900">
                  {analysis.scoreBreakdown?.projectsExperience ?? 0} <span className="text-[10px] font-bold text-slate-400">/ 10</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-center shadow-2xs">
                <span className="text-slate-500 font-medium block text-[10px]">Preferred Skills</span>
                <p className="text-base font-black text-slate-900">
                  {analysis.scoreBreakdown?.preferredSkills ?? 0} <span className="text-[10px] font-bold text-slate-400">/ 5</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 text-center shadow-2xs">
                <span className="text-slate-500 font-medium block text-[10px]">Soft Skills</span>
                <p className="text-base font-black text-slate-900">
                  {analysis.scoreBreakdown?.softSkills ?? 0} <span className="text-[10px] font-bold text-slate-400">/ 5</span>
                </p>
              </div>
            </div>
          </div>

          {/* SKILL GAP ANALYSIS CARD */}
          {analysis.skillGap && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-blue-600" /> Your Skill Gap Analysis
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Required by JD: <strong className="text-slate-900">{analysis.skillGap.totalRequired} skills</strong> &bull; You Have: <strong className="text-emerald-700">{analysis.skillGap.matchedCount} skills</strong> &bull; Missing: <strong className="text-rose-700">{analysis.skillGap.missingCount} skills</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-36 bg-slate-200 rounded-full h-3.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${analysis.skillGap.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-blue-900">{analysis.skillGap.percentage}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                {/* Already Have */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-emerald-800 block uppercase text-[10px] tracking-wider">
                    ✓ Already Have ({analysis.skillGap.alreadyHave?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skillGap.alreadyHave?.map((sk, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-lg border border-emerald-200">
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Need to Learn */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-rose-800 block uppercase text-[10px] tracking-wider">
                    ❌ Need to Learn / Demonstrate ({analysis.skillGap.needToLearn?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.skillGap.needToLearn?.map((sk, idx) => (
                      <span key={idx} className="bg-rose-50 text-rose-800 font-bold text-xs px-2.5 py-1 rounded-lg border border-rose-200">
                        ❌ {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SKILLS REQUIRED VS PREFERRED BREAKDOWN */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" /> Skills & Requirements for This Job
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Matched Skills */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" /> Matched Skills
                  </h4>
                  <span className="bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {analysis.matchedSkills?.length || 0}
                  </span>
                </div>

                {analysis.matchedSkills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {analysis.matchedSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="bg-white text-emerald-800 font-bold text-xs px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-1"
                      >
                        <span className="text-emerald-600 font-black">✓</span> {sk}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No direct skill matches detected.</p>
                )}
              </div>

              {/* Missing Required Skills */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-rose-600" /> Missing Required Skills
                  </h4>
                  <span className="bg-rose-100 text-rose-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-rose-200">
                    🔴 High Priority
                  </span>
                </div>

                {analysis.missingRequiredSkills?.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {analysis.missingRequiredSkills.map((skObj, idx) => {
                      const name = typeof skObj === 'string' ? skObj : skObj.name;
                      const action = typeof skObj === 'object' ? skObj.action : '';
                      return (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-rose-200 text-xs space-y-1">
                          <span className="font-bold text-rose-800 block">🔴 {name}</span>
                          {action && <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{action}</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 font-bold italic">All required technical skills matched!</p>
                )}
              </div>

              {/* Missing Preferred Skills */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Missing Preferred Skills
                  </h4>
                  <span className="bg-amber-100 text-amber-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-amber-200">
                    🟡 Medium Priority
                  </span>
                </div>

                {analysis.missingPreferredSkills?.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {analysis.missingPreferredSkills.map((skObj, idx) => {
                      const name = typeof skObj === 'string' ? skObj : skObj.name;
                      const action = typeof skObj === 'object' ? skObj.action : '';
                      return (
                        <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                          <span className="font-bold text-amber-900 block">🟡 {name}</span>
                          {action && <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{action}</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No preferred missing skills noted.</p>
                )}
              </div>
            </div>

            {/* MANDATORY DISCLAIMER NOTE */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 font-medium flex items-start gap-2.5 shadow-2xs">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Important Authenticity Notice:</p>
                <p className="mt-0.5 text-amber-900">
                  {analysis.disclaimer || 'Only add missing skills if you genuinely have the knowledge or experience.'}
                </p>
              </div>
            </div>
          </div>

          {/* SOFT SKILLS, EDUCATION & EXPERIENCE REQUIREMENTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <UserCheck className="h-4 w-4 text-blue-600" /> Soft Skills Required
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {analysis.softSkills?.map((ss, idx) => (
                  <span key={idx} className="bg-white text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                    {ss}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <BookOpen className="h-4 w-4 text-blue-600" /> Education Requirements
              </h4>
              <ul className="space-y-1.5 text-slate-700 font-medium">
                {analysis.educationRequirements?.map((ed, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">•</span> {ed}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <Briefcase className="h-4 w-4 text-blue-600" /> Experience Requirements
              </h4>
              <ul className="space-y-1.5 text-slate-700 font-medium">
                {analysis.experienceRequirements?.map((exp, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">•</span> {exp}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* SKILLS YOU NEED TO CRACK THIS JOB (PREPARATION CHECKLIST) */}
          {analysis.preparationChecklist && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-blue-600" /> Skills You Need to Crack This Job
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-rose-800 block uppercase text-[10px] tracking-wider">
                    HIGH PRIORITY — REQUIRED SKILLS
                  </span>
                  {analysis.preparationChecklist.mustHave?.length > 0 ? (
                    <ul className="space-y-1 text-slate-700 font-medium">
                      {analysis.preparationChecklist.mustHave.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-rose-600 font-bold">{idx + 1}.</span> {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-emerald-700 font-bold">All required skills met!</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-amber-800 block uppercase text-[10px] tracking-wider">
                    MEDIUM PRIORITY — PREFERRED SKILLS
                  </span>
                  {analysis.preparationChecklist.stronglyRecommended?.length > 0 ? (
                    <ul className="space-y-1 text-slate-700 font-medium">
                      {analysis.preparationChecklist.stronglyRecommended.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-amber-600 font-bold">{idx + 1}.</span> {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 italic">No additional preferred skills.</p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <span className="font-bold text-blue-800 block uppercase text-[10px] tracking-wider">
                    RESUME OPTIMIZATION STEPS
                  </span>
                  <ul className="space-y-1 text-slate-700 font-medium">
                    {analysis.preparationChecklist.resumeImprovement?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-blue-600 font-bold">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ACTIONABLE RESUME IMPROVEMENT SUGGESTIONS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-blue-600" /> Specific Resume Improvement Suggestions
            </h3>

            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              {analysis.suggestions?.map((sug, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="mt-0.5">{sug}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeAnalyzer;

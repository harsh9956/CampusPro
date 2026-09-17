import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import API from '../../services/api';

const PrepRoadmap = () => {
  // Form Inputs
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [targetRole, setTargetRole] = useState('Software Developer');
  const [daysLeft, setDaysLeft] = useState('3');
  const [customCompanyInput, setCustomCompanyInput] = useState(false);

  // Output State
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Researching target company & job role...');
  const [initialLoading, setInitialLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [openDays, setOpenDays] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);

  // Load Companies and Active Roadmap on Mount
  useEffect(() => {
    const initData = async () => {
      setInitialLoading(true);
      try {
        // Load company dropdown list
        const compRes = await API.get('/companies');
        const compList = Array.isArray(compRes.data) ? compRes.data : compRes.data?.data || [];
        setCompanies(compList);

        if (compList.length > 0) {
          setCompanyName(compList[0].name);
          setSelectedCompanyId(compList[0]._id);
        }

        // Load active persistent roadmap if present
        const roadRes = await API.get('/analytics/ai-roadmap/active');
        if (roadRes.data && roadRes.data._id) {
          const activeData = roadRes.data;
          setRoadmap(activeData);
          setCompanyName(activeData.company || activeData.companyName || '');
          setTargetRole(activeData.jobRole || activeData.targetRole || 'Software Developer');
          setDaysLeft(String(activeData.days || activeData.daysRemaining || 3));

          // Open all day accordions by default
          const defaultOpen = {};
          const plans = activeData.daysPlan || activeData.days || [];
          plans.forEach((d) => {
            defaultOpen[d.day || d.dayNumber] = true;
          });
          setOpenDays(defaultOpen);
        }
      } catch (err) {
        console.error('Error initializing AI roadmap:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    initData();
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
      setLoadingStep('Analyzing interview preparation priorities...');
    }, 800);
    const timer2 = setTimeout(() => {
      setLoadingStep('Building your personalized AI preparation roadmap...');
    }, 1600);

    try {
      const { data } = await API.post('/analytics/ai-roadmap', {
        company: compToUse,
        jobRole: targetRole.trim(),
        days: parseInt(daysLeft, 10) || 3,
        forceNew
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
          Dynamically analyze company hiring patterns, technical interview requirements, and job role expectations for your preparation schedule
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
                  placeholder="e.g. TCS, Amazon, Razorpay, Microsoft..."
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

          <div className="sm:col-span-3 pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={loading}
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
                disabled={loading}
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
          {roadmap.priorityAreas && roadmap.priorityAreas.length > 0 && (
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

                      {/* Tasks List with Checkboxes */}
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

                              <div className="flex-1">
                                <span className={`font-bold text-xs ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {t.title}
                                </span>
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

import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Layers,
  Building,
  User,
  Award,
  Calendar,
  AlertCircle,
  ChevronRight,
  Eye,
  Edit,
  Check,
  X,
  Users,
  Briefcase
} from 'lucide-react';
import API from '../../services/api';

const ApplicationManager = () => {
  const { academicYear } = useAcademicYear();

  // State
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState('');
  const [driveData, setDriveData] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [applications, setApplications] = useState([]);
  const [results, setResults] = useState([]);
  const [roundStats, setRoundStats] = useState([]);
  const [totalApplicants, setTotalApplicants] = useState(0);
  const [finalSelectedCount, setFinalSelectedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roundFilter, setRoundFilter] = useState('ALL');

  // Multi-select for Bulk Actions
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('PASSED'); // 'PASSED' | 'FAILED'

  // Evaluation Form Modal
  const [evaluatingApp, setEvaluatingApp] = useState(null);
  const [evalForm, setEvalForm] = useState({
    roundName: '',
    roundOrder: 1,
    roundType: 'Other',
    status: 'PASSED',
    score: '',
    feedback: '',
    interviewDate: ''
  });
  const [savingEval, setSavingEval] = useState(false);

  // History View Modal
  const [historyApp, setHistoryApp] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Banner Messages
  const [bannerMsg, setBannerMsg] = useState(null);
  const [bannerType, setBannerType] = useState('success');

  // Load Drives for Academic Year
  useEffect(() => {
    setLoading(true);
    setDriveData(null);
    setApplications([]);
    setResults([]);
    setRoundStats([]);
    setSelectedDriveId('');

    API.get(`/drives?academicYear=${academicYear}`)
      .then((res) => {
        const driveList = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setDrives(driveList);
        if (driveList.length > 0) {
          setSelectedDriveId(driveList[0]._id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching drives:', err);
        setLoading(false);
      });
  }, [academicYear]);

  // Fetch Drive Rounds, Applications, Results, and Dynamic Statistics
  const fetchDriveData = async (driveId) => {
    if (!driveId) return;
    setLoading(true);
    setSelectedAppIds([]);
    try {
      const res = await API.get(`/interviews/drive/${driveId}`);
      setDriveData(res.data.drive);
      setRounds(res.data.rounds || []);
      setApplications(res.data.applications || []);
      setResults(res.data.results || []);
      setRoundStats(res.data.roundStatistics || []);
      setTotalApplicants(res.data.totalApplicants || (res.data.applications ? res.data.applications.length : 0));
      setFinalSelectedCount(res.data.finalSelected || 0);
      setRejectedCount(res.data.rejected || 0);

      // Default round filter reset
      setRoundFilter('ALL');
    } catch (err) {
      console.error('Error fetching drive interview data:', err);
      try {
        const appRes = await API.get(`/applications/drive/${driveId}`);
        setApplications(Array.isArray(appRes.data) ? appRes.data : []);
      } catch (e) {
        console.error('Fallback application fetch error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDriveId) {
      fetchDriveData(selectedDriveId);
    }
  }, [selectedDriveId]);

  // Open Evaluation Modal for an Application
  const handleOpenEvaluation = (app) => {
    setEvaluatingApp(app);

    // Find current round object in rounds list using order first, then name
    let currentRoundObj = rounds.find((r) => r.order === Number(app.currentRoundOrder));
    if (!currentRoundObj) {
      currentRoundObj = rounds.find(
        (r) => r.roundName.trim().toLowerCase() === (app.currentRound || '').trim().toLowerCase()
      );
    }
    if (!currentRoundObj) currentRoundObj = rounds[0];

    // Find existing result for this app & current round
    const existingRes = currentRoundObj
      ? results.find(
          (r) => String(r.application) === String(app._id) && Number(r.roundOrder) === Number(currentRoundObj.order)
        )
      : null;

    setEvalForm({
      roundName: currentRoundObj ? currentRoundObj.roundName : 'Round 1',
      roundOrder: currentRoundObj ? currentRoundObj.order : 1,
      roundType: currentRoundObj ? currentRoundObj.roundType : 'Other',
      status: existingRes ? existingRes.status : app.status === 'REJECTED' ? 'FAILED' : 'PASSED',
      score: existingRes && existingRes.score !== null ? String(existingRes.score) : '',
      feedback: existingRes ? existingRes.feedback : '',
      interviewDate: existingRes && existingRes.interviewDate ? new Date(existingRes.interviewDate).toISOString().substring(0, 16) : ''
    });
  };

  // Save Round Result Handler
  const handleSaveResult = async (shouldAdvance = false) => {
    if (!evaluatingApp) return;
    setSavingEval(true);
    setBannerMsg(null);

    try {
      if (shouldAdvance) {
        // Advance candidate
        const res = await API.post('/interviews/advance', {
          applicationId: evaluatingApp._id,
          resultStatus: evalForm.status,
          score: evalForm.score,
          feedback: evalForm.feedback,
          interviewDate: evalForm.interviewDate
        });
        setBannerType('success');
        setBannerMsg(res.data.message || 'Candidate advanced successfully!');
      } else {
        // Save result only
        const res = await API.post('/interviews/result', {
          applicationId: evaluatingApp._id,
          roundName: evalForm.roundName,
          roundOrder: evalForm.roundOrder,
          roundType: evalForm.roundType,
          status: evalForm.status,
          score: evalForm.score,
          feedback: evalForm.feedback,
          interviewDate: evalForm.interviewDate
        });
        setBannerType('success');
        setBannerMsg(res.data.message || 'Round result saved successfully!');
      }

      setEvaluatingApp(null);
      await fetchDriveData(selectedDriveId);
    } catch (err) {
      console.error('Error saving round result:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to save round result.');
    } finally {
      setSavingEval(false);
    }
  };

  // Quick Advance Candidate
  const handleQuickAdvance = async (app) => {
    if (app.status === 'REJECTED' || app.status === 'SELECTED' || app.status === 'WITHDRAWN') return;
    setBannerMsg(null);
    try {
      const res = await API.post('/interviews/advance', {
        applicationId: app._id,
        resultStatus: 'PASSED'
      });
      setBannerType('success');
      setBannerMsg(res.data.message || 'Candidate advanced successfully!');
      await fetchDriveData(selectedDriveId);
    } catch (err) {
      console.error('Quick advance error:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to advance candidate.');
    }
  };

  // View Candidate Round History
  const handleViewHistory = async (app) => {
    setHistoryApp(app);
    setHistoryLoading(true);
    try {
      const res = await API.get(`/interviews/application/${app._id}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Bulk Action Execution
  const handleExecuteBulkAction = async () => {
    if (selectedAppIds.length === 0) return;
    setBulkProcessing(true);
    setBannerMsg(null);
    try {
      const res = await API.post('/interviews/bulk-result', {
        applicationIds: selectedAppIds,
        status: bulkActionType,
        feedback: `Bulk evaluated as ${bulkActionType} by Faculty Coordinator`
      });
      setBannerType('success');
      setBannerMsg(res.data.message || `Processed bulk update for ${selectedAppIds.length} candidate(s).`);
      setSelectedAppIds([]);
      setShowBulkConfirmModal(false);
      await fetchDriveData(selectedDriveId);
    } catch (err) {
      console.error('Bulk update error:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to execute bulk update.');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Helper: check if candidate is eligible / evaluated for a specific round order
  const isCandidateEligibleForRound = (app, targetOrder) => {
    if (!app) return false;
    const orderNum = Number(targetOrder);
    if (isNaN(orderNum)) return true;
    if (app.status === 'WITHDRAWN') return false;

    // Check prior rounds 1..(orderNum - 1)
    if (orderNum > 1) {
      for (let r = 1; r < orderNum; r++) {
        const priorRes = results.find(
          (res) => String(res.application) === String(app._id) && Number(res.roundOrder) === r
        );
        if (!priorRes || priorRes.status !== 'PASSED') {
          return false;
        }
      }
    }

    if (app.status === 'REJECTED') {
      const failedRes = results.find(
        (res) => String(res.application) === String(app._id) && res.status === 'FAILED'
      );
      if (failedRes && Number(failedRes.roundOrder) < orderNum) {
        return false;
      }
    }
    return true;
  };

  // Filtered Applications List
  const filteredApplications = applications.filter((app) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (app.user?.name || '').toLowerCase().includes(searchLower) ||
      (app.student?.enrollmentNo || '').toLowerCase().includes(searchLower) ||
      (app.student?.department || '').toLowerCase().includes(searchLower) ||
      (app.user?.email || '').toLowerCase().includes(searchLower);

    let matchesStatus = true;
    if (statusFilter !== 'ALL') {
      if (statusFilter.startsWith('ROUND_') && statusFilter.endsWith('_CLEARED')) {
        const targetOrder = Number(statusFilter.replace('ROUND_', '').replace('_CLEARED', ''));
        matchesStatus = results.some(
          (res) => String(res.application) === String(app._id) && Number(res.roundOrder) === targetOrder && res.status === 'PASSED'
        );
      } else {
        matchesStatus = app.status === statusFilter;
      }
    }

    const matchesRound =
      roundFilter === 'ALL' ||
      Number(app.currentRoundOrder) === Number(roundFilter) ||
      isCandidateEligibleForRound(app, roundFilter);

    return matchesSearch && matchesStatus && matchesRound;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Round Results & Application Matrix</h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage dynamic placement drive selection rounds, evaluate student scores, and advance candidates
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
          <Calendar className="h-3.5 w-3.5 text-blue-600" /> Academic Year: {academicYear}
        </div>
      </div>

      {/* Alert Banner */}
      {bannerMsg && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold flex items-center justify-between border ${
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

      {/* Select Placement Drive Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <label className="font-extrabold text-slate-700 uppercase text-[11px] flex items-center gap-1.5">
          <Briefcase className="h-4 w-4 text-blue-600" /> Select Placement Drive
        </label>

        {drives.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs font-medium rounded-xl border border-dashed border-slate-200">
            No placement drives registered for Academic Year {academicYear}.
          </div>
        ) : (
          <select
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-extrabold text-slate-900 focus:outline-none bg-slate-50/50 cursor-pointer shadow-xs"
          >
            {drives.map((d) => (
              <option key={d._id} value={d._id}>
                {d.company?.name || d.companyName || 'Company'} — {d.jobRole} ({d.package}) • AY: {d.academicYear || academicYear} • Date: {new Date(d.driveDate).toLocaleDateString()}
              </option>
            ))}
          </select>
        )}

        {/* Selected Drive Rounds Progress Bar */}
        {driveData && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-blue-600" />
                <strong className="text-blue-900">{driveData.company?.name}</strong> — {driveData.jobRole} ({driveData.package})
              </span>
              <span className="text-slate-500 font-semibold">{totalApplicants} Total Registered Applicants</span>
            </div>

            {/* Rounds Pipeline Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="font-bold text-slate-400 uppercase text-[10px] mr-1">Configured Selection Rounds:</span>
              {rounds.length === 0 ? (
                <span className="text-rose-500 font-bold text-xs">No selection rounds configured for this drive.</span>
              ) : (
                rounds.map((r, rIdx) => (
                  <div key={r.order || rIdx} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-slate-800 font-bold">
                    <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-black">
                      {r.order}
                    </span>
                    <span>{r.roundName}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">({r.mode || 'Online'})</span>
                    {rIdx < rounds.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300 ml-1" />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Round Statistics Cards */}
      {driveData && roundStats && roundStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div
            onClick={() => {
              setRoundFilter('ALL');
              setStatusFilter('ALL');
            }}
            className={`rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition ${
              roundFilter === 'ALL' && statusFilter === 'ALL'
                ? 'border-slate-400 bg-slate-100 ring-2 ring-slate-300'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Applicants</span>
            <span className="text-xl font-black text-slate-900 mt-1">{totalApplicants}</span>
          </div>

          {roundStats.map((stat) => {
            const isCardActive = roundFilter === String(stat.roundOrder);
            return (
              <div
                key={stat.roundOrder}
                onClick={() => {
                  setRoundFilter(String(stat.roundOrder));
                  setStatusFilter('ALL');
                }}
                className={`rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition ${
                  isCardActive
                    ? 'border-blue-500 bg-blue-100/70 ring-2 ring-blue-400/50'
                    : 'border-blue-100 bg-blue-50/50 hover:bg-blue-100/40'
                }`}
              >
                <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider truncate" title={`Round ${stat.roundOrder}: ${stat.roundName}`}>
                  R{stat.roundOrder} Cleared ({stat.roundName})
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-black text-blue-900">{stat.totalPassed || 0}</span>
                  <span className="text-[10px] font-bold text-blue-600">/ {stat.totalEligible || 0} Eligible</span>
                </div>
              </div>
            );
          })}

          <div
            onClick={() => {
              setRoundFilter('ALL');
              setStatusFilter('SELECTED');
            }}
            className={`rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition ${
              statusFilter === 'SELECTED'
                ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-400/50'
                : 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/50'
            }`}
          >
            <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">Final Selected</span>
            <span className="text-xl font-black text-emerald-900 mt-1">{finalSelectedCount}</span>
          </div>

          <div
            onClick={() => {
              setRoundFilter('ALL');
              setStatusFilter('REJECTED');
            }}
            className={`rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition ${
              statusFilter === 'REJECTED'
                ? 'border-rose-500 bg-rose-100 ring-2 ring-rose-400/50'
                : 'border-rose-200 bg-rose-50/70 hover:bg-rose-100/50'
            }`}
          >
            <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider">Rejected</span>
            <span className="text-xl font-black text-rose-900 mt-1">{rejectedCount}</span>
          </div>
        </div>
      )}

      {/* Filters & Bulk Actions Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name, enrollment no, department..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none bg-white"
            />
          </div>

          {/* Status & Round Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 focus:outline-none bg-white text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="REGISTERED">Registered</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SELECTED">Selected 🎉</option>
              <option value="REJECTED">Rejected</option>
              {rounds.map((r) => (
                <option key={r.order} value={`ROUND_${r.order}_CLEARED`}>
                  Round {r.order} Cleared ({r.roundName})
                </option>
              ))}
            </select>

            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-700 focus:outline-none bg-white text-xs"
            >
              <option value="ALL">All Selection Rounds</option>
              {rounds.map((r) => (
                <option key={r.order} value={String(r.order)}>
                  Round {r.order}: {r.roundName}
                </option>
              ))}
            </select>

            {/* Select All Checkbox */}
            {filteredApplications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedAppIds.length === filteredApplications.length) {
                    setSelectedAppIds([]);
                  } else {
                    setSelectedAppIds(filteredApplications.map((a) => a._id));
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs transition"
              >
                {selectedAppIds.length === filteredApplications.length ? 'Deselect All' : `Select All (${filteredApplications.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedAppIds.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between bg-blue-50/70 p-3 rounded-xl border border-blue-200">
            <span className="font-bold text-blue-900 text-xs">
              Selected <strong className="text-blue-700">{selectedAppIds.length}</strong> candidate applications
            </span>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setBulkActionType('PASSED');
                  setShowBulkConfirmModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-xs"
              >
                Pass Selected & Advance
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkActionType('FAILED');
                  setShowBulkConfirmModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition shadow-xs"
              >
                Fail / Reject Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Applications & Round Matrix Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredApplications.length > 0 && selectedAppIds.length === filteredApplications.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAppIds(filteredApplications.map((a) => a._id));
                      } else {
                        setSelectedAppIds([]);
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                </th>
                <th className="p-4">Student</th>
                <th className="p-4">Enrollment & Dept</th>
                <th className="p-4">Academic Score</th>
                <th className="p-4">Current Round & Order</th>
                <th className="p-4">Round Result</th>
                <th className="p-4">Overall Status</th>
                <th className="p-4 text-right">Action & Advance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
                    <p className="text-xs text-slate-400 font-medium mt-2">Loading applications & evaluation results...</p>
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400 font-medium">
                    {!selectedDriveId
                      ? 'Select a placement drive to view applications and round results.'
                      : applications.length === 0
                      ? 'No applications registered for this drive yet.'
                      : 'No applications match your selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const isSelected = selectedAppIds.includes(app._id);
                  const isCandidateSelected = app.status === 'SELECTED';
                  const isCandidateRejected = app.status === 'REJECTED';
                  const isCandidateWithdrawn = app.status === 'WITHDRAWN';

                  // Calculate current round object and index
                  let currentRoundIdx = rounds.findIndex(
                    (r) => r.order === Number(app.currentRoundOrder)
                  );
                  if (currentRoundIdx === -1) {
                    currentRoundIdx = rounds.findIndex(
                      (r) => r.roundName.trim().toLowerCase() === (app.currentRound || '').trim().toLowerCase()
                    );
                  }
                  const activeRoundIdx = currentRoundIdx !== -1 ? currentRoundIdx : 0;
                  const currentRoundObj = rounds[activeRoundIdx] || rounds[0];
                  const isFinalRound = activeRoundIdx >= rounds.length - 1;

                  // Find InterviewResult for candidate's current round
                  const currentRoundResult = currentRoundObj
                    ? results.find(
                        (r) => String(r.application) === String(app._id) && Number(r.roundOrder) === Number(currentRoundObj.order)
                      )
                    : null;

                  const roundStatusText = currentRoundResult ? currentRoundResult.status : 'PENDING';

                  return (
                    <tr key={app._id} className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/40' : ''}`}>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAppIds([...selectedAppIds, app._id]);
                            } else {
                              setSelectedAppIds(selectedAppIds.filter((id) => id !== app._id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </td>

                      <td className="p-4 font-bold text-slate-900">
                        <span className="block text-sm text-slate-900 font-black">{app.user?.name || 'Student'}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{app.user?.email}</span>
                      </td>

                      <td className="p-4 text-slate-600 font-semibold">
                        <span className="font-bold text-slate-800">{app.student?.enrollmentNo || 'N/A'}</span>
                        <span className="block text-[11px] text-slate-400 font-medium">
                          {app.student?.department} ({app.student?.branch})
                        </span>
                      </td>

                      <td className="p-4 font-bold">
                        <span className="text-emerald-700 text-xs block">CGPA: {app.student?.cgpa || 'N/A'}</span>
                        <span className="text-[10px] text-slate-400 block font-semibold">Backlogs: {app.student?.backlogs ?? 0}</span>
                      </td>

                      <td className="p-4">
                        <span className="font-extrabold text-blue-900 text-xs block">
                          {app.currentRound || (currentRoundObj ? currentRoundObj.roundName : 'Round 1')}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 block">
                          Round {app.currentRoundOrder || currentRoundObj?.order || 1}
                        </span>
                      </td>

                      {/* Current Round Result Column */}
                      <td className="p-4">
                        {isCandidateSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            🎉 PASSED
                          </span>
                        ) : isCandidateRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="h-3 w-3 text-rose-600" /> FAILED
                          </span>
                        ) : roundStatusText === 'PASSED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> PASSED
                          </span>
                        ) : roundStatusText === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="h-3 w-3 text-rose-600" /> FAILED
                          </span>
                        ) : roundStatusText === 'NOT_ATTEMPTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            NOT ATTEMPTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Clock className="h-3 w-3 text-blue-600" /> PENDING
                          </span>
                        )}
                      </td>

                      {/* Overall Application Status Column */}
                      <td className="p-4">
                        {isCandidateSelected ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            🎉 SELECTED
                          </span>
                        ) : isCandidateRejected ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="h-3.5 w-3.5 text-rose-600" /> REJECTED
                          </span>
                        ) : isCandidateWithdrawn ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            WITHDRAWN
                          </span>
                        ) : app.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                            IN PROGRESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {app.status || 'REGISTERED'}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleViewHistory(app)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="View Candidate Round Evaluation History"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEvaluation(app)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition"
                            title="Update Result & Evaluation Form"
                          >
                            Update Result
                          </button>

                          {!isCandidateSelected && !isCandidateRejected && !isCandidateWithdrawn && (
                            <button
                              onClick={() => handleQuickAdvance(app)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                              title={isFinalRound ? 'Mark Final Placement Selection' : 'Quick Advance to Next Selection Round'}
                            >
                              {isFinalRound ? 'Select Candidate 🎉' : 'Advance →'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EVALUATION FORM MODAL / DRAWER */}
      {evaluatingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase block">{driveData?.company?.name || 'Placement Drive'}</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">Evaluate {evaluatingApp.user?.name}</h3>
                <p className="text-slate-500 font-medium">
                  {evaluatingApp.student?.enrollmentNo} • {evaluatingApp.student?.department} (CGPA: {evaluatingApp.student?.cgpa})
                </p>
              </div>
              <button
                onClick={() => setEvaluatingApp(null)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveResult(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="font-bold text-slate-700 uppercase">Selection Round</label>
                <select
                  value={evalForm.roundName}
                  onChange={(e) => {
                    const rName = e.target.value;
                    const rMatch = rounds.find((r) => r.roundName === rName);
                    setEvalForm({
                      ...evalForm,
                      roundName: rName,
                      roundOrder: rMatch ? rMatch.order : 1,
                      roundType: rMatch ? rMatch.roundType : 'Other'
                    });
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none bg-white"
                >
                  {rounds.map((r) => (
                    <option key={r.order} value={r.roundName}>
                      Round {r.order}: {r.roundName} ({r.mode || 'Online'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Result Status *</label>
                  <select
                    value={evalForm.status}
                    onChange={(e) => setEvalForm({ ...evalForm, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none bg-white"
                  >
                    <option value="PASSED">Passed / Cleared</option>
                    <option value="FAILED">Failed / Rejected</option>
                    <option value="PENDING">Pending Evaluation</option>
                    <option value="NOT_ATTEMPTED">Not Attempted</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 uppercase">Score / Marks (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={evalForm.score}
                    onChange={(e) => setEvalForm({ ...evalForm, score: e.target.value })}
                    placeholder="e.g. 85"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Interview Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={evalForm.interviewDate}
                  onChange={(e) => setEvalForm({ ...evalForm, interviewDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Evaluator Feedback / Comments</label>
                <textarea
                  rows="3"
                  value={evalForm.feedback}
                  onChange={(e) => setEvalForm({ ...evalForm, feedback: e.target.value })}
                  placeholder="Notes on candidate technical performance, OOP understanding, communication..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2">
                <button
                  type="submit"
                  disabled={savingEval}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 font-bold text-slate-700 hover:bg-slate-300 transition"
                >
                  Save Result Only
                </button>

                {(() => {
                  const evalRoundIdx = rounds.findIndex((r) => r.roundName === evalForm.roundName);
                  const isEvalFinal = evalRoundIdx !== -1 ? evalRoundIdx >= rounds.length - 1 : false;
                  return (
                    <button
                      type="button"
                      disabled={savingEval || evalForm.status === 'FAILED' || evalForm.status === 'NOT_ATTEMPTED'}
                      onClick={() => handleSaveResult(true)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 font-bold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-40"
                    >
                      {isEvalFinal ? 'Save & Select Candidate 🎉' : 'Save & Advance Candidate →'}
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANDIDATE ROUND HISTORY MODAL */}
      {historyApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase block">{driveData?.company?.name || 'Placement Drive'}</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{historyApp.user?.name} — Round Evaluation History</h3>
                <p className="text-slate-500 font-medium">
                  {historyApp.student?.enrollmentNo} • {historyApp.student?.department}
                </p>
              </div>
              <button
                onClick={() => {
                  setHistoryApp(null);
                  setHistoryData(null);
                }}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {historyLoading ? (
              <div className="text-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
                <p className="text-xs text-slate-400 font-medium mt-2">Loading round history...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Configured Drive Rounds Timeline */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Configured Selection Rounds</h4>
                  {(historyData?.driveRounds || rounds).map((r) => {
                    const rEval = (historyData?.results || []).find(
                      (res) => res.roundOrder === r.order || res.roundName.trim().toLowerCase() === r.roundName.trim().toLowerCase()
                    );
                    const isPassed = rEval && rEval.status === 'PASSED';
                    const isFailed = rEval && rEval.status === 'FAILED';

                    return (
                      <div
                        key={r.order}
                        className={`p-3 rounded-2xl border flex items-center justify-between ${
                          isPassed
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : isFailed
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-7 w-7 rounded-full text-xs font-extrabold flex items-center justify-center text-white ${
                              isPassed ? 'bg-emerald-600' : isFailed ? 'bg-rose-600' : 'bg-slate-400'
                            }`}
                          >
                            {r.order}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block">{r.roundName}</span>
                            {rEval?.feedback && <p className="text-[11px] text-slate-600 font-medium mt-0.5">"{rEval.feedback}"</p>}
                            {rEval?.evaluatedByName && (
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                Evaluated by {rEval.evaluatedByName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isPassed
                                ? 'bg-emerald-100 text-emerald-800'
                                : isFailed
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {rEval ? rEval.status : 'NOT ATTEMPTED'}
                          </span>
                          {rEval && rEval.score !== null && rEval.score !== undefined && (
                            <span className="block text-[11px] font-bold text-slate-700 mt-0.5">Score: {rEval.score}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Audit Timeline */}
                {historyData?.timeline && historyData.timeline.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Application Status Log</h4>
                    <div className="space-y-1.5">
                      {historyData.timeline.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 text-slate-700 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-extrabold text-blue-900">{item.stage}</span>
                            <p className="text-[11px] text-slate-500 font-medium">{item.remarks}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BULK CONFIRMATION MODAL */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">Confirm Bulk Action</h3>
              <button
                onClick={() => setShowBulkConfirmModal(false)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-700 font-medium leading-relaxed">
              Are you sure you want to mark <strong className="text-blue-600">{selectedAppIds.length} candidate(s)</strong> as{' '}
              <strong className={bulkActionType === 'PASSED' ? 'text-emerald-600' : 'text-rose-600'}>
                {bulkActionType === 'PASSED' ? 'PASSED & ADVANCE' : 'FAILED / REJECTED'}
              </strong>
              ?
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkProcessing}
                onClick={handleExecuteBulkAction}
                className={`px-5 py-2 rounded-xl font-bold text-white shadow-md ${
                  bulkActionType === 'PASSED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {bulkProcessing ? 'Processing...' : 'Confirm Bulk Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationManager;

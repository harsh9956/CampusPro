import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Eye,
  Search,
  Filter,
  AlertCircle,
  Building,
  User,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import experienceService from '../../services/experienceService';

const AdminExperiences = () => {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [viewExp, setViewExp] = useState(null);
  const [rejectingExpId, setRejectingExpId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deletingExpId, setDeletingExpId] = useState(null);

  // Status Banners
  const [bannerMsg, setBannerMsg] = useState(null);
  const [bannerType, setBannerType] = useState('success');
  const [processing, setProcessing] = useState(false);

  const fetchAllExperiences = async () => {
    setLoading(true);
    try {
      const res = await experienceService.getExperiences();
      const list = Array.isArray(res) ? res : res.data || [];
      setExperiences(list);
    } catch (err) {
      console.error('Error fetching admin experiences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllExperiences();
  }, []);

  // Calculate Dashboard Metrics
  const totalCount = experiences.length;
  const pendingCount = experiences.filter((e) => e.approvalStatus === 'PENDING').length;
  const approvedCount = experiences.filter((e) => e.approvalStatus === 'APPROVED').length;
  const rejectedCount = experiences.filter((e) => e.approvalStatus === 'REJECTED').length;

  // Filtered List
  const filteredExperiences = experiences.filter((exp) => {
    const matchesStatus = statusTab === 'ALL' || exp.approvalStatus === statusTab;
    const searchLower = searchQuery.toLowerCase();

    const companyName = (exp.companyName || '').toLowerCase();
    const roleName = (exp.jobRole || exp.role || '').toLowerCase();
    const studentName = (exp.student?.user?.name || exp.studentName || '').toLowerCase();

    const matchesSearch =
      !searchQuery ||
      companyName.includes(searchLower) ||
      roleName.includes(searchLower) ||
      studentName.includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  // Approve Handler
  const handleApprove = async (id) => {
    setProcessing(true);
    try {
      const res = await experienceService.approveExperience(id);
      setBannerType('success');
      setBannerMsg(res.message || 'Experience approved successfully.');
      await fetchAllExperiences();
    } catch (err) {
      console.error('Error approving experience:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to approve experience.');
    } finally {
      setProcessing(false);
    }
  };

  // Reject Handler
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingExpId) return;

    setProcessing(true);
    try {
      const res = await experienceService.rejectExperience(rejectingExpId, rejectionReason);
      setBannerType('success');
      setBannerMsg(res.message || 'Experience rejected successfully.');
      setRejectingExpId(null);
      setRejectionReason('');
      await fetchAllExperiences();
    } catch (err) {
      console.error('Error rejecting experience:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to reject experience.');
    } finally {
      setProcessing(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingExpId) return;

    setProcessing(true);
    try {
      const res = await experienceService.deleteExperience(deletingExpId);
      setBannerType('success');
      setBannerMsg(res.message || 'Experience deleted successfully.');
      setDeletingExpId(null);
      await fetchAllExperiences();
    } catch (err) {
      console.error('Error deleting experience:', err);
      setBannerType('error');
      setBannerMsg(err.response?.data?.message || 'Failed to delete experience.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin → Interview Experiences</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Moderate, review, approve, or remove student-submitted interview experiences
        </p>
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

      {/* Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusTab('ALL')}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusTab === 'ALL' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Experiences</span>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
        </div>

        <div
          onClick={() => setStatusTab('PENDING')}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusTab === 'PENDING' ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase">Pending</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{pendingCount}</p>
        </div>

        <div
          onClick={() => setStatusTab('APPROVED')}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusTab === 'APPROVED' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase">Approved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{approvedCount}</p>
        </div>

        <div
          onClick={() => setStatusTab('REJECTED')}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusTab === 'REJECTED' ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase">Rejected</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900 mt-2">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex gap-2 text-xs font-bold">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusTab(st)}
                className={`px-3.5 py-2 rounded-xl transition ${
                  statusTab === st
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, role, student..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Experiences Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-xs text-slate-400 font-medium mt-3">Loading interview experiences...</p>
        </div>
      ) : filteredExperiences.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium">
          No interview experiences found under this filter.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Company & Job Role</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredExperiences.map((exp) => {
                  const roleName = exp.jobRole || exp.role;
                  const studentName = exp.student?.user?.name || exp.studentName || 'Student Candidate';
                  const statusVal = exp.approvalStatus || 'PENDING';

                  return (
                    <tr key={exp._id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4">
                        <span className="font-extrabold text-blue-600 uppercase text-[11px] block">{exp.companyName}</span>
                        <span className="font-bold text-slate-900 text-sm block">{roleName}</span>
                      </td>

                      <td className="p-4 font-semibold text-slate-800">
                        {studentName}
                      </td>

                      <td className="p-4 font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] ${
                            exp.difficulty === 'EASY' || exp.difficulty === 'Easy'
                              ? 'bg-emerald-100 text-emerald-800'
                              : exp.difficulty === 'HARD' || exp.difficulty === 'Hard'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {exp.difficulty || 'MEDIUM'}
                        </span>
                      </td>

                      <td className="p-4 text-slate-500">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-4 font-bold">
                        {statusVal === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </span>
                        )}
                        {statusVal === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-rose-100 text-rose-800">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        )}
                        {statusVal === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-amber-100 text-amber-800">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* View Button */}
                          <button
                            onClick={() => setViewExp(exp)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="View Full Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Action Buttons for Pending */}
                          {statusVal === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(exp._id)}
                                disabled={processing}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingExpId(exp._id);
                                  setRejectionReason('');
                                }}
                                disabled={processing}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* Delete Button (All Statuses) */}
                          <button
                            onClick={() => setDeletingExpId(exp._id)}
                            disabled={processing}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            title="Delete Experience"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {rejectingExpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">Reason for Rejection</h3>
            <p className="text-xs text-slate-500">Provide feedback to the student explaining why this experience was rejected.</p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <textarea
                rows="3"
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Content is incomplete, inappropriate language, or duplicate submission..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-800 focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingExpId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2 rounded-xl bg-rose-600 font-bold text-xs text-white shadow-md shadow-rose-500/20"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingExpId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-lg font-extrabold text-slate-900">Delete Interview Experience</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this interview experience? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExpId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={processing}
                className="px-5 py-2 rounded-xl bg-rose-600 font-bold text-xs text-white shadow-md shadow-rose-500/20 hover:bg-rose-700 transition"
              >
                Delete Experience
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL FOR ADMIN */}
      {viewExp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{viewExp.companyName}</span>
                <h2 className="text-xl font-extrabold text-slate-900">{viewExp.jobRole || viewExp.role}</h2>
                <p className="text-slate-500 text-xs mt-0.5">Submitted by: <strong>{viewExp.student?.user?.name || viewExp.studentName}</strong></p>
              </div>
              <button
                onClick={() => setViewExp(null)}
                className="text-slate-400 font-bold hover:text-slate-600 h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Questions Asked */}
            {(viewExp.questions || viewExp.questionsAsked || []).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Questions Asked:</h4>
                <div className="space-y-1.5">
                  {(viewExp.questions || viewExp.questionsAsked).map((q, idx) => (
                    <div key={idx} className="bg-slate-100 text-slate-800 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200">
                      {idx + 1}. {q}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Narrative */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Narrative:</h4>
              <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                {viewExp.narrative || viewExp.experienceText}
              </p>
            </div>

            {/* Advice */}
            {viewExp.advice && (
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900 border border-blue-100">
                <strong>💡 Advice:</strong> {viewExp.advice}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewExp(null)}
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

export default AdminExperiences;

import React, { useState, useEffect } from 'react';
import ApplicationTimeline from '../../components/ApplicationTimeline';
import { Briefcase, Calendar, CheckCircle2, Clock, MapPin, MessageSquare, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../../services/api';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    let isMounted = true;
    API.get('/applications/my')
      .then((res) => {
        if (isMounted) setApplications(res.data || []);
      })
      .catch((err) => {
        if (isMounted) console.error(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const totalPages = Math.ceil(applications.length / pageSize) || 1;
  const paginatedApplications = applications.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Placement Applications</h1>
        <p className="text-xs text-slate-500 font-medium">Track your selection round status across active placement drives</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
          You haven't registered for any placement drives yet.
        </div>
      ) : (
        <div className="space-y-6">
          {paginatedApplications.map((app) => (
            <div key={app._id} className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{app.drive?.company?.name}</span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">{app.drive?.jobRole}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 sm:gap-4 text-xs text-slate-500 font-medium">
                    <span>Package: <strong className="text-emerald-700">{app.drive?.package}</strong></span>
                    <span>Applied on: {new Date(app.appliedAt).toLocaleDateString()}</span>
                    {app.currentRound && (
                      <span>Current Round: <strong className="text-blue-900">{app.currentRound}</strong> (Round {app.currentRoundOrder || 1})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      app.status === 'SELECTED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : app.status === 'REJECTED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : app.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              </div>

              {/* Progress Timeline Tracker */}
              <ApplicationTimeline application={app} />

              {/* Evaluated Round Results & Feedback Details */}
              {app.results && app.results.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-blue-600" /> Evaluation Results & Feedback
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {app.results.map((res) => (
                      <div
                        key={res._id || res.roundOrder}
                        className={`p-3 rounded-2xl border text-xs flex flex-col justify-between space-y-1.5 ${
                          res.status === 'PASSED'
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : res.status === 'FAILED'
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900">
                            Round {res.roundOrder}: {res.roundName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              res.status === 'PASSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : res.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {res.status}
                          </span>
                        </div>

                        {res.score !== null && res.score !== undefined && (
                          <div className="text-[11px] font-bold text-slate-700">
                            Score: <span className="text-emerald-700">{res.score}</span>
                          </div>
                        )}

                        {res.feedback && (
                          <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100">
                            <span className="font-bold text-slate-700 block text-[10px] uppercase">Faculty Feedback:</span>
                            "{res.feedback}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Applications Pagination Controls */}
      {!loading && applications.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, applications.length)}</strong> of <strong className="text-slate-900">{applications.length}</strong> applications
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
  );
};

export default MyApplications;

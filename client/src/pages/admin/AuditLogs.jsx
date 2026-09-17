import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, Filter, Calendar, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import API from '../../services/api';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filter states
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [actionType, setActionType] = useState('All');
  const [targetEntity, setTargetEntity] = useState('All');
  const [dateRange, setDateRange] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        search: search.trim(),
        role: role === 'All' ? 'ALL' : (role === 'TPO Admin' ? 'ADMIN' : role),
        actionType: actionType === 'All' ? 'ALL' : actionType,
        targetEntity: targetEntity === 'All' ? 'ALL' : targetEntity,
        dateRange: dateRange === 'All' ? 'ALL' : dateRange,
        startDate: dateRange === 'Custom Range' ? startDate : '',
        endDate: dateRange === 'Custom Range' ? endDate : ''
      };

      const res = await API.get('/audit-logs', { params });
      
      if (res.data && res.data.data !== undefined) {
        setLogs(res.data.data || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      } else if (Array.isArray(res.data)) {
        setLogs(res.data);
        setTotal(res.data.length);
        setPages(1);
      } else {
        setLogs([]);
        setTotal(0);
        setPages(1);
      }
    } catch (err) {
      console.error('[Audit Logs Error]', err);
      setError(err.response?.data?.message || 'Failed to fetch audit logs.');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, role, actionType, targetEntity, dateRange, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getActionBadgeClass = (act) => {
    switch (act ? act.toUpperCase() : '') {
      case 'CREATE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'PUBLISH':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'UNPUBLISH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EXPORT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'UPLOAD':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'LOGIN':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 border border-red-200">
            <ShieldAlert className="h-3.5 w-3.5" /> Module 24 — TPO Audit Log System
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 tracking-tight">TPO System Audit Logs</h1>
          <p className="text-xs text-slate-500 font-medium">Trace all admin and faculty modifications to placement results, company records, and student applications</p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, action, entity..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={role}
              onChange={(e) => handleFilterChange(setRole, e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="All">All Roles</option>
              <option value="TPO Admin">TPO Admin</option>
              <option value="Faculty">Faculty</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionType}
              onChange={(e) => handleFilterChange(setActionType, e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="All">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="PUBLISH">PUBLISH</option>
              <option value="UNPUBLISH">UNPUBLISH</option>
              <option value="EXPORT">EXPORT</option>
              <option value="UPLOAD">UPLOAD</option>
              <option value="LOGIN">LOGIN</option>
            </select>
          </div>

          {/* Target Entity Filter */}
          <div>
            <select
              value={targetEntity}
              onChange={(e) => handleFilterChange(setTargetEntity, e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="All">All Entities</option>
              <option value="Company">Company</option>
              <option value="Placement Drive">Placement Drive</option>
              <option value="Application">Application</option>
              <option value="Mock Test">Mock Test</option>
              <option value="Question">Question</option>
              <option value="Interview">Interview</option>
              <option value="Result">Result</option>
              <option value="Student">Student</option>
              <option value="JD">JD</option>
              <option value="Interview Experience">Interview Experience</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => handleFilterChange(setDateRange, e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Custom Range">Custom Range</option>
            </select>
          </div>
        </div>

        {/* Custom Range Inputs */}
        {dateRange === 'Custom Range' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Performed By</th>
                <th className="p-4">Role</th>
                <th className="p-4">Action Type</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Target Name</th>
                <th className="p-4">Details</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-red-600" />
                      Loading audit logs...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400 font-medium">
                    No audit logs recorded yet
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const userObj = log.performedBy;
                  const userName = typeof userObj === 'object' && userObj !== null ? userObj.name || userObj.email : (log.performedBy || 'System User');
                  const userRole = (log.role || (typeof userObj === 'object' && userObj ? userObj.role : 'ADMIN')).toUpperCase();

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatDate(log.createdAt || log.timestamp)}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900">{userName}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                          userRole === 'ADMIN' || userRole === 'TPO ADMIN'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {userRole === 'ADMIN' ? 'Admin' : 'Faculty'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-solid whitespace-nowrap ${getActionBadgeClass(log.actionType || log.action)}`}>
                          {log.actionType || log.action}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800 whitespace-nowrap">
                        {log.targetEntity}
                      </td>
                      <td className="p-4 text-slate-700 font-semibold max-w-[160px] truncate" title={log.targetName || '-'}>
                        {log.targetName || '-'}
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs truncate" title={log.details}>
                        {log.details || '-'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full border ${
                          (log.status || 'SUCCESS') === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {(log.status || 'SUCCESS') === 'SUCCESS' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {log.status || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination Footer */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{startItem}–{endItem}</span> of <span className="font-bold text-slate-900">{total}</span> logs
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, pages) }, (_, idx) => {
                  let pNum = page;
                  if (pages <= 5) pNum = idx + 1;
                  else if (page <= 3) pNum = idx + 1;
                  else if (page >= pages - 2) pNum = pages - 4 + idx;
                  else pNum = page - 2 + idx;

                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                        page === pNum
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;

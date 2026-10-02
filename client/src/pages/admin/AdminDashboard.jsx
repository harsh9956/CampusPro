import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import StatsCard from '../../components/StatsCard';
import { Building2, Briefcase, Users, Award, ShieldAlert, BarChart3, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import API from '../../services/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { academicYear } = useAcademicYear();
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [anRes, logsRes] = await Promise.all([
          API.get(`/analytics/dashboard?academicYear=${academicYear}`),
          API.get('/analytics/audit-logs?limit=4')
        ]);
        if (isMounted) {
          setAnalytics(anRes.data);
          const logsList = Array.isArray(logsRes.data) ? logsRes.data : (logsRes.data?.data || []);
          setAuditLogs(logsList);
        }
      } catch (err) {
        console.error('[AdminDashboard error]', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [academicYear]);

  const branchChartData = React.useMemo(() => {
    return analytics?.placementByBranch || [];
  }, [analytics?.placementByBranch]);

  const logListToDisplay = Array.isArray(auditLogs) ? auditLogs : [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-red-700 via-rose-800 to-slate-900 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200 border border-red-400/30">
            🔴 TPO Admin Command Center
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">TPO Placement Dashboard</h1>
          <p className="mt-1 text-sm text-red-100 font-medium">
            Active Academic Year: <span className="font-bold text-white">{academicYear}</span> • Full System Access & Audit Log Active
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/admin/drives" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-red-900 shadow-md hover:bg-slate-100 transition">
              <Plus className="h-4 w-4" /> Create Placement Drive
            </Link>
            <Link to="/admin/companies" className="inline-flex items-center gap-2 rounded-xl bg-red-600/50 px-4 py-2.5 text-xs font-bold text-white border border-red-400/30 hover:bg-red-600 transition">
              <Building2 className="h-4 w-4" /> Manage Companies
            </Link>
          </div>
        </div>
      </div>

      {/* Top Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Students" value={analytics?.totalStudents ?? 0} subtitle={`Year ${academicYear}`} icon={Users} color="blue" />
        <StatsCard title="Active Companies" value={analytics?.totalCompanies ?? 0} subtitle="Participating recruiters" icon={Building2} color="amber" />
        <StatsCard title="Total Drives" value={analytics?.totalDrives ?? 0} subtitle="Campus drives scheduled" icon={Briefcase} color="purple" />
        <StatsCard title="Selected Students" value={analytics?.totalSelected ?? 0} subtitle={`Ratio: ${analytics?.placementRatio ?? 0}%`} icon={Award} color="green" />
      </div>

      {/* Analytics Chart + Recent TPO Audit Trail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recharts Branch-wise Placement Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Branch-Wise Student Selections</h2>
              <p className="text-xs text-slate-500 font-medium">Placement statistics breakdown across engineering departments</p>
            </div>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="branch" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="placedCount" fill="#2563eb" radius={[6, 6, 0, 0]} name="Placed Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TPO Audit Trail */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" /> Audit Log Trail
              </h2>
              <Link to="/admin/audit-logs" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
            </div>

            <div className="space-y-3">
              {logListToDisplay.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium text-center py-4">No recent audit logs</p>
              ) : (
                logListToDisplay.slice(0, 4).map((log) => (
                  <div key={log._id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-red-700">{log.actionType || log.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt || log.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800">{log.targetEntity} {log.targetName ? `— ${log.targetName}` : ''}</p>
                    <p className="text-[11px] text-slate-500 truncate">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

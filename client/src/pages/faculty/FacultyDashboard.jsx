import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import StatsCard from '../../components/StatsCard';
import { Users, Briefcase, CheckCircle, Bell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

const FacultyDashboard = () => {
  const { user, profile } = useAuth();
  const { academicYear } = useAcademicYear();
  const [stats, setStats] = useState({
    totalDeptStudents: 0,
    highCgpaCount: 0,
    upcomingDrivesCount: 0,
    recentStudents: [],
    upcomingDrives: []
  });
  const [loading, setLoading] = useState(true);

  const deptDisplay = profile?.department?.name || profile?.department?.code || profile?.department || 'Department';

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await API.get(`/analytics/faculty-stats?academicYear=${academicYear}`);
        if (isMounted) setStats(res.data);
      } catch (err) {
        if (isMounted) console.error('Error fetching faculty dashboard stats:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [academicYear, profile]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200 border border-amber-400/30">
          Faculty Coordinator Portal
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Welcome, {user?.name}!</h1>
        <p className="mt-1 text-sm text-amber-100 font-medium">
          Department: <span className="font-bold text-white">{stats.department || deptDisplay}</span> • Academic Year: <span className="font-bold text-white">{academicYear}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard title="Department Students" value={stats.totalDeptStudents} subtitle={`Department: ${stats.department || deptDisplay}`} icon={Users} color="amber" />
        <StatsCard title="High CGPA Candidates (>=8.0)" value={stats.highCgpaCount} subtitle="Tier-1 Drive Ready" icon={CheckCircle} color="green" />
        <StatsCard title="Upcoming Drives" value={stats.upcomingDrivesCount} subtitle={`Year ${academicYear}`} icon={Briefcase} color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">Upcoming Drives</h2>
            <Link to="/faculty/drives" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {(stats.upcomingDrives || []).map(d => (
              <div key={d._id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900">{d.company?.name || 'Company'}</span>
                  <span className="block text-slate-500">{d.jobRole} ({d.package})</span>
                </div>
                <span className="font-bold text-blue-600">Date: {d.driveDate ? new Date(d.driveDate).toLocaleDateString() : 'TBD'}</span>
              </div>
            ))}
            {(!stats.upcomingDrives || stats.upcomingDrives.length === 0) && (
              <p className="text-xs text-slate-400 py-3 text-center">No upcoming drives scheduled.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-900">My Department Students</h2>
            <Link to="/faculty/students" className="text-xs font-bold text-blue-600 hover:underline">Manage Students</Link>
          </div>
          <div className="space-y-2 text-xs">
            {(stats.recentStudents || []).map(s => (
              <div key={s._id} className="p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900">{s.user?.name || 'Student'}</span>
                  <span className="block text-[11px] text-slate-500">{s.enrollmentNo}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-700">CGPA: {s.cgpa}</span>
                  <span className="block text-[10px] text-slate-400">Backlogs: {s.backlogs}</span>
                </div>
              </div>
            ))}
            {(!stats.recentStudents || stats.recentStudents.length === 0) && (
              <p className="text-xs text-slate-400 py-3 text-center">No students registered in department.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;

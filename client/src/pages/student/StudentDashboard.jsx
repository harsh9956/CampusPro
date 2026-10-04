import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import StatsCard from '../../components/StatsCard';
import EligibilityBadge from '../../components/EligibilityBadge';
import ApplicationTimeline from '../../components/ApplicationTimeline';
import { Briefcase, CheckCircle, Award, Compass, ArrowRight, Sparkles, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { academicYear } = useAcademicYear();
  const [drives, setDrives] = useState([]);
  const [applications, setApplications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [drivesRes, appsRes, annRes] = await Promise.all([
          API.get(`/drives?academicYear=${academicYear}`),
          API.get('/applications/my'),
          API.get(`/analytics/announcements?academicYear=${academicYear}`)
        ]);
        if (isMounted) {
          setDrives(Array.isArray(drivesRes.data) ? drivesRes.data : []);
          setApplications(Array.isArray(appsRes.data) ? appsRes.data : []);
          setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);
        }
      } catch (err) {
        console.error('Error loading student dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [academicYear]);

  const eligibleDrivesCount = React.useMemo(() => {
    return drives.filter(d => d.eligibility?.eligible).length;
  }, [drives]);

  const activeApplicationsCount = React.useMemo(() => {
    return applications.filter(a => a.status !== 'REJECTED' && a.status !== 'WITHDRAWN').length;
  }, [applications]);

  const selectedCount = React.useMemo(() => {
    return applications.filter(a => a.status === 'SELECTED').length;
  }, [applications]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200 border border-blue-400/30">
            <Sparkles className="h-3.5 w-3.5" /> Welcome to CampusPro
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Hello, {user?.name}! 👋</h1>
          <p className="mt-1 max-w-xl text-xs sm:text-sm text-blue-100/90 font-medium">
            Enrollment: <span className="font-bold text-white">{profile?.enrollmentNo || 'N/A'}</span> • Department: <span className="font-bold text-white">{profile?.department?.name || profile?.department?.code || profile?.department || 'N/A'}</span> • CGPA: <span className="font-bold text-white">{profile?.cgpa ?? 0}</span>
          </p>

          <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5 sm:gap-3">
            <Link
              to="/student/drives"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-900 shadow-md hover:bg-blue-50 transition w-full sm:w-auto"
            >
              View Eligible Placement Drives <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/student/prep-roadmap"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600/50 px-4 py-2.5 text-xs font-bold text-white border border-blue-400/30 hover:bg-blue-600 transition w-full sm:w-auto"
            >
              Generate 3-Day Prep Plan <Compass className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Eligible Drives" value={eligibleDrivesCount} subtitle="Matching your profile" icon={Briefcase} color="blue" />
        <StatsCard title="Active Applications" value={activeApplicationsCount} subtitle="Under evaluation" icon={CheckCircle} color="purple" />
        <StatsCard title="Offers Received" value={selectedCount} subtitle="Final selections" icon={Award} color="green" />
        <StatsCard title="Your CGPA" value={profile?.cgpa ?? 0} subtitle={`Backlogs: ${profile?.backlogs ?? 0}`} icon={Sparkles} color="amber" />
      </div>

      {/* Recent Announcement Alert */}
      {announcements.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-slate-800">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1">
            <Bell className="h-4 w-4 text-amber-600" />
            <span>Latest TPO Announcement: {announcements[0].title}</span>
          </div>
          <p className="text-xs text-slate-700 pl-6">{announcements[0].content}</p>
        </div>
      )}

      {/* Main Grid: Upcoming Drives + Active Applications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Placement Drives */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900">Upcoming Placement Drives</h2>
            <Link to="/student/drives" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
          </div>

          <div className="space-y-3">
            {drives.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No active drives for Academic Year {academicYear}</p>
            ) : (
              drives.slice(0, 3).map((drive) => (
                <div key={drive._id} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{drive.company?.name}</span>
                      <h3 className="font-bold text-slate-900 text-sm">{drive.jobRole}</h3>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">Package: {drive.package}</p>
                    </div>
                    <EligibilityBadge eligibility={drive.eligibility} />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    <span>Deadline: {new Date(drive.deadline).toLocaleDateString()}</span>
                    {drive.isApplied ? (
                      <span className="font-bold text-emerald-600">✓ Applied</span>
                    ) : (
                      <Link to="/student/drives" className="font-bold text-blue-600 hover:underline">Apply Now →</Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Application Trackers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h2 className="text-base font-bold text-slate-900">My Application Trackers</h2>
            <Link to="/student/applications" className="text-xs font-bold text-blue-600 hover:underline">View History</Link>
          </div>

          <div className="space-y-4">
            {applications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">You haven't applied to any drives yet</p>
            ) : (
              applications.slice(0, 2).map((app) => (
                <div key={app._id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-900 text-sm">{app.drive?.company?.name} — {app.drive?.jobRole}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {app.status}
                    </span>
                  </div>
                  <ApplicationTimeline status={app.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

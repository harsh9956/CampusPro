import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAcademicYear } from '../context/AcademicYearContext';
import { Bell, GraduationCap, LogOut, User, Calendar, CheckCircle2, ChevronDown } from 'lucide-react';
import API from '../services/api';

const Navbar = () => {
  const { user, profile, logout } = useAuth();
  const { academicYear, setAcademicYear, availableYears } = useAcademicYear();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      API.get('/analytics/notifications')
        .then(res => setNotifications(res.data))
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = (id) => {
    API.put(`/analytics/notifications/${id}/read`)
      .then(() => {
        setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      });
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return <span className="bg-red-100 text-red-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-red-200">🔴 TPO Admin</span>;
    if (role === 'faculty') return <span className="bg-amber-100 text-amber-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-200">🟡 Faculty</span>;
    return <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">🟢 Student</span>;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur transition-all">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">CAMPUS<span className="text-blue-600">PRO</span></span>
          <span className="hidden text-xs text-slate-500 md:inline-block md:ml-3 pl-3 border-l border-slate-200 font-medium">
            Manage Placements • Track Interviews • Prepare Smarter
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Academic Year Selector */}
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Academic Year:</span>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
                <span className="text-xs text-slate-500">{unreadCount} unread</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications yet</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      onClick={() => markRead(n._id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                        n.isRead ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-blue-50/60 border-blue-100 text-slate-800 font-medium'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-blue-700">{n.title}</span>
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                      </div>
                      <p>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info Dropdown */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</span>
            <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

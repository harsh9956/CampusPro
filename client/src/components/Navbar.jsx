import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAcademicYear } from '../context/AcademicYearContext';
import { Bell, GraduationCap, LogOut, User, Calendar, CheckCircle2, ChevronDown, Lock, Unlock, AlertTriangle, Settings, Plus, X, Menu } from 'lucide-react';
import API from '../services/api';

import notificationService from '../services/notificationService';

const Navbar = ({ onToggleSidebar }) => {
  const { user, profile, logout } = useAuth();
  const {
    academicYear,
    setAcademicYear,
    availableYears,
    currentAcademicYear,
    isCurrentYear,
    isHistorical,
    historicalManageMode,
    setHistoricalManageMode,
    createAcademicYear,
    setCurrentYear,
    refreshYears
  } = useAcademicYear();
  const isAdmin = user && ['ADMIN', 'SUPER_ADMIN'].includes((user?.role || '').toUpperCase());
  const isSuperAdmin = user && (user?.role || '').toUpperCase() === 'SUPER_ADMIN';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Academic Year Management Modal State
  const [showYearModal, setShowYearModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [yearModalLoading, setYearModalLoading] = useState(false);
  const [yearModalError, setYearModalError] = useState('');
  const [yearModalSuccess, setYearModalSuccess] = useState('');

  // Super Admin Delete Academic Year State
  const [deleteTargetYear, setDeleteTargetYear] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReasonText, setDeleteReasonText] = useState('');
  const [deletingYear, setDeletingYear] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Lock background body scroll when Academic Year modal, Historical Unlock modal, or Delete modal is open
  useEffect(() => {
    if (showYearModal || showUnlockModal || deleteTargetYear) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showYearModal, showUnlockModal, deleteTargetYear]);

  // Fetch lightweight indexed unread count on mount and poll every 60s
  useEffect(() => {
    let isMounted = true;
    const fetchCount = () => {
      if (user) {
        notificationService.getUnreadCount()
          .then(count => {
            if (isMounted) setUnreadCount(count);
          })
          .catch(() => {});
      }
    };

    fetchCount();
    const pollInterval = setInterval(fetchCount, 60000); // Safe 60-second poll

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [user]);

  // Fetch recent notifications on-demand when dropdown is opened
  useEffect(() => {
    let isMounted = true;
    if (showNotifications && user) {
      setLoadingNotifications(true);
      notificationService.getRecentNotifications(10, 1)
        .then(data => {
          if (isMounted) setNotifications(data);
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoadingNotifications(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [showNotifications, user]);

  const handleAddYear = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setYearModalError('Only Super Admin can manage academic years.');
      return;
    }
    if (!newYearInput.trim()) return;
    setYearModalLoading(true);
    setYearModalError('');
    setYearModalSuccess('');
    try {
      await createAcademicYear(newYearInput.trim(), 'ACTIVE');
      setYearModalSuccess(`Academic Year ${newYearInput.trim()} added successfully.`);
      setNewYearInput('');
    } catch (err) {
      setYearModalError(err.response?.data?.message || err.message || 'Failed to create academic year');
    } finally {
      setYearModalLoading(false);
    }
  };

  const handleSetCurrentYear = async (yr) => {
    if (!isSuperAdmin) {
      setYearModalError('Only Super Admin can manage academic years.');
      return;
    }
    if (!window.confirm(`Are you sure you want to designate ${yr} as the Current Active Academic Year?\n\nNote: All historical data will remain completely intact.`)) {
      return;
    }
    setYearModalLoading(true);
    setYearModalError('');
    setYearModalSuccess('');
    try {
      await setCurrentYear(yr);
      setAcademicYear(yr);
      setYearModalSuccess(`${yr} is now the Current Active Academic Year.`);
    } catch (err) {
      setYearModalError(err.response?.data?.message || err.message || 'Failed to set current academic year');
    } finally {
      setYearModalLoading(false);
    }
  };

  const handleConfirmUnlock = () => {
    setHistoricalManageMode(true);
    setShowUnlockModal(false);
  };

  const handleOpenDeleteModal = (yr) => {
    setDeleteTargetYear(yr);
    setDeleteConfirmText('');
    setDeleteReasonText('');
    setDeleteError('');
  };

  const handleConfirmDeleteYear = async (e) => {
    e.preventDefault();
    if (deleteConfirmText !== deleteTargetYear) {
      setDeleteError(`Please type "${deleteTargetYear}" exactly to confirm.`);
      return;
    }
    if (!deleteReasonText.trim() || deleteReasonText.trim().length < 5) {
      setDeleteError('A valid deletion reason (at least 5 characters) is required.');
      return;
    }

    setDeletingYear(true);
    setDeleteError('');
    try {
      const res = await API.delete(`/academic-years/${deleteTargetYear}/data`, {
        data: {
          confirmYear: deleteTargetYear,
          reason: deleteReasonText.trim()
        }
      });
      setYearModalSuccess(res.data?.message || `Academic Year ${deleteTargetYear} data deleted successfully.`);
      setDeleteTargetYear(null);
      await refreshYears();
    } catch (err) {
      setDeleteError(err.response?.data?.message || err.message || 'Failed to delete academic year data.');
    } finally {
      setDeletingYear(false);
    }
  };

  const markRead = async (id) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await notificationService.markAsRead(id);
    } catch (err) {
      console.error('[Error marking notification read]', err);
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllAsRead();
    } catch (err) {
      console.error('[Error marking all notifications read]', err);
    }
  };

  const getRoleBadge = (role) => {
    const r = (role || '').toUpperCase();
    if (r === 'SUPER_ADMIN') return <span className="bg-purple-100 text-purple-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-purple-200">🟣 Super Admin</span>;
    if (r === 'ADMIN') return <span className="bg-red-100 text-red-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-red-200">🔴 TPO Admin</span>;
    if (r === 'FACULTY') return <span className="bg-amber-100 text-amber-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-200">🟡 Faculty</span>;
    return <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-emerald-200">🟢 Student</span>;
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-6 backdrop-blur transition-all">
      {/* Brand & Mobile Hamburger */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shrink-0"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">CAMPUS<span className="text-blue-600">PRO</span></span>
          <span className="hidden text-xs text-slate-500 md:inline-block md:ml-3 pl-3 border-l border-slate-200 font-medium">
            Manage Placements • Track Interviews • Prepare Smarter
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
        {/* Academic Year Selector + Status */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200">
            <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Academic Year:</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[85px] sm:max-w-none"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  {yr} {yr === currentAcademicYear ? '★ (Current)' : ''}
                </option>
              ))}
            </select>

            {/* Super Admin Year Settings Button */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowYearModal(true)}
                title="Manage Academic Years"
                className="ml-1 text-slate-400 hover:text-blue-600 transition p-0.5 rounded"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Historical Mode Indicator & Controls */}
          {isHistorical && (
            isSuperAdmin ? (
              historicalManageMode ? (
                <button
                  type="button"
                  onClick={() => setHistoricalManageMode(false)}
                  title="Super Admin Historical Maintenance Mode Enabled. Click to re-lock view-only mode."
                  className="flex items-center gap-1.5 bg-purple-100 border border-purple-300 text-purple-900 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-purple-200 transition shadow-sm animate-pulse"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-purple-600" />
                  <span className="hidden md:inline">Super Admin Historical Mode</span>
                  <span className="md:hidden">Super Mode</span>
                  <Lock className="h-3 w-3 text-purple-700 ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(true)}
                  title="Historical Year: Default View-Only. Click to unlock Super Admin historical maintenance."
                  className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition"
                >
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden md:inline">Historical (View-Only)</span>
                  <span className="md:hidden">View-Only</span>
                  <Unlock className="h-3 w-3 text-purple-600 ml-0.5" />
                </button>
              )
            ) : (
              <span
                title="Historical Academic Year: Read-Only Mode"
                className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xs"
              >
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span className="hidden md:inline">Historical View-Only</span>
                <span className="md:hidden">View-Only</span>
              </span>
            )
          )}
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
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
                  <span className="text-xs text-slate-500 font-semibold">({unreadCount} unread)</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-xs font-semibold text-slate-500">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications yet</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      onClick={() => !n.isRead && markRead(n._id)}
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
        <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-2 sm:pl-4">
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

      {/* Historical Unlock Confirmation Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md my-auto flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[calc(100vh_-_32px)] sm:max-h-[calc(100vh_-_48px)]"
            style={{ maxHeight: 'calc(100vh - 32px)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3 text-amber-600 px-6 pt-6 pb-2 shrink-0">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Unlock Historical Management?</h3>
                <p className="text-xs text-slate-500">Academic Year: {academicYear}</p>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0" style={{ minHeight: 0 }}>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                You are switching into <strong>Historical Management Mode</strong> for academic year <strong>{academicYear}</strong>.
                In this mode, administrative edits/deletions on historical operational records are permitted and will be <strong>strictly logged to the audit log</strong> with your identity and timestamp.
              </p>

              <div className="rounded-lg bg-amber-50/70 border border-amber-200 p-3 text-[11px] text-amber-800 space-y-1">
                <p className="font-semibold">⚠️ Strict Safety Guarantees:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Faculty and students will remain strictly view-only.</li>
                  <li>Deletions still mandate an explicit confirmation and deletion reason.</li>
                  <li>Switching back to the current year auto-locks historical mode.</li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 px-6 pt-3 pb-6 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition"
              >
                Unlock Historical Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academic Year Management Modal */}
      {showYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div
            className="relative w-full max-w-lg my-auto flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[calc(100vh_-_32px)] sm:max-h-[calc(100vh_-_48px)]"
            style={{ maxHeight: 'calc(100vh - 32px)' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Academic Year Management</h3>
                  <p className="text-xs text-slate-500">
                    {isSuperAdmin
                      ? 'Configure institutional years and designate active batch'
                      : 'Registered institutional academic years (View-Only)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowYearModal(false);
                  setYearModalError('');
                  setYearModalSuccess('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0" style={{ minHeight: 0 }}>
              {yearModalError && (
                <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {yearModalError}
                </div>
              )}
              {yearModalSuccess && (
                <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                  {yearModalSuccess}
                </div>
              )}

              {/* List of Years */}
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Registered Academic Years
                </label>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {availableYears.map(yr => {
                    const isCurrent = yr === currentAcademicYear;
                    return (
                      <div key={yr} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800">{yr}</span>
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Current Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                              Historical
                            </span>
                          )}
                        </div>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-2">
                            {!isCurrent && (
                              <button
                                type="button"
                                disabled={yearModalLoading}
                                onClick={() => handleSetCurrentYear(yr)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50 px-2 py-1 rounded hover:bg-blue-50 transition"
                              >
                                Set as Current
                              </button>
                            )}
                            {isCurrent ? (
                              <span
                                title="Current active academic year cannot be deleted. Switch to another year first."
                                className="text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded cursor-not-allowed"
                              >
                                Protected (Active)
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={yearModalLoading}
                                onClick={() => handleOpenDeleteModal(yr)}
                                className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 px-2 py-1 rounded hover:bg-red-50 transition"
                              >
                                Delete Year Data
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add New Year Form - Super Admin Only */}
              {isSuperAdmin && (
                <form onSubmit={handleAddYear} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Add New Academic Year
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 2027-28"
                      value={newYearInput}
                      onChange={(e) => setNewYearInput(e.target.value)}
                      pattern="^\d{4}-\d{2}$"
                      title="Format: YYYY-YY (e.g. 2027-28)"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={yearModalLoading || !newYearInput.trim()}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Year</span>
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Format: YYYY-YY (e.g. 2027-28)</p>
                </form>
              )}

              <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 text-[11px] text-blue-800">
                ℹ️ <strong>Safe System Transition:</strong> Setting a new current academic year never deletes or modifies historical records. All past student registrations, placement drives, interview results, and statistics remain intact.
              </div>

              {/* Footer with Close button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                <span className="text-[11px] text-slate-400">
                  {isSuperAdmin
                    ? 'Super Admin Privileges: Academic Year Lifecycle Management'
                    : 'View-Only Mode: Only Super Admin can manage academic years'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowYearModal(false);
                    setYearModalError('');
                    setYearModalSuccess('');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Delete Year Confirmation Modal */}
      {deleteTargetYear && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm">
          <div
            className="relative w-full max-w-lg my-auto flex flex-col rounded-2xl bg-white shadow-2xl border border-red-200 overflow-hidden max-h-[calc(100vh_-_32px)]"
            style={{ maxHeight: 'calc(100vh - 32px)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-2 shrink-0 border-b border-red-100 bg-red-50/50">
              <div className="p-2 rounded-xl bg-red-100 border border-red-200 shrink-0 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-900">Delete Academic Year Data</h3>
                <p className="text-xs font-semibold text-red-600">Academic Year: {deleteTargetYear}</p>
              </div>
            </div>

            {/* Scrollable Content */}
            <form onSubmit={handleConfirmDeleteYear} className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4">
              {deleteError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-slate-700 leading-relaxed">
                This action will permanently delete year-specific records belonging to <strong>{deleteTargetYear}</strong>. 
                Global master records (such as Companies and Departments) and Audit Logs will remain preserved.
              </p>

              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-[11px] text-red-900 space-y-1">
                <p className="font-bold">⚠️ Potentially affected data:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  <li>Students registered in {deleteTargetYear} and their student logins</li>
                  <li>Placement Drives created for {deleteTargetYear}</li>
                  <li>Applications, Interview Rounds, and Interview Results</li>
                  <li>Mock Tests and Mock Results for {deleteTargetYear}</li>
                  <li>Year-specific Questions, Experiences, and Announcements</li>
                  <li>Sections assigned to {deleteTargetYear}</li>
                </ul>
                <p className="font-semibold text-red-700 pt-1">This action cannot be undone.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Deletion Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="2"
                  required
                  value={deleteReasonText}
                  onChange={(e) => setDeleteReasonText(e.target.value)}
                  placeholder="e.g. Historical data retention period completed, institutional data cleanup"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Type <span className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded">{deleteTargetYear}</span> to confirm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`Type ${deleteTargetYear} to confirm`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 shrink-0 border-t border-slate-100">
                <button
                  type="button"
                  disabled={deletingYear}
                  onClick={() => setDeleteTargetYear(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingYear || deleteConfirmText !== deleteTargetYear || !deleteReasonText.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow-sm transition"
                >
                  {deletingYear ? 'Deleting Data...' : 'Permanently Delete Year Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

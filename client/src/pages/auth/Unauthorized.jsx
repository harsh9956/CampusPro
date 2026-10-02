import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';

const Unauthorized = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleGoDashboard = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const role = (user.role || '').toUpperCase();
    if (role === 'ADMIN') navigate('/admin/dashboard');
    else if (role === 'FACULTY') navigate('/faculty/dashboard');
    else navigate('/student/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-2xl border border-slate-100 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-lg shadow-rose-600/20">
          <ShieldAlert className="h-9 w-9" />
        </div>

        <div>
          <span className="inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-black tracking-wider text-rose-700 uppercase mb-2">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Access Denied</h1>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            You do not have the required permissions to view this resource. Your authenticated role ({user?.role || 'Unknown'}) is restricted from accessing this page.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-left text-xs space-y-1">
          <p className="text-slate-500 font-semibold">Authenticated Identity:</p>
          <p className="font-bold text-slate-800">{user?.name || 'Guest'} ({user?.email || 'N/A'})</p>
          <p className="text-slate-500">
            Assigned Role: <span className="font-bold text-rose-600 uppercase">{user?.role || 'None'}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={handleGoDashboard}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
          >
            <Home className="h-4 w-4" /> Go to Authorized Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <LogOut className="h-4 w-4 text-slate-500" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;

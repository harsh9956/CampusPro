import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoDashboard = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const role = (user.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') navigate('/admin/dashboard');
    else if (role === 'FACULTY') navigate('/faculty/dashboard');
    else navigate('/student/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-2xl border border-slate-100 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-lg shadow-blue-600/20">
          <FileQuestion className="h-9 w-9" />
        </div>

        <div>
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-black tracking-wider text-blue-700 uppercase mb-2">
            HTTP 404 Not Found
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Page Not Found</h1>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            The page or resource you are looking for does not exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={handleGoDashboard}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
          >
            <Home className="h-4 w-4" /> Go to Authorized Portal
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

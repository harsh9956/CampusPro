import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Lock, Mail, ArrowRight, Shield, User, UserCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.user.role === 'admin') navigate('/admin/dashboard');
      else if (data.user.role === 'faculty') navigate('/faculty/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo Banner */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">CAMPUS<span className="text-blue-500">PRO</span></h1>
          <p className="mt-1 text-sm font-medium text-slate-300">Smart Placement & Interview Management Platform</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white p-8 shadow-2xl border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
          <p className="mt-1 text-xs text-slate-500">Enter your college credentials to access your portal</p>

          {error && (
            <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campuspro.com"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Instant Demo Credentials</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('student@campuspro.com', 'student123')}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition"
              >
                <User className="h-4 w-4 mb-0.5 text-emerald-600" />
                Student
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('faculty@campuspro.com', 'faculty123')}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-[11px] font-bold hover:bg-amber-100 transition"
              >
                <UserCheck className="h-4 w-4 mb-0.5 text-amber-600" />
                Faculty
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@campuspro.com', 'admin123')}
                className="flex flex-col items-center justify-center p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-[11px] font-bold hover:bg-rose-100 transition"
              >
                <Shield className="h-4 w-4 mb-0.5 text-rose-600" />
                TPO Admin
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Need an account? <Link to="/register" className="font-bold text-blue-400 hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

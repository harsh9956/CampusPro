import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  TrendingUp,
  Award,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

/**
 * Configurable Campus Visual Component
 * Allows dropping in an actual university photograph URL or asset path in the future
 * while providing an elegant, SVG-based architectural campus illustration as the fallback.
 */
const CampusVisual = ({ customImageUrl = null }) => {
  const [imageError, setImageError] = useState(false);

  if (customImageUrl && !imageError) {
    return (
      <div className="relative w-full h-full overflow-hidden rounded-3xl">
        <img
          src={customImageUrl}
          alt="Campus Grounds"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-slate-50/95" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-8 select-none pointer-events-none">
      {/* Decorative Architectural Vector Illustration */}
      <div className="relative w-full h-full flex items-center justify-center opacity-85">
        <svg
          viewBox="0 0 600 700"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto max-h-[580px] drop-shadow-sm"
        >
          <defs>
            <linearGradient id="domeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="pillarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Soft Sun / Academic Radiance Ring */}
          <circle cx="300" cy="180" r="140" fill="url(#sunGrad)" />
          <circle cx="300" cy="180" r="160" stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 6" opacity="0.3" />

          {/* Central Dome & Spire (University Hall Architecture) */}
          <path d="M 300 90 L 300 130" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
          <circle cx="300" cy="85" r="4.5" fill="#2563eb" opacity="0.7" />
          <path
            d="M 230 210 C 230 145, 370 145, 370 210 Z"
            fill="url(#domeGrad)"
            stroke="#3b82f6"
            strokeWidth="2"
            opacity="0.8"
          />

          {/* Dome Drum & Clock */}
          <rect x="245" y="210" width="110" height="40" rx="4" fill="url(#wallGrad)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" />
          <circle cx="300" cy="230" r="12" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" opacity="0.9" />
          <path d="M 300 223 L 300 230 L 305 233" stroke="#1d4ed8" strokeWidth="1.5" strokeLinecap="round" />

          {/* Main Classical Pediment (Triangle gable) */}
          <polygon
            points="120,290 300,240 480,290"
            fill="#eff6ff"
            stroke="#3b82f6"
            strokeWidth="2"
            opacity="0.85"
          />
          {/* Inner Pediment Carving Line */}
          <polygon
            points="155,285 300,248 445,285"
            stroke="#93c5fd"
            strokeWidth="1"
            fill="none"
            opacity="0.5"
          />

          {/* Classical Architrave & Frieze */}
          <rect x="130" y="290" width="340" height="22" rx="2" fill="#e0e7ff" stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" />
          {/* Frieze notches */}
          <line x1="160" y1="294" x2="160" y2="308" stroke="#93c5fd" strokeWidth="2" opacity="0.6" />
          <line x1="230" y1="294" x2="230" y2="308" stroke="#93c5fd" strokeWidth="2" opacity="0.6" />
          <line x1="300" y1="294" x2="300" y2="308" stroke="#93c5fd" strokeWidth="2" opacity="0.6" />
          <line x1="370" y1="294" x2="370" y2="308" stroke="#93c5fd" strokeWidth="2" opacity="0.6" />
          <line x1="440" y1="294" x2="440" y2="308" stroke="#93c5fd" strokeWidth="2" opacity="0.6" />

          {/* Grand Columns (Pillars) */}
          {/* Pillar 1 */}
          <rect x="150" y="312" width="22" height="175" rx="3" fill="url(#pillarGrad)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" />
          <rect x="145" y="312" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />
          <rect x="145" y="479" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />

          {/* Pillar 2 */}
          <rect x="210" y="312" width="22" height="175" rx="3" fill="url(#pillarGrad)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" />
          <rect x="205" y="312" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />
          <rect x="205" y="479" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />

          {/* Pillar 3 */}
          <rect x="270" y="312" width="22" height="175" rx="3" fill="url(#pillarGrad)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" />
          <rect x="265" y="312" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />
          <rect x="265" y="479" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />

          {/* Pillar 4 */}
          <rect x="310" y="312" width="22" height="175" rx="3" fill="url(#pillarGrad)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" />
          <rect x="305" y="312" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />
          <rect x="305" y="479" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />

          {/* Pillar 5 */}
          <rect x="370" y="312" width="22" height="175" rx="3" fill="url(#pillarGrad)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" />
          <rect x="365" y="312" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />
          <rect x="365" y="479" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />

          {/* Pillar 6 */}
          <rect x="430" y="312" width="22" height="175" rx="3" fill="url(#pillarGrad)" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" />
          <rect x="425" y="312" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />
          <rect x="425" y="479" width="32" height="8" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" opacity="0.8" />

          {/* Portal / Main University Grand Entrance */}
          <path
            d="M 280 487 L 280 405 C 280 395, 320 395, 320 405 L 320 487 Z"
            fill="#dbeafe"
            stroke="#3b82f6"
            strokeWidth="1.5"
            opacity="0.85"
          />

          {/* Arched windows in background */}
          <path d="M 178 400 C 178 385, 202 385, 202 400 L 202 445 L 178 445 Z" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1" opacity="0.7" />
          <path d="M 398 400 C 398 385, 422 385, 422 400 L 422 445 L 398 445 Z" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1" opacity="0.7" />

          {/* Classical Grand Steps Base */}
          <rect x="100" y="487" width="400" height="16" rx="2" fill="#e0e7ff" stroke="#60a5fa" strokeWidth="1.5" opacity="0.8" />
          <rect x="75" y="503" width="450" height="16" rx="2" fill="#dbeafe" stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" />
          <rect x="50" y="519" width="500" height="20" rx="3" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1.5" opacity="0.6" />

          {/* Campus Courtyard Trees / Landscaping */}
          <path d="M 85 520 C 55 520, 45 470, 75 440 C 70 410, 115 395, 130 425 C 150 410, 175 440, 160 470 C 175 500, 140 520, 85 520 Z" fill="#93c5fd" fillOpacity="0.25" stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" />
          <path d="M 515 520 C 545 520, 555 470, 525 440 C 530 410, 485 395, 470 425 C 450 410, 425 440, 440 470 C 425 500, 460 520, 515 520 Z" fill="#93c5fd" fillOpacity="0.25" stroke="#60a5fa" strokeWidth="1.5" opacity="0.7" />

          {/* Academic Laurel / Stars Floating Accents */}
          <circle cx="160" cy="180" r="3" fill="#3b82f6" opacity="0.4" />
          <circle cx="440" cy="190" r="3" fill="#3b82f6" opacity="0.4" />
          <circle cx="210" cy="120" r="2.5" fill="#6366f1" opacity="0.3" />
          <circle cx="390" cy="120" r="2.5" fill="#6366f1" opacity="0.3" />
        </svg>
      </div>

      {/* Subtle Bottom Caption for Campus Setting */}
      <div className="text-center pt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/80 border border-blue-200/60 text-[11px] font-semibold text-blue-700 tracking-wide uppercase">
          <Sparkles className="w-3 h-3 text-blue-500" />
          Excellence in Campus Placements
        </span>
      </div>
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Configurable campus image URL (can be set from an environment variable or config)
  // Gracefully falls back to SVG campus illustration if null or if loading fails
  const campusImageUrl = null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      const role = (data.user?.role || '').toUpperCase();
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else if (role === 'FACULTY') {
        navigate('/faculty/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#f8faff] via-[#edf3fc] to-[#e4eefb] text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Subtle flowing abstract background shapes */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[30rem] w-[30rem] rounded-full bg-indigo-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-sky-200/35 blur-3xl" />

      {/* Decorative SVG Geometric Lines (Very Subtle Corner Accents) */}
      <svg
        className="pointer-events-none absolute top-0 right-0 w-96 h-96 text-blue-300/20"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="400" cy="0" r="300" stroke="currentColor" strokeWidth="1" strokeDasharray="6 8" />
        <circle cx="400" cy="0" r="200" stroke="currentColor" strokeWidth="1" />
        <circle cx="400" cy="0" r="100" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" />
      </svg>

      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-80 h-80 text-indigo-300/20"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0,400 Q150,250 400,200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
        <path d="M0,350 Q200,250 400,320" stroke="currentColor" strokeWidth="1" />
      </svg>

      {/* Main Container */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center">
        {/* Top Header / Branding */}
        <header className="mb-6 text-center">
          <div className="inline-flex flex-col items-center">
            {/* Cap Icon in Modern Blue Gradient Square */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-4 ring-white/80 transition-transform duration-300 hover:scale-105">
              <GraduationCap className="h-8 w-8" />
            </div>

            {/* Wordmark */}
            <h1 className="mt-3.5 text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="text-[#0f172a]">CAMPUS</span>
              <span className="text-blue-600">PRO</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 max-w-md">
              Smart Placement &amp; Interview Management Platform
            </p>
          </div>
        </header>

        {/* Core Layout: Balanced Multi-Column View */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-8 xl:gap-12">
          
          {/* LEFT COLUMN: Campus-Inspired Visual Illustration (Desktop Only) */}
          <div className="hidden lg:col-span-4 lg:flex lg:flex-col lg:items-center lg:justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white/40 p-3 shadow-lg shadow-blue-900/5 ring-1 ring-white/80 backdrop-blur-sm border border-blue-100/60 transition-all hover:bg-white/60">
              <CampusVisual customImageUrl={campusImageUrl} />
            </div>
          </div>

          {/* CENTER COLUMN: Premium White Login Card */}
          <div className="w-full mx-auto lg:col-span-5 max-w-md">
            <div className="relative rounded-[24px] bg-white p-6 sm:p-8 md:p-9 shadow-[0_20px_50px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.05)] border border-blue-100/80 transition-all">
              
              {/* Card Header */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Sign in to your account
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <ShieldCheck className="w-3 h-3" /> Secure
                  </span>
                </div>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
                  Enter your college credentials to access your portal
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200/80 animate-in fade-in">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Email Field */}
                <div>
                  <label 
                    htmlFor="email"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Email Address
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@campuspro.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between">
                    <label 
                      htmlFor="password"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 py-2.5 pl-10 pr-11 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Sign In Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 px-4 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-600/35 focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Feature Highlights & Handwritten Accent (Desktop Only) */}
          <div className="hidden lg:col-span-3 lg:flex lg:flex-col lg:justify-center space-y-6">
            
            {/* Handwritten Decorative Note */}
            <div className="relative pl-3">
              <div className="flex items-center gap-2 font-handwriting text-2xl font-bold text-blue-600 tracking-wide rotate-[-2deg]">
                <span>Build Your Career With Us</span>
                <span className="text-xl">✨</span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                Your campus gateway to premier recruiters
              </p>
            </div>

            {/* Three Compact Feature Cards */}
            <div className="space-y-3.5">
              
              {/* Highlight 1: Top Companies */}
              <div className="group flex items-start gap-3.5 rounded-2xl bg-white/70 p-3.5 shadow-sm border border-blue-100/70 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:border-blue-200">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-600 group-hover:scale-105 transition-transform">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Top Companies</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Get placed in leading MNCs</p>
                </div>
              </div>

              {/* Highlight 2: Better Opportunities */}
              <div className="group flex items-start gap-3.5 rounded-2xl bg-white/70 p-3.5 shadow-sm border border-blue-100/70 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:border-blue-200">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-600 group-hover:scale-105 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Better Opportunities</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Grow your career</p>
                </div>
              </div>

              {/* Highlight 3: Complete Support */}
              <div className="group flex items-start gap-3.5 rounded-2xl bg-white/70 p-3.5 shadow-sm border border-blue-100/70 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:border-blue-200">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-600 group-hover:scale-105 transition-transform">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Complete Support</h3>
                  <p className="text-xs text-slate-500 mt-0.5">From preparation to placement</p>
                </div>
              </div>

            </div>

            {/* Subtle verification badge */}
            <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500 pl-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Verified university recruitment network</span>
            </div>
          </div>

        </div>

        {/* Lower Content & Footer Links */}
        <footer className="mt-8 text-center space-y-3">
          <p className="text-xs sm:text-sm text-slate-600">
            Need an account?{' '}
            <Link 
              to="/register" 
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition"
            >
              Register here
            </Link>
          </p>

          <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
            <Link to="/privacy" className="hover:text-slate-600 transition">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-600 transition">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Login;

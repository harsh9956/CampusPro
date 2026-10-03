import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { GraduationCap, Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await API.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to send reset link. Please verify your email and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setIsSubmitted(false);
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo Banner */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            CAMPUS<span className="text-blue-500">PRO</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-300">
            Smart Placement & Interview Management Platform
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white p-8 shadow-2xl border border-slate-100">
          {!isSubmitted ? (
            <>
              {/* Header */}
              <div className="mb-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition mb-4"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                </Link>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Forgot Password?</h2>
                    <p className="text-xs text-slate-500">Reset your portal password</p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  Enter your registered college email address and we'll send you a secure link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Enter Email
                  </label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      Send Reset Link <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                <p className="text-xs text-slate-500">
                  Remember your password?{' '}
                  <Link to="/login" className="font-bold text-blue-600 hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* Success State - Registered Email Confirmation */
            <div className="text-center py-2 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Check Your Email</h2>
                <p className="mt-1 text-xs text-slate-500">Password reset link sent successfully</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 text-left space-y-2">
                <p className="text-xs text-slate-600">
                  We have dispatched a secure password reset link to your registered email:
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-slate-200 text-xs font-bold text-slate-800 break-all">
                  <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>{email}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  ⏱️ The link will remain valid for <strong>60 minutes</strong>. Please check your inbox and spam folder.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition"
                >
                  Return to Login
                </Link>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1"
                >
                  Didn't receive email? Try another address
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Need help? Contact your campus{' '}
          <span className="font-semibold text-slate-300">TPO Administrator</span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;

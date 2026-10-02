import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import {
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  // Verification state
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Success state
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Verify token on mount
  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      try {
        const response = await API.get(`/auth/verify-reset-token/${token}`);
        if (isMounted) {
          setTokenValid(true);
          setUserEmail(response.data?.email || '');
          setVerifying(false);
        }
      } catch (err) {
        if (isMounted) {
          setTokenValid(false);
          setVerificationError(
            err.response?.data?.message ||
            'This password reset link is invalid or has expired.'
          );
          setVerifying(false);
        }
      }
    };

    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
      setTokenValid(false);
      setVerificationError('No reset token was provided in the link.');
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Countdown timer on password updated
  useEffect(() => {
    if (!passwordUpdated) return;

    if (countdown <= 0) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [passwordUpdated, countdown, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('New password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('New password and confirm password do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await API.post(`/auth/reset-password/${token}`, {
        password,
        confirmPassword
      });
      setPasswordUpdated(true);
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        'Failed to reset password. The link may have expired.'
      );
    } finally {
      setSubmitting(false);
    }
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
          {/* Loading verification */}
          {verifying ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="h-9 w-9 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Verifying Reset Link...
              </p>
            </div>
          ) : !tokenValid ? (
            /* Invalid or Expired Token State */
            <div className="text-center py-2 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-lg shadow-rose-500/10">
                <AlertCircle className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Link Invalid or Expired</h2>
                <p className="mt-1 text-xs text-slate-500">{verificationError}</p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-left text-xs text-amber-800 space-y-1">
                <p className="font-bold">Why did this happen?</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-700">
                  <li>Password reset links expire after 60 minutes.</li>
                  <li>Each link can only be used once for security.</li>
                  <li>A newer reset request might have invalidated this link.</li>
                </ul>
              </div>

              <div className="pt-2 space-y-2">
                <Link
                  to="/forgot-password"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition"
                >
                  Request New Reset Link
                </Link>

                <Link
                  to="/login"
                  className="block text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-1"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          ) : passwordUpdated ? (
            /* Password Updated Success State */
            <div className="text-center py-2 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Password Updated!</h2>
                <p className="mt-1 text-xs text-slate-500">Your account credentials have been updated</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 text-center space-y-1">
                <p className="text-xs text-slate-700 font-medium">
                  Your password has been changed successfully. You can now sign in to CampusPro with your new password.
                </p>
                <p className="text-[11px] font-semibold text-blue-600 pt-1">
                  Redirecting to login in {countdown}s...
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition"
                >
                  Login Now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            /* Reset Password Form */
            <>
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
                    <p className="text-xs text-slate-500">Create a secure new password</p>
                  </div>
                </div>

                {userEmail && (
                  <p className="mt-3 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/70">
                    Updating credentials for <strong className="text-slate-900">{userEmail}</strong>
                  </p>
                )}
              </div>

              {formError && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password 👁 */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password 👁 */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Live validation checklist */}
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${password.length >= 6 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={password.length >= 6 ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                      At least 6 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${confirmPassword && password === confirmPassword ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className={confirmPassword && password === confirmPassword ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                      Passwords match
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition disabled:opacity-50 mt-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      Update Password <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition">
                  Cancel and return to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

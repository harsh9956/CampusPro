import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Lock, Mail, User, BookOpen, Award, ArrowRight } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    enrollmentNo: '',
    department: 'CSE',
    branch: 'Computer Science & Engineering',
    year: 4,
    cgpa: 8.0,
    backlogs: 0
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(formData);
      if (data.user.role === 'admin') navigate('/admin/dashboard');
      else if (data.user.role === 'faculty') navigate('/faculty/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-white">Create your CampusPro Account</h1>
          <p className="text-xs text-slate-300">Join the placement & interview preparation platform</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 uppercase">Full Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Rahul Sharma"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="rahul@college.edu"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 uppercase">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 uppercase">Account Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty Coordinator</option>
                <option value="admin">TPO Admin</option>
              </select>
            </div>

            {formData.role === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Enrollment No</label>
                    <input
                      type="text"
                      name="enrollmentNo"
                      value={formData.enrollmentNo}
                      onChange={handleChange}
                      placeholder="EN2023CSE042"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                    >
                      <option value="CSE">CSE</option>
                      <option value="IT">IT</option>
                      <option value="ECE">ECE</option>
                      <option value="AI-ML">AI-ML</option>
                      <option value="ME">ME</option>
                      <option value="CE">CE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Current CGPA</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      name="cgpa"
                      value={formData.cgpa}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 uppercase">Active Backlogs</label>
                    <input
                      type="number"
                      min="0"
                      name="backlogs"
                      value={formData.backlogs}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition"
            >
              {loading ? 'Creating Account...' : 'Register'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400">
          Already registered? <Link to="/login" className="font-bold text-blue-400 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

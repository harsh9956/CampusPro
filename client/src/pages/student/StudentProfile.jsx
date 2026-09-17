import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Save, CheckCircle2 } from 'lucide-react';
import API from '../../services/api';

const StudentProfile = () => {
  const { user, profile, updateProfileState } = useAuth();
  const [formData, setFormData] = useState({
    cgpa: profile?.cgpa || 8.5,
    backlogs: profile?.backlogs || 0,
    skills: profile?.skills ? profile.skills.join(', ') : 'Java, React, SQL, DSA',
    phone: profile?.phone || '+91 91234 56789',
    resumeUrl: profile?.resumeUrl || 'https://drive.google.com/my-resume.pdf',
    bio: profile?.bio || 'Enthusiastic full-stack developer preparing for campus drives.'
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data } = await API.put('/users/student-profile', formData);
      updateProfileState(data.student);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Placement Profile</h1>
        <p className="text-xs text-slate-500 font-medium">Keep your CGPA, backlogs, and skills updated for the automated Eligibility Engine</p>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-500 uppercase text-[10px]">Enrollment Number</label>
              <input
                type="text"
                disabled
                value={profile?.enrollmentNo || 'EN2023CSE042'}
                className="mt-1 w-full rounded-xl bg-slate-100 border border-slate-200 p-2.5 font-bold text-slate-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 uppercase text-[10px]">Department</label>
              <input
                type="text"
                disabled
                value={profile?.department || 'CSE'}
                className="mt-1 w-full rounded-xl bg-slate-100 border border-slate-200 p-2.5 font-bold text-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 uppercase">Current Cumulative CGPA</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                required
                value={formData.cgpa}
                onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Active Backlogs Count</label>
              <input
                type="number"
                min="0"
                required
                value={formData.backlogs}
                onChange={(e) => setFormData({ ...formData, backlogs: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase">Technical Skills (Comma separated)</label>
            <input
              type="text"
              required
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 uppercase">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Resume Document URL</label>
              <input
                type="text"
                value={formData.resumeUrl}
                onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase">Profile Bio / Summary</label>
            <textarea
              rows="3"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-semibold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentProfile;

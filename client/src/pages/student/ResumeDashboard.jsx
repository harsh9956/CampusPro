import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Edit,
  Copy,
  Trash2,
  Download,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle,
  FileCode,
  Layers
} from 'lucide-react';
import API from '../../services/api';

const ResumeDashboard = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newResumeName, setNewResumeName] = useState('Frontend Developer Resume');
  const [newTargetRole, setNewTargetRole] = useState('Frontend Developer');
  const [creating, setCreating] = useState(false);

  // Delete Confirmation Modal State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/resumes');
      setResumes(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load resumes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create Resume Handler
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await API.post('/resumes', {
        resumeName: newResumeName,
        targetRole: newTargetRole,
        template: 'Classic'
      });
      setShowCreateModal(false);
      navigate(`/student/resume-builder/edit/${data._id}`);
    } catch (err) {
      console.error(err);
      setError('Failed to create resume.');
    } finally {
      setCreating(false);
    }
  };

  // Duplicate Resume Handler
  const handleDuplicate = async (id) => {
    try {
      const { data } = await API.post(`/resumes/${id}/duplicate`);
      setResumes([data, ...resumes]);
    } catch (err) {
      console.error(err);
      alert('Failed to duplicate resume.');
    }
  };

  // Delete Resume Handler
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await API.delete(`/resumes/${deleteId}`);
      setResumes(resumes.filter((r) => r._id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete resume.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" /> CampusPro Resume Builder
          </div>
          <h1 className="mt-2 text-3xl font-black text-slate-900 tracking-tight">My Resumes</h1>
          <p className="text-sm text-slate-500 font-medium">
            Create, edit, customize, and download role-specific ATS-friendly resumes for placement drives.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> + Create New Resume
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      {/* Resumes Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600" />
          <p>Loading your resumes...</p>
        </div>
      ) : resumes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Resumes Created Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">
              Create your first tailored resume for placement drives. Build role-specific resumes for Frontend, Backend, Data Analyst, or Software Engineering roles.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Your First Resume
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div
              key={resume._id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                    {resume.targetRole || 'Software Engineer'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    {resume.template || 'Classic'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                  {resume.resumeName}
                </h3>

                <p className="text-[11px] font-medium text-slate-400">
                  Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/student/resume-builder/edit/${resume._id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(resume._id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Duplicate Resume"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => navigate(`/student/resume-builder/edit/${resume._id}`)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    title="Preview & Export PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setDeleteId(resume._id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Delete Resume"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE RESUME MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" /> Create New Resume
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Resume Name</label>
                <input
                  type="text"
                  required
                  value={newResumeName}
                  onChange={(e) => setNewResumeName(e.target.value)}
                  placeholder="e.g. Frontend Developer Resume"
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider block mb-1">Target Job Role</label>
                <select
                  value={newTargetRole}
                  onChange={(e) => setNewTargetRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Full Stack Developer">Full Stack Developer</option>
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                  <option value="QA / Test Engineer">QA / Test Engineer</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-2"
                >
                  {creating ? 'Creating...' : 'Create & Edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Resume?</h3>
            <p className="text-xs text-slate-600 font-medium">
              Are you sure you want to delete this resume? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 text-xs">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeDashboard;

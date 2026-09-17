import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Edit, ExternalLink, MapPin } from 'lucide-react';
import API from '../../services/api';

const CompanyManager = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: 'Software & IT Services',
    location: 'Noida / NCR',
    description: '',
    contactEmail: ''
  });

  const fetchCompanies = async () => {
    try {
      const { data } = await API.get('/companies');
      setCompanies(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/companies', formData);
      setShowModal(false);
      setFormData({ name: '', website: '', industry: 'Software & IT Services', location: 'Noida / NCR', description: '', contactEmail: '' });
      fetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company profile?')) {
      try {
        await API.delete(`/companies/${id}`);
        fetchCompanies();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Company Directory</h1>
          <p className="text-xs text-slate-500 font-medium">Manage recruiting partners and corporate profiles</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" /> Add New Company
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-xs font-medium space-y-3">
          <Building2 className="h-8 w-8 mx-auto text-slate-300" />
          <p>No companies added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (
            <div key={c._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{c.industry}</span>
                    <h3 className="text-base font-extrabold text-slate-900">{c.name}</h3>
                  </div>
                  <button onClick={() => handleDelete(c._id)} className="text-rose-400 hover:text-rose-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-600 line-clamp-2">{c.description || 'No description provided.'}</p>

                <div className="mt-4 space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{c.location}</span>
                  </div>
                  {c.website && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                      <a href={c.website} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline truncate">
                        {c.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                  {c.status} Recruiter
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Company Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Add Recruiting Company</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase">Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase">Industry</label>
                  <input
                    type="text"
                    required
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase">Location</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Website URL</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://company.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase">Company Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 font-bold text-white shadow-md">Create Company</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyManager;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { Users, Search, Filter } from 'lucide-react';
import API from '../../services/api';

const MyStudents = () => {
  const { profile } = useAuth();
  const { academicYear } = useAcademicYear();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState('0');

  useEffect(() => {
    API.get(`/users/students?department=${profile?.department || 'CSE'}&academicYear=${academicYear}`)
      .then(res => setStudents(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [academicYear, profile]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.user?.name?.toLowerCase().includes(search.toLowerCase()) || s.enrollmentNo?.toLowerCase().includes(search.toLowerCase());
    const matchesCgpa = s.cgpa >= Number(minCgpaFilter);
    return matchesSearch && matchesCgpa;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Department Students Directory</h1>
        <p className="text-xs text-slate-500 font-medium">Department: {profile?.department || 'CSE'} • Academic Year: {academicYear}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or enrollment number..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs font-medium focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div className="w-48">
          <select
            value={minCgpaFilter}
            onChange={(e) => setMinCgpaFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold focus:outline-none"
          >
            <option value="0">All CGPA Scores</option>
            <option value="6.0">Min CGPA 6.0+</option>
            <option value="7.0">Min CGPA 7.0+</option>
            <option value="8.0">Min CGPA 8.0+</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Student Name</th>
              <th className="p-4">Enrollment No</th>
              <th className="p-4">Department</th>
              <th className="p-4">CGPA</th>
              <th className="p-4">Active Backlogs</th>
              <th className="p-4">Skills</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8">Loading students...</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-slate-400">No students found matching filters</td></tr>
            ) : (
              filteredStudents.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{s.user?.name}</td>
                  <td className="p-4 text-slate-600 font-semibold">{s.enrollmentNo}</td>
                  <td className="p-4"><span className="bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full">{s.department}</span></td>
                  <td className="p-4 font-black text-emerald-700">{s.cgpa}</td>
                  <td className="p-4 text-slate-700">{s.backlogs}</td>
                  <td className="p-4 text-slate-500">{s.skills?.join(', ')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyStudents;

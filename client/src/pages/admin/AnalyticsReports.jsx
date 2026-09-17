import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../context/AcademicYearContext';
import { FileText, Download, BarChart3, CheckCircle2, Building2 } from 'lucide-react';
import API from '../../services/api';

const AnalyticsReports = () => {
  const { academicYear } = useAcademicYear();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/analytics/dashboard?academicYear=${academicYear}`)
      .then(res => setAnalytics(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [academicYear]);

  const handleExportCSV = () => {
    const csvContent = `Academic Year,Total Students,Total Companies,Total Drives,Selected Students,Placement Ratio (%)\n${academicYear},${analytics?.totalStudents || 0},${analytics?.totalCompanies || 0},${analytics?.totalDrives || 0},${analytics?.totalSelected || 0},${analytics?.placementRatio || 0}%\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CampusPro_Placement_Report_${academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Placement Reports & Analytics</h1>
          <p className="text-xs text-slate-500 font-medium">Export placement summary reports for Academic Year {academicYear}</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition"
        >
          <Download className="h-4 w-4" /> Export CSV Placement Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Placement Success Ratio</span>
          <h3 className="text-3xl font-black text-blue-600 mt-1">{analytics?.placementRatio || 0}%</h3>
          <p className="text-xs text-slate-400 mt-1">{analytics?.totalSelected || 0} placed out of {analytics?.totalStudents || 0} students</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Active Campus Drives</span>
          <h3 className="text-3xl font-black text-purple-600 mt-1">{analytics?.totalDrives || 0}</h3>
          <p className="text-xs text-slate-400 mt-1">Academic Year {academicYear}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Recruiting Partners</span>
          <h3 className="text-3xl font-black text-amber-600 mt-1">{analytics?.totalCompanies || 0}</h3>
          <p className="text-xs text-slate-400 mt-1">Active Corporate Partners</p>
        </div>
      </div>

      {/* Branch Breakdown Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
          Department-Wise Placement Breakdown ({academicYear})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Department / Branch</th>
              <th className="p-4">Placed Students Count</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {analytics?.placementByBranch?.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-900">{item.branch}</td>
                <td className="p-4 font-black text-blue-700">{item.placedCount} Candidates</td>
                <td className="p-4"><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Active Selections</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsReports;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAcademicYear } from '../../context/AcademicYearContext';
import EligibilityBadge from '../../components/EligibilityBadge';
import {
  Briefcase,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  ExternalLink,
  Download,
  X
} from 'lucide-react';
import API from '../../services/api';

const EligibleDrives = () => {
  const { user } = useAuth();
  const { academicYear } = useAcademicYear();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchDrives = async () => {
    try {
      const { data } = await API.get(`/drives?academicYear=${academicYear}`);
      setDrives(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [academicYear]);

  const handleInternalApply = async (driveId) => {
    setApplyingId(driveId);
    setMessage(null);
    try {
      const { data } = await API.post(`/applications/${driveId}/apply`);
      setMessage({ type: 'success', text: data.message });
      fetchDrives();
      setSelectedDrive(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Application failed' });
    } finally {
      setApplyingId(null);
    }
  };

  const handleOpenJdPdf = (jdObj) => {
    if (!jdObj || !jdObj.fileUrl) return;
    const fullUrl = jdObj.fileUrl.startsWith('http') ? jdObj.fileUrl : `http://localhost:5000${jdObj.fileUrl}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenExternalApply = (applyLink) => {
    if (!applyLink) return;
    const formattedUrl = applyLink.startsWith('http') ? applyLink : `https://${applyLink}`;
    window.open(formattedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Placement Drives</h1>
          <p className="text-xs text-slate-500 font-medium">
            Placement opportunities evaluated automatically for Academic Year {academicYear}
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-xs font-bold ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
        </div>
      ) : drives.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400">
          No placement drives listed for Academic Year {academicYear}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drives.map((drive) => {
            const hasJdFile = Boolean(drive.jobDescription?.fileUrl);
            const hasApplyLink = Boolean(drive.applyLink);

            return (
              <div key={drive._id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{drive.company?.name}</span>
                      <h3 className="text-base font-bold text-slate-900">{drive.jobRole}</h3>
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-black text-sm">
                      {drive.company?.name?.charAt(0)}
                    </div>
                  </div>

                  <div className="mt-3 inline-block rounded-lg bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 border border-emerald-100">
                    {drive.package}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{drive.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Drive Date: {new Date(drive.driveDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-rose-400" />
                      <span className="font-medium text-rose-600">Deadline: {new Date(drive.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <EligibilityBadge eligibility={drive.eligibility} />
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedDrive(drive)}
                      className="text-xs font-bold text-slate-600 hover:text-blue-600"
                    >
                      View Details & Process
                    </button>

                    {hasJdFile && (
                      <button
                        onClick={() => handleOpenJdPdf(drive.jobDescription)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5 text-red-500" /> View JD PDF
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {hasApplyLink ? (
                      <button
                        onClick={() => handleOpenExternalApply(drive.applyLink)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
                      >
                        Apply Now → <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold italic">
                        Application link not available.
                      </span>
                    )}

                    {!drive.isApplied && drive.eligibility?.eligible && (
                      <button
                        disabled={applyingId === drive._id}
                        onClick={() => handleInternalApply(drive._id)}
                        className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                        title="Register in CampusPro Application Tracker"
                      >
                        {applyingId === drive._id ? 'Saving...' : 'Track Application'}
                      </button>
                    )}

                    {drive.isApplied && (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drive Detail Modal */}
      {selectedDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{selectedDrive.company?.name}</span>
                <h2 className="text-xl font-black text-slate-900">{selectedDrive.jobRole}</h2>
                <span className="text-xs font-bold text-emerald-600">Package: {selectedDrive.package}</span>
              </div>
              <button
                onClick={() => setSelectedDrive(null)}
                className="text-slate-400 font-bold hover:text-slate-600 text-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Job Description Section */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Job Description</h4>
              {selectedDrive.jobDescription?.fileUrl ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden pr-2 text-xs">
                    <FileText className="h-5 w-5 text-red-500 shrink-0" />
                    <span className="font-bold text-slate-800 truncate">
                      📄 {selectedDrive.jobDescription.fileName || 'Company-Job-Description.pdf'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenJdPdf(selectedDrive.jobDescription)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-xs hover:bg-red-700 transition shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" /> Download JD
                  </button>
                </div>
              ) : selectedDrive.jobDescriptionText || typeof selectedDrive.jobDescription === 'string' ? (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedDrive.jobDescriptionText || selectedDrive.jobDescription}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">Job Description not available.</p>
              )}
            </div>

            {/* Selection Process */}
            <div>
              {(() => {
                const roundsList = (Array.isArray(selectedDrive.selectionProcess) && selectedDrive.selectionProcess.length > 0)
                  ? selectedDrive.selectionProcess
                  : (Array.isArray(selectedDrive.selectionRounds) ? selectedDrive.selectionRounds : []);

                return (
                  <>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <span>Selection Process</span>
                      {roundsList.length > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {roundsList.length} {roundsList.length === 1 ? 'Round' : 'Rounds'} Configured
                        </span>
                      )}
                    </h4>

                    {roundsList.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-center text-amber-900 text-xs font-semibold space-y-1">
                        <p className="font-extrabold flex items-center justify-center gap-1.5 text-amber-800">
                          📢 Selection process will be announced by the T&P Department.
                        </p>
                        <p className="text-[11px] text-amber-700 font-medium">
                          Selection process not added yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {roundsList.map((round, idx) => {
                          const orderNum = String(round.order || round.roundNumber || idx + 1).padStart(2, '0');
                          const roundName = round.roundName || round.name || `Round ${idx + 1}`;
                          const roundType = round.roundType || 'General Round';
                          const description = round.description || '';
                          const mode = round.mode || 'Online';
                          const duration = round.duration ? `${round.duration} minutes` : null;
                          const dateStr = round.date ? new Date(round.date).toLocaleDateString() : null;

                          return (
                            <React.Fragment key={idx}>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 relative shadow-xs">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                                      {orderNum}
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-extrabold text-slate-900 leading-tight">{roundName}</h5>
                                      <span className="text-[11px] font-bold text-blue-600">{roundType}</span>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-xs">
                                    {mode} {duration ? `• ${duration}` : ''}
                                  </span>
                                </div>

                                {description && (
                                  <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white p-2.5 rounded-xl border border-slate-100">
                                    {description}
                                  </p>
                                )}

                                {dateStr && (
                                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 pt-1">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Scheduled Date: <strong className="text-slate-800">{dateStr}</strong></span>
                                  </div>
                                )}
                              </div>

                              {idx < roundsList.length - 1 && (
                                <div className="flex justify-center text-slate-300 py-0.5">
                                  <span className="text-base font-bold text-blue-400">↓</span>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Eligibility Criteria */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Eligibility Criteria</h4>
              <div className="text-xs text-slate-600 space-y-1 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                <p>• Min CGPA: <span className="font-bold">{selectedDrive.minCgpa}</span></p>
                <p>• Max Active Backlogs Allowed: <span className="font-bold">{selectedDrive.maxBacklogs}</span></p>
                <p>• Eligible Branches: <span className="font-bold">{selectedDrive.eligibleBranches?.join(', ')}</span></p>
              </div>
            </div>

            {/* Official Apply Link / Apply Now */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Official Application Link</h4>
              {selectedDrive.applyLink ? (
                <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-blue-900 block truncate max-w-md">{selectedDrive.applyLink}</span>
                    <span className="text-[10px] text-blue-600 font-medium">Opens external company application portal in a new browser tab</span>
                  </div>
                  <button
                    onClick={() => handleOpenExternalApply(selectedDrive.applyLink)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition shrink-0"
                  >
                    Apply Now → <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Application link not available.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedDrive(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EligibleDrives;

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, GraduationCap, Lock, AlertCircle } from 'lucide-react';

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-base font-extrabold text-slate-900">CAMPUS<span className="text-blue-600">PRO</span></span>
          </div>
        </div>

        {/* Legal Review Notice Banner */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold uppercase tracking-wider block mb-0.5">DRAFT FOR INSTITUTIONAL LEGAL REVIEW — CAMPUSPRO V1</span>
            These terms define the conditions of acceptable institutional use for the CampusPro platform. Institutions must adjust specific disciplinary and placement policies in coordination with official university rules before production deployment.
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12 space-y-8 text-slate-700 text-sm leading-relaxed">
          <div>
            <span className="inline-block rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold uppercase mb-2">
              Platform Terms of Use
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Terms &amp; Conditions</h1>
            <p className="mt-1 text-xs text-slate-500">Effective Date: Academic Session 2026–2027 | Version 1.0</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing or creating an account on CampusPro, students, faculty coordinators, and placement administrators agree to comply with these Terms &amp; Conditions and all applicable institutional placement guidelines established by the Training &amp; Placement Cell.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Student Academic Integrity &amp; Verification</h2>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                Truthful Academic Reporting Mandate
              </div>
              <p className="text-slate-600">
                Students must provide strictly accurate, up-to-date academic metrics including current CGPA, 10th percentage, 12th percentage, and active backlog status. Submitting falsified academic records or altered resume documents is grounds for immediate disqualification from all campus placement drives and institutional disciplinary action.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Placement Drive Applications &amp; Attendance</h2>
            <p>
              Applying for a corporate placement drive constitutes a formal commitment to participate in all scheduled evaluation rounds (written/online tests, technical interviews, and HR discussions). Failure to attend an applied drive without prior approved justification from the TPO may result in placement de-registration.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Account Security &amp; Access Credentials</h2>
            <p>
              Users are solely responsible for maintaining the confidentiality of their login credentials. Any unauthorized access or suspected credential compromise must be reported immediately to the TPO office. Account sharing across students or impersonating another student during assessments is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Acceptable Use &amp; System Integrity</h2>
            <p>Users shall not:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>Attempt to bypass rate limits, access control boundaries, or security authorization guards.</li>
              <li>Upload malicious code, executables, scripts, or corrupted files to document endpoints.</li>
              <li>Scrape candidate records, questions, or corporate drive data via unauthorized automated scripts.</li>
              <li>Interfere with background job queues, email delivery workers, or server performance.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. Modifications &amp; Governance</h2>
            <p className="text-xs">
              The Training &amp; Placement Cell reserves the right to amend platform eligibility parameters, operational rules, or drive timelines in alignment with corporate recruiter requirements and university guidelines.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4">
          <p>© {new Date().getFullYear()} CampusPro. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="font-semibold text-blue-600 hover:underline">Privacy Policy</Link>
            <Link to="/login" className="font-semibold text-slate-600 hover:underline">Portal Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;

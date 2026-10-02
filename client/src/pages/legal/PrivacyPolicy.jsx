import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, GraduationCap, Lock, CheckCircle2 } from 'lucide-react';

const PrivacyPolicy = () => {
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
            This privacy policy accurately documents the specific technical and personal data processed by the CampusPro Training &amp; Placement platform. It must be reviewed and customized by your institution's legal counsel prior to formal publication.
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12 space-y-8 text-slate-700 text-sm leading-relaxed">
          <div>
            <span className="inline-block rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold uppercase mb-2">
              Privacy &amp; Data Governance
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
            <p className="mt-1 text-xs text-slate-500">Effective Date: Academic Session 2026–2027 | Version 1.0</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Institutional Purpose</h2>
            <p>
              CampusPro operates solely as an institutional Training and Placement management platform designed to automate student recruitment eligibility, corporate drive scheduling, interview feedback, and mock assessments. We do not sell, monetize, or commercialize student data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Categories of Information Collected</h2>
            <p>CampusPro processes only the information necessary for verification and recruitment:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
              <li><strong>Student Academic Profile:</strong> Full name, institutional email address, enrollment number, department, section, academic year, CGPA, 10th percentage, 12th percentage, and active backlog count.</li>
              <li><strong>Contact &amp; Demographic Data:</strong> Date of birth, student phone number, parent phone number, permanent address, temporary address, and postal PIN codes.</li>
              <li><strong>Placement &amp; Resume Documents:</strong> Resumes and portfolio links uploaded by candidates (stored in secured Cloudinary / institutional storage).</li>
              <li><strong>Recruitment Activity:</strong> Drive applications, selection round outcomes, mock assessment answers, and submitted interview experiences.</li>
              <li><strong>Administrative Logs:</strong> Security audit logs including administrator actions, timestamps, and request IDs.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Authentication &amp; Tracking Policy</h2>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Zero Non-Essential or Marketing Cookies
              </div>
              <p className="text-slate-600">
                CampusPro uses only cryptographically signed JSON Web Tokens (JWT) stored in browser storage strictly for session authentication. The application does not deploy advertising trackers, third-party marketing beacons, or cross-site tracking cookies.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Data Access &amp; Role-Based Authorization</h2>
            <p>
              Information within CampusPro is strictly isolated via Role-Based Access Control (RBAC):
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li><strong>Students:</strong> Can view and update their own academic profile, view eligible drives, submit applications, and access their own mock test scores.</li>
              <li><strong>Faculty Coordinators:</strong> Can view only students and placement results belonging to their assigned academic department.</li>
              <li><strong>TPO Administrators:</strong> Manage corporate drives, verify eligibility criteria, and export placement rosters for accredited institutional reporting.</li>
              <li><strong>Super Administrators:</strong> Maintain institutional academic years, lifecycle policies, and audit compliance.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Data Retention &amp; Academic Year Lifecycle</h2>
            <p>
              Student records are bound to their respective Academic Year. Historical academic year data is maintained in a read-only state for institutional compliance and verification. Authorized Super Administrators may perform cascaded purge of historical records strictly in accordance with institutional data retention schedules.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">6. Contact Information</h2>
            <p className="text-xs">
              For inquiries regarding personal data processing or placement records, contact your institution's Training and Placement Cell or Data Protection Officer via your campus administration office.
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4">
          <p>© {new Date().getFullYear()} CampusPro. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="font-semibold text-blue-600 hover:underline">Terms of Service</Link>
            <Link to="/login" className="font-semibold text-slate-600 hover:underline">Portal Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

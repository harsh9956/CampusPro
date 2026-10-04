import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Reusable Loading Fallback for Suspense
const PageLoadingSkeleton = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-3">
    <div className="h-9 w-9 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Page...</p>
  </div>
);

// Route-Level Lazy Loading (Code Splitting)
// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Unauthorized = lazy(() => import('./pages/auth/Unauthorized'));
const NotFound = lazy(() => import('./pages/auth/NotFound'));
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./pages/legal/TermsAndConditions'));
import { initAnalytics } from './services/analyticsService';

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const EligibleDrives = lazy(() => import('./pages/student/EligibleDrives'));
const MyApplications = lazy(() => import('./pages/student/MyApplications'));
const QuestionBank = lazy(() => import('./pages/student/QuestionBank'));
const MockTests = lazy(() => import('./pages/student/MockTests'));
const InterviewExperiences = lazy(() => import('./pages/student/InterviewExperiences'));
const PrepRoadmap = lazy(() => import('./pages/student/PrepRoadmap'));
const ResumeAnalyzer = lazy(() => import('./pages/student/ResumeAnalyzer'));
const ResumeDashboard = lazy(() => import('./pages/student/ResumeDashboard'));
const ResumeEditor = lazy(() => import('./pages/student/ResumeEditor'));

// Faculty Pages
const FacultyDashboard = lazy(() => import('./pages/faculty/FacultyDashboard'));
const MyStudents = lazy(() => import('./pages/faculty/MyStudents'));
const FacultyMockTests = lazy(() => import('./pages/faculty/FacultyMockTests'));
const FacultyQuestionBank = lazy(() => import('./pages/faculty/FacultyQuestionBank'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const CompanyManager = lazy(() => import('./pages/admin/CompanyManager'));
const DriveManager = lazy(() => import('./pages/admin/DriveManager'));
const ApplicationManager = lazy(() => import('./pages/admin/ApplicationManager'));
const AnalyticsReports = lazy(() => import('./pages/admin/AnalyticsReports'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const AdminExperiences = lazy(() => import('./pages/admin/AdminExperiences'));
const FacultyManager = lazy(() => import('./pages/admin/FacultyManager'));

// App Layout Shell
const LayoutShell = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Auto-close mobile drawer when navigating to a new route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-x-hidden">
      <Navbar onToggleSidebar={() => setMobileOpen(prev => !prev)} />
      <div className="flex flex-1 min-w-0">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          <Suspense fallback={<PageLoadingSkeleton />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// Root Redirect Helper
const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const role = (user.role || '').toUpperCase();
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'FACULTY') return <Navigate to="/faculty/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <AuthProvider>
      <AcademicYearProvider>
        <Router>
          <Suspense fallback={<PageLoadingSkeleton />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsAndConditions />} />

              {/* Root Route Redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Student Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                <Route path="/student/dashboard" element={<LayoutShell><StudentDashboard /></LayoutShell>} />
                <Route path="/student/profile" element={<LayoutShell><StudentProfile /></LayoutShell>} />
                <Route path="/student/drives" element={<LayoutShell><EligibleDrives /></LayoutShell>} />
                <Route path="/student/applications" element={<LayoutShell><MyApplications /></LayoutShell>} />
                <Route path="/student/questions" element={<LayoutShell><QuestionBank /></LayoutShell>} />
                <Route path="/student/mock-tests" element={<LayoutShell><MockTests /></LayoutShell>} />
                <Route path="/student/experiences" element={<LayoutShell><InterviewExperiences /></LayoutShell>} />
                <Route path="/student/prep-roadmap" element={<LayoutShell><PrepRoadmap /></LayoutShell>} />
                <Route path="/student/resume-builder" element={<LayoutShell><ResumeDashboard /></LayoutShell>} />
                <Route path="/student/resume-builder/edit/:id" element={<LayoutShell><ResumeEditor /></LayoutShell>} />
                <Route path="/student/resume-analyzer" element={<LayoutShell><ResumeAnalyzer /></LayoutShell>} />
              </Route>

              {/* Faculty Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['FACULTY']} />}>
                <Route path="/faculty/dashboard" element={<LayoutShell><FacultyDashboard /></LayoutShell>} />
                <Route path="/faculty/students" element={<LayoutShell><MyStudents /></LayoutShell>} />
                <Route path="/faculty/drives" element={<LayoutShell><EligibleDrives /></LayoutShell>} />
                <Route path="/faculty/results" element={<LayoutShell><ApplicationManager /></LayoutShell>} />
                <Route path="/faculty/questions" element={<LayoutShell><FacultyQuestionBank /></LayoutShell>} />
                <Route path="/faculty/mock-tests" element={<LayoutShell><FacultyMockTests /></LayoutShell>} />
                <Route path="/faculty/experiences" element={<LayoutShell><AdminExperiences /></LayoutShell>} />
              </Route>

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin/dashboard" element={<LayoutShell><AdminDashboard /></LayoutShell>} />
                <Route path="/admin/companies" element={<LayoutShell><CompanyManager /></LayoutShell>} />
                <Route path="/admin/drives" element={<LayoutShell><DriveManager /></LayoutShell>} />
                <Route path="/admin/faculty" element={<LayoutShell><FacultyManager /></LayoutShell>} />
                <Route path="/admin/students" element={<LayoutShell><MyStudents /></LayoutShell>} />
                <Route path="/admin/applications" element={<LayoutShell><ApplicationManager /></LayoutShell>} />
                <Route path="/admin/analytics" element={<LayoutShell><AnalyticsReports /></LayoutShell>} />
                <Route path="/admin/questions" element={<LayoutShell><FacultyQuestionBank /></LayoutShell>} />
                <Route path="/admin/mock-tests" element={<LayoutShell><FacultyMockTests /></LayoutShell>} />
                <Route path="/admin/experiences" element={<LayoutShell><AdminExperiences /></LayoutShell>} />
                <Route path="/admin/audit-logs" element={<LayoutShell><AuditLogs /></LayoutShell>} />
              </Route>

              {/* Fallback Catch-All Custom 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AcademicYearProvider>
    </AuthProvider>
  );
}

export default App;

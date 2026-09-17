import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AcademicYearProvider } from './context/AcademicYearContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import EligibleDrives from './pages/student/EligibleDrives';
import MyApplications from './pages/student/MyApplications';
import QuestionBank from './pages/student/QuestionBank';
import MockTests from './pages/student/MockTests';
import InterviewExperiences from './pages/student/InterviewExperiences';
import PrepRoadmap from './pages/student/PrepRoadmap';
import ResumeAnalyzer from './pages/student/ResumeAnalyzer';
import ResumeDashboard from './pages/student/ResumeDashboard';
import ResumeEditor from './pages/student/ResumeEditor';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import MyStudents from './pages/faculty/MyStudents';
import FacultyMockTests from './pages/faculty/FacultyMockTests';
import FacultyQuestionBank from './pages/faculty/FacultyQuestionBank';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CompanyManager from './pages/admin/CompanyManager';
import DriveManager from './pages/admin/DriveManager';
import ApplicationManager from './pages/admin/ApplicationManager';
import AnalyticsReports from './pages/admin/AnalyticsReports';
import AuditLogs from './pages/admin/AuditLogs';
import AdminExperiences from './pages/admin/AdminExperiences';

// App Layout Shell
const LayoutShell = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
};

// Root Redirect Helper
const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <AcademicYearProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Root Route Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Student Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
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
            <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
              <Route path="/faculty/dashboard" element={<LayoutShell><FacultyDashboard /></LayoutShell>} />
              <Route path="/faculty/students" element={<LayoutShell><MyStudents /></LayoutShell>} />
              <Route path="/faculty/drives" element={<LayoutShell><EligibleDrives /></LayoutShell>} />
              <Route path="/faculty/results" element={<LayoutShell><ApplicationManager /></LayoutShell>} />
              <Route path="/faculty/questions" element={<LayoutShell><FacultyQuestionBank /></LayoutShell>} />
              <Route path="/faculty/mock-tests" element={<LayoutShell><FacultyMockTests /></LayoutShell>} />
              <Route path="/faculty/experiences" element={<LayoutShell><AdminExperiences /></LayoutShell>} />
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<LayoutShell><AdminDashboard /></LayoutShell>} />
              <Route path="/admin/companies" element={<LayoutShell><CompanyManager /></LayoutShell>} />
              <Route path="/admin/drives" element={<LayoutShell><DriveManager /></LayoutShell>} />
              <Route path="/admin/applications" element={<LayoutShell><ApplicationManager /></LayoutShell>} />
              <Route path="/admin/analytics" element={<LayoutShell><AnalyticsReports /></LayoutShell>} />
              <Route path="/admin/questions" element={<LayoutShell><FacultyQuestionBank /></LayoutShell>} />
              <Route path="/admin/mock-tests" element={<LayoutShell><FacultyMockTests /></LayoutShell>} />
              <Route path="/admin/experiences" element={<LayoutShell><AdminExperiences /></LayoutShell>} />
              <Route path="/admin/audit-logs" element={<LayoutShell><AuditLogs /></LayoutShell>} />
            </Route>

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AcademicYearProvider>
    </AuthProvider>
  );
}

export default App;

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  FileCheck,
  HelpCircle,
  BookOpen,
  Award,
  Compass,
  FileText,
  Users,
  BarChart3,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const role = (user?.role || 'STUDENT').toUpperCase();

  const studentNav = [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Profile', path: '/student/profile', icon: UserCheck },
    { label: 'Eligible Drives', path: '/student/drives', icon: Briefcase },
    { label: 'My Applications', path: '/student/applications', icon: FileCheck },
    { label: 'Question Bank', path: '/student/questions', icon: HelpCircle },
    { label: 'Mock Tests', path: '/student/mock-tests', icon: Award },
    { label: 'Experiences', path: '/student/experiences', icon: BookOpen },
    { label: '3-Day Prep Plan', path: '/student/prep-roadmap', icon: Compass },
    { label: 'Resume Builder', path: '/student/resume-builder', icon: FileText },
    { label: 'Resume Analyzer', path: '/student/resume-analyzer', icon: FileText },
  ];

  const facultyNav = [
    { label: 'Coordinator Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
    { label: 'Department Students', path: '/faculty/students', icon: Users },
    { label: 'Upcoming Drives', path: '/faculty/drives', icon: Briefcase },
    { label: 'Round Results', path: '/faculty/results', icon: FileCheck },
    { label: 'Question Bank', path: '/faculty/questions', icon: HelpCircle },
    { label: 'Mock Tests', path: '/faculty/mock-tests', icon: Award },
    { label: 'Interview Experiences', path: '/faculty/experiences', icon: BookOpen },
  ];

  const adminNav = [
    { label: 'TPO Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Company Directory', path: '/admin/companies', icon: Building2 },
    { label: 'Placement Drives', path: '/admin/drives', icon: Briefcase },
    { label: 'Faculty Management', path: '/admin/faculty', icon: UserCheck },
    { label: 'Student Directory', path: '/admin/students', icon: Users },
    { label: 'Application Tracker', path: '/admin/applications', icon: FileCheck },
    { label: 'Analytics & Reports', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Question Bank', path: '/admin/questions', icon: HelpCircle },
    { label: 'Mock Tests', path: '/admin/mock-tests', icon: Award },
    { label: 'Interview Experiences', path: '/admin/experiences', icon: BookOpen },
    { label: 'TPO Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
  ];

  const isAdm = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const navItems = isAdm ? adminNav : role === 'FACULTY' ? facultyNav : studentNav;

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          {role === 'SUPER_ADMIN' ? 'Super Admin Portal' : role === 'ADMIN' ? 'TPO Control Panel' : role === 'FACULTY' ? 'Faculty Portal' : 'Student Hub'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="rounded-lg bg-blue-50 p-3 border border-blue-100 text-xs">
          <p className="font-bold text-blue-900">CampusPro v1.0</p>
          <p className="text-blue-700 mt-0.5">T&P Department Management</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

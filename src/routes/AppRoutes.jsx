import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { PublicRoute } from '../components/common/PublicRoute';

import { LoginPage } from '../pages/LoginPage';
import { OverviewPage } from '../pages/OverviewPage';
import { DepartmentsPage } from '../pages/DepartmentsPage';
import { EmployeesPage } from '../pages/EmployeesPage';
import { AttendancePage } from '../pages/AttendancePage';
import { LeavesPage } from '../pages/LeavesPage';
import { TasksPage } from '../pages/TasksPage';
import { MeetingsPage } from '../pages/MeetingsPage';
import { AnnouncementsPage } from '../pages/AnnouncementsPage';
import { ComplaintsPage } from '../pages/ComplaintsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes (Accessible only when unauthenticated, redirects if authenticated) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes (Requires authenticated JWT session) */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Core Overview / Dashboard */}
        <Route path="/" element={<OverviewPage />} />
        <Route path="overview" element={<Navigate to="/" replace />} />

        {/* Office Modules */}
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* Fallback 404 inside protected shell */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;

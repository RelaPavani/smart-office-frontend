/**
 * Centralized API Endpoints Configuration
 * Matches the verified Spring Boot REST API controller routes (/api/...)
 */
export const API_ENDPOINTS = {
  // System Health
  HEALTH: '/api/health',

  // Authentication & Session
  AUTH: {
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
    ADMIN_ONLY: '/api/auth/admin-only',
    MANAGER_ONLY: '/api/auth/manager-only',
    EMPLOYEE_ONLY: '/api/auth/employee-only',
  },

  // Department Management
  DEPARTMENTS: {
    BASE: '/api/departments',
    BY_ID: (id) => `/api/departments/${id}`,
    SEARCH: '/api/departments/search',
  },

  // Employee Management
  EMPLOYEES: {
    BASE: '/api/employees',
    BY_ID: (id) => `/api/employees/${id}`,
    ME: '/api/employees/me',
    BY_DEPARTMENT: (deptId) => `/api/employees?departmentId=${deptId}`,
  },

  // Attendance Tracking
  ATTENDANCE: {
    BASE: '/api/attendance',
    CHECK_IN: '/api/attendance/check-in',
    CHECK_OUT: '/api/attendance/check-out',
    MY: '/api/attendance/my',
    MY_SUMMARY: '/api/attendance/my/summary',
    BY_DATE: (date) => `/api/attendance/date/${date}`,
    MONTHLY: '/api/attendance/monthly',
  },

  // Leave Management
  LEAVES: {
    BASE: '/api/leaves',
    MY: '/api/leaves/my',
    PENDING: '/api/leaves/pending',
    BALANCE: '/api/leaves/balance',
    APPROVE: (id) => `/api/leaves/${id}/approve`,
    REJECT: (id) => `/api/leaves/${id}/reject`,
    BY_EMPLOYEE: (id) => `/api/leaves/employee/${id}`,
    BALANCE_BY_EMPLOYEE: (id) => `/api/leaves/balance/${id}`,
    STATUS_UPDATE: (id) => `/api/leaves/${id}/approve`,
  },

  // Tasks Management
  TASKS: {
    BASE: '/api/tasks',
    MY: '/api/tasks/my',
    BY_ID: (id) => `/api/tasks/${id}`,
    STATUS_UPDATE: (id) => `/api/tasks/${id}/status`,
  },

  // Meetings Management
  MEETINGS: {
    BASE: '/api/meetings',
    MY: '/api/meetings/my',
    BY_ID: (id) => `/api/meetings/${id}`,
    STATUS_UPDATE: (id) => `/api/meetings/${id}/status`,
    PARTICIPANTS: (id) => `/api/meetings/${id}/participants`,
    PARTICIPANT_BY_ID: (meetingId, employeeId) => `/api/meetings/${meetingId}/participants/${employeeId}`,
    PARTICIPANT_STATUS: (meetingId, employeeId) => `/api/meetings/${meetingId}/participants/${employeeId}/status`,
  },

  // Announcements
  ANNOUNCEMENTS: {
    BASE: '/api/announcements',
    PUBLISHED: '/api/announcements/published',
    BY_ID: (id) => `/api/announcements/${id}`,
    PUBLISH: (id) => `/api/announcements/${id}/publish`,
  },

  // Complaints & Grievances
  COMPLAINTS: {
    BASE: '/api/complaints',
    MY: '/api/complaints/my',
    BY_ID: (id) => `/api/complaints/${id}`,
    ASSIGN: (id) => `/api/complaints/${id}/assign`,
    STATUS_UPDATE: (id) => `/api/complaints/${id}/status`,
    RESOLVE: (id) => `/api/complaints/${id}/resolve`,
  },

  // Reports & Analytics Dashboards
  REPORTS: {
    BASE: '/api/reports',
    DASHBOARD_ADMIN: '/api/reports/dashboard/admin',
    DASHBOARD_MANAGER: '/api/reports/dashboard/manager',
    DASHBOARD_EMPLOYEE: '/api/reports/dashboard/employee',
    TASKS: '/api/reports/tasks',
    ATTENDANCE: '/api/reports/attendance',
    LEAVES: '/api/reports/leaves',
    COMPLAINTS: '/api/reports/complaints',
  },

  // AI Services
  AI: {
    SUMMARIZE: '/api/ai/summarize',
    SENTIMENT: '/api/ai/sentiment',
    GENERATE_EMAIL: '/api/ai/generate-email',
  },
};

export default API_ENDPOINTS;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  CalendarCheck,
  CheckSquare,
  MessageSquareWarning,
  RefreshCw,
  Building2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Filter,
  Layers,
  PieChart,
  UserCheck,
  FileSpreadsheet,
  ChevronRight,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { reportService } from '../services/reportService';
import { departmentService } from '../services/departmentService';
import { employeeService } from '../services/employeeService';
import { meetingService } from '../services/meetingService';
import { cn } from '../utils/cn';

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDateInput(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Safe percentage calculation
 */
function calcPercent(count, total) {
  if (!total || total <= 0) return 0;
  return Math.round(((count || 0) / total) * 1000) / 10;
}

/**
 * Native SVG Circular Progress Ring
 */
function CircularProgressGauge({ percentage = 0, size = 110, strokeWidth = 10, label = '', color = 'text-blue-600' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validPercent = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (validPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn('transition-all duration-700 ease-out', color)}
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-800 tracking-tight">{validPercent}%</span>
        </div>
      </div>
      {label && <span className="mt-2 text-xs font-medium text-slate-500 text-center">{label}</span>}
    </div>
  );
}

/**
 * Proportional Multi-Segment Progress Bar
 */
function MultiSegmentProgressBar({ segments = [] }) {
  const total = segments.reduce((sum, seg) => sum + (Number(seg.value) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
        {total === 0 ? (
          <div className="w-full h-full bg-slate-200" title="No recorded data" />
        ) : (
          segments.map((seg, idx) => {
            const pct = (seg.value / total) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={idx}
                className={cn('h-full transition-all duration-500', seg.bgClass)}
                style={{ width: `${pct}%` }}
                title={`${seg.label}: ${seg.value} (${Math.round(pct * 10) / 10}%)`}
              />
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {segments.map((seg, idx) => {
          const pct = total > 0 ? Math.round(((seg.value || 0) / total) * 1000) / 10 : 0;
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <span className={cn('w-2.5 h-2.5 rounded-sm shrink-0', seg.dotClass || seg.bgClass)} />
              <span className="text-slate-600 font-medium">{seg.label}:</span>
              <span className="font-semibold text-slate-900">{seg.value || 0}</span>
              <span className="text-slate-400">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Single Distribution Bar Item
 */
function DistributionBarItem({ label, count, total, colorClass = 'bg-blue-600', badgeLabel }) {
  const pct = total > 0 ? Math.round(((count || 0) / total) * 1000) / 10 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-700 truncate pr-2" title={label}>{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          {badgeLabel && <span className="text-[11px] text-slate-400">{badgeLabel}</span>}
          <span className="font-semibold text-slate-900">{count || 0}</span>
          <span className="text-slate-400 w-11 text-right">({pct}%)</span>
        </div>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClass)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * High Level Metric Card
 */
function StatMetricCard({ title, value, subtext, icon: Icon, variant = 'blue', badge }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50/70',
      icon: 'text-blue-600',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50/70',
      icon: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50/70',
      icon: 'text-amber-600',
      border: 'border-amber-100',
    },
    indigo: {
      bg: 'bg-indigo-50/70',
      icon: 'text-indigo-600',
      border: 'border-indigo-100',
    },
    teal: {
      bg: 'bg-teal-50/70',
      icon: 'text-teal-600',
      border: 'border-teal-100',
    },
    rose: {
      bg: 'bg-rose-50/70',
      icon: 'text-rose-600',
      border: 'border-rose-100',
    },
  };

  const currentTheme = colorMap[variant] || colorMap.blue;

  return (
    <Card className={cn('relative overflow-hidden', currentTheme.border)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">{title}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
          </div>
          <div className={cn('p-2.5 rounded-xl shrink-0', currentTheme.bg)}>
            <Icon className={cn('w-5 h-5', currentTheme.icon)} />
          </div>
        </div>
        {badge && <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">{badge}</div>}
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  const { showToast } = useApp();
  const { user, role, isAdmin, isManager, isEmployee } = useAuth();

  // Active Tab: 'overview' | 'attendance' | 'leaves' | 'tasks' | 'complaints' | 'meetings'
  const [activeTab, setActiveTab] = useState('overview');

  // Filter states
  const [datePreset, setDatePreset] = useState('all'); // 'all' | '7days' | '30days' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Dropdown options
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Analytics Data States
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [leaveData, setLeaveData] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [complaintData, setComplaintData] = useState(null);
  const [meetingsData, setMeetingsData] = useState([]);

  /**
   * Handle Quick Date Range Presets
   */
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setStartDate(formatDateInput(past));
      setEndDate(formatDateInput(today));
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      setStartDate(formatDateInput(past));
      setEndDate(formatDateInput(today));
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDateInput(firstDay));
      setEndDate(formatDateInput(today));
    }
  };

  /**
   * Load Departments and Employees for filters (Admin & Manager)
   */
  useEffect(() => {
    let isMounted = true;

    async function loadFilterOptions() {
      if (isEmployee) return; // Employees are strictly self-scoped by backend

      try {
        const depts = await departmentService.getDepartments();
        if (isMounted) {
          setDepartments(depts || []);
        }
      } catch (err) {
        console.warn('Could not load departments for filter:', err.message);
      }

      try {
        const emps = await employeeService.getEmployees();
        if (isMounted) {
          setEmployees(emps || []);
        }
      } catch (err) {
        console.warn('Could not load employees for filter:', err.message);
      }
    }

    loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, [isEmployee]);

  /**
   * Main Analytics Loader
   */
  const fetchAllAnalytics = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    // Build filter payloads
    // Respect backend role permissions:
    // Admin: can send departmentId and employeeId
    // Manager: departmentId should match own or leave null for auto-scope
    // Employee: do NOT send departmentId or other employeeId
    const baseFilters = {};
    if (isAdmin) {
      if (departmentId) baseFilters.departmentId = departmentId;
      if (employeeId) baseFilters.employeeId = employeeId;
    } else if (isManager) {
      if (employeeId) baseFilters.employeeId = employeeId;
      if (departmentId) baseFilters.departmentId = departmentId;
    }

    const dateFilters = {
      ...baseFilters,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    };

    try {
      // 1. Role Dashboard Metrics
      const dashPromise = reportService.getRoleDashboard(role).catch((err) => {
        console.warn('Dashboard metrics fetch error:', err.message);
        return null;
      });

      // 2. Attendance Analytics (supports dates & scope)
      const attPromise = reportService.getAttendanceAnalytics(dateFilters).catch((err) => {
        console.warn('Attendance analytics fetch error:', err.message);
        return null;
      });

      // 3. Leave Analytics (supports dates & scope)
      const leavePromise = reportService.getLeaveAnalytics(dateFilters).catch((err) => {
        console.warn('Leave analytics fetch error:', err.message);
        return null;
      });

      // 4. Task Analytics (supports department/employee scope; no date params)
      const taskPromise = reportService.getTaskAnalytics(baseFilters).catch((err) => {
        console.warn('Task analytics fetch error:', err.message);
        return null;
      });

      // 5. Complaint Analytics (supports department/employee scope; no date params)
      const cmpPromise = reportService.getComplaintAnalytics(baseFilters).catch((err) => {
        console.warn('Complaint analytics fetch error:', err.message);
        return null;
      });

      // 6. Meetings List for Meetings Breakdown
      const mtgPromise = (
        isEmployee ? meetingService.getMyMeetings() : meetingService.getMeetings()
      ).catch((err) => {
        console.warn('Meetings fetch error:', err.message);
        return [];
      });

      const [dashRes, attRes, leaveRes, taskRes, cmpRes, mtgRes] = await Promise.all([
        dashPromise,
        attPromise,
        leavePromise,
        taskPromise,
        cmpPromise,
        mtgPromise,
      ]);

      setDashboardData(dashRes);
      setAttendanceData(attRes);
      setLeaveData(leaveRes);
      setTaskData(taskRes);
      setComplaintData(cmpRes);
      setMeetingsData(mtgRes || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setLoadError(err.message || 'Failed to retrieve analytics data from backend.');
      showToast('Error loading report metrics: ' + (err.message || 'Network error'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isManager, isEmployee, role, departmentId, employeeId, startDate, endDate, showToast]);

  useEffect(() => {
    fetchAllAnalytics();
  }, [fetchAllAnalytics]);

  /**
   * Reset all filters
   */
  const handleResetFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setDepartmentId('');
    setEmployeeId('');
  };

  /**
   * Client-side CSV Export Engine
   */
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename = `smartoffice_${activeTab}_report_${timestamp}.csv`;
    let rows = [];

    const scopeMeta = [
      ['Report Domain', activeTab.toUpperCase()],
      ['Generated At', new Date().toLocaleString()],
      ['User Role', role],
      ['Date Range Filter', startDate && endDate ? `${startDate} to ${endDate}` : 'All Time / Unfiltered'],
      ['Department Filter', departmentId || 'All / Scoped'],
      ['Employee Filter', employeeId || 'All / Scoped'],
      [], // blank line
    ];

    if (activeTab === 'overview') {
      filename = `smartoffice_workforce_overview_${timestamp}.csv`;
      rows = [
        ...scopeMeta,
        ['Metric', 'Value'],
        ['Total Employees', dashboardData?.totalEmployees ?? dashboardData?.teamSize ?? 'N/A'],
        ['Active Employees', dashboardData?.activeEmployees ?? 'N/A'],
        ['Total Departments', dashboardData?.totalDepartments ?? 'N/A'],
        ['Today Attendance Rate', `${dashboardData?.todayAttendanceRate ?? dashboardData?.todayTeamAttendanceRate ?? 0}%`],
        ['Task Completion Rate', `${dashboardData?.taskCompletionRate ?? dashboardData?.teamTaskCompletionRate ?? 0}%`],
        ['Total Meetings Count', dashboardData?.totalMeetingsCount ?? 'N/A'],
        ['Pending Leaves Count', dashboardData?.pendingLeavesCount ?? dashboardData?.teamPendingLeavesCount ?? 0],
        ['Open Complaints Count', dashboardData?.openComplaintsCount ?? dashboardData?.teamOpenComplaintsCount ?? 0],
        [],
        ['Department Headcount Breakdown'],
        ['Department Name', 'Active Employees', 'Share of Workforce (%)'],
      ];

      const deptMap = dashboardData?.employeesByDepartment || {};
      const totalEmp = dashboardData?.totalEmployees || 1;
      Object.entries(deptMap).forEach(([name, count]) => {
        const pct = Math.round((count / totalEmp) * 1000) / 10;
        rows.push([name, count, `${pct}%`]);
      });
    } else if (activeTab === 'attendance') {
      filename = `smartoffice_attendance_analytics_${timestamp}.csv`;
      const total = attendanceData?.totalRecords || 0;
      rows = [
        ...scopeMeta,
        ['Attendance Status', 'Count', 'Percentage (%)'],
        ['Total Attendance Records', total, '100%'],
        ['Present', attendanceData?.presentCount || 0, `${calcPercent(attendanceData?.presentCount, total)}%`],
        ['Late', attendanceData?.lateCount || 0, `${calcPercent(attendanceData?.lateCount, total)}%`],
        ['Half Day', attendanceData?.halfDayCount || 0, `${calcPercent(attendanceData?.halfDayCount, total)}%`],
        ['Absent', attendanceData?.absentCount || 0, `${calcPercent(attendanceData?.absentCount, total)}%`],
        ['Overall Attendance Rate', `${attendanceData?.overallAttendanceRate || 0}%`, 'N/A'],
      ];
    } else if (activeTab === 'leaves') {
      filename = `smartoffice_leave_analytics_${timestamp}.csv`;
      const total = leaveData?.totalLeaveRequests || 0;
      rows = [
        ...scopeMeta,
        ['Leave Summary Metric', 'Count', 'Percentage (%)'],
        ['Total Leave Requests', total, '100%'],
        ['Pending Leaves', leaveData?.pendingLeaves || 0, `${calcPercent(leaveData?.pendingLeaves, total)}%`],
        ['Approved Leaves', leaveData?.approvedLeaves || 0, `${calcPercent(leaveData?.approvedLeaves, total)}%`],
        ['Rejected Leaves', leaveData?.rejectedLeaves || 0, `${calcPercent(leaveData?.rejectedLeaves, total)}%`],
        ['Approval Rate', `${leaveData?.approvalRate || 0}%`, 'N/A'],
        [],
        ['Leaves by Type', 'Count', 'Share (%)'],
      ];

      const typesMap = leaveData?.leavesByType || {};
      Object.entries(typesMap).forEach(([type, count]) => {
        rows.push([type, count, `${calcPercent(count, total)}%`]);
      });

      rows.push([], ['Leaves by Status', 'Count', 'Share (%)']);
      const statusMap = leaveData?.leavesByStatus || {};
      Object.entries(statusMap).forEach(([st, count]) => {
        rows.push([st, count, `${calcPercent(count, total)}%`]);
      });
    } else if (activeTab === 'tasks') {
      filename = `smartoffice_task_analytics_${timestamp}.csv`;
      const total = taskData?.totalTasks || 0;
      rows = [
        ...scopeMeta,
        ['Task Metric', 'Count', 'Percentage (%)'],
        ['Total Tasks', total, '100%'],
        ['Completed Tasks', taskData?.completedTasks || 0, `${calcPercent(taskData?.completedTasks, total)}%`],
        ['In Progress Tasks', taskData?.inProgressTasks || 0, `${calcPercent(taskData?.inProgressTasks, total)}%`],
        ['To Do Tasks', taskData?.todoTasks || 0, `${calcPercent(taskData?.todoTasks, total)}%`],
        ['Overdue Tasks', taskData?.overdueTasks || 0, `${calcPercent(taskData?.overdueTasks, total)}%`],
        ['Cancelled Tasks', taskData?.cancelledTasks || 0, `${calcPercent(taskData?.cancelledTasks, total)}%`],
        ['Completion Rate', `${taskData?.completionRate || 0}%`, 'N/A'],
        [],
        ['Tasks by Priority', 'Count', 'Share (%)'],
      ];

      const prioMap = taskData?.tasksByPriority || {};
      Object.entries(prioMap).forEach(([prio, count]) => {
        rows.push([prio, count, `${calcPercent(count, total)}%`]);
      });

      rows.push([], ['Tasks by Status', 'Count', 'Share (%)']);
      const stMap = taskData?.tasksByStatus || {};
      Object.entries(stMap).forEach(([st, count]) => {
        rows.push([st, count, `${calcPercent(count, total)}%`]);
      });
    } else if (activeTab === 'complaints') {
      filename = `smartoffice_complaint_analytics_${timestamp}.csv`;
      const total = complaintData?.totalComplaints || 0;
      rows = [
        ...scopeMeta,
        ['Grievance Metric', 'Count', 'Percentage (%)'],
        ['Total Complaints', total, '100%'],
        ['Open Complaints', complaintData?.openComplaints || 0, `${calcPercent(complaintData?.openComplaints, total)}%`],
        ['In Progress Complaints', complaintData?.inProgressComplaints || 0, `${calcPercent(complaintData?.inProgressComplaints, total)}%`],
        ['Resolved Complaints', complaintData?.resolvedComplaints || 0, `${calcPercent(complaintData?.resolvedComplaints, total)}%`],
        ['Closed Complaints', complaintData?.closedComplaints || 0, `${calcPercent(complaintData?.closedComplaints, total)}%`],
        ['Resolution Rate', `${complaintData?.resolutionRate || 0}%`, 'N/A'],
        [],
        ['Complaints by Category', 'Count', 'Share (%)'],
      ];

      const catMap = complaintData?.complaintsByCategory || {};
      Object.entries(catMap).forEach(([cat, count]) => {
        rows.push([cat, count, `${calcPercent(count, total)}%`]);
      });

      rows.push([], ['Complaints by Priority', 'Count', 'Share (%)']);
      const prioMap = complaintData?.complaintsByPriority || {};
      Object.entries(prioMap).forEach(([prio, count]) => {
        rows.push([prio, count, `${calcPercent(count, total)}%`]);
      });
    } else if (activeTab === 'meetings') {
      filename = `smartoffice_meetings_report_${timestamp}.csv`;
      rows = [
        ...scopeMeta,
        ['Meeting ID', 'Title', 'Organizer', 'Start Time', 'End Time', 'Status'],
      ];
      meetingsData.forEach((m) => {
        rows.push([
          m.id,
          `"${(m.title || '').replace(/"/g, '""')}"`,
          `"${(m.organizerName || '').replace(/"/g, '""')}"`,
          m.startDateTime || '',
          m.endDateTime || '',
          m.status || '',
        ]);
      });
    }

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            if (cell === null || cell === undefined) return '';
            const str = String(cell);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(',')
      )
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${activeTab.toUpperCase()} report to ${filename}`, 'success');
  };

  // Helper metrics for High-Level KPI Strip
  const highLevelStats = useMemo(() => {
    const workforceCount =
      dashboardData?.totalEmployees ??
      dashboardData?.teamSize ??
      (dashboardData?.employeeCode ? 1 : 0);

    const attRate =
      attendanceData?.overallAttendanceRate ??
      dashboardData?.todayAttendanceRate ??
      dashboardData?.todayTeamAttendanceRate ??
      dashboardData?.attendancePercentage ??
      0;

    const taskRate =
      taskData?.completionRate ??
      dashboardData?.taskCompletionRate ??
      dashboardData?.teamTaskCompletionRate ??
      0;

    const leaveRate =
      leaveData?.approvalRate ??
      (dashboardData?.approvedLeavesCount && dashboardData?.pendingLeavesCount
        ? calcPercent(
            dashboardData.approvedLeavesCount,
            dashboardData.approvedLeavesCount + dashboardData.pendingLeavesCount
          )
        : 0);

    const resolutionRate =
      complaintData?.resolutionRate ??
      (dashboardData?.resolvedComplaintsCount && dashboardData?.openComplaintsCount
        ? calcPercent(
            dashboardData.resolvedComplaintsCount,
            dashboardData.resolvedComplaintsCount + dashboardData.openComplaintsCount
          )
        : 0);

    return { workforceCount, attRate, taskRate, leaveRate, resolutionRate };
  }, [dashboardData, attendanceData, taskData, leaveData, complaintData]);

  // Is a date filter applicable on the current tab?
  const isDateFilterApplicable = activeTab === 'attendance' || activeTab === 'leaves';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive business intelligence, operational velocity, attendance summaries, and governance analytics."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Reports & Analytics' }]}
        badge={
          <Badge variant={isAdmin ? 'primary' : isManager ? 'teal' : 'neutral'} dot>
            {isAdmin ? 'Enterprise Admin Scope' : isManager ? 'Department Manager Scope' : 'Personal Employee Scope'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              onClick={fetchAllAnalytics}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Download}
              onClick={handleExportCSV}
              disabled={isLoading}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Filter Control Bar */}
      <Card className="bg-slate-50/60 border-slate-200">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Filter selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mr-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                Filters:
              </div>

              {/* Date Presets */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-sm">
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors',
                    datePreset === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  All Time
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('7days')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors',
                    datePreset === '7days' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('30days')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors',
                    datePreset === '30days' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('month')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-medium transition-colors',
                    datePreset === 'month' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  This Month
                </button>
              </div>

              {/* Date Range Inputs */}
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-800 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Start Date"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-800 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="End Date"
                />
              </div>

              {/* Department Selector (Admin / Manager) */}
              {!isEmployee && (
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-800 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Employee Selector (Admin / Manager) */}
              {!isEmployee && (
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white text-slate-800 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">All Employees</option>
                  {employees
                    .filter((emp) => !departmentId || emp.departmentId === Number(departmentId) || emp.department?.id === Number(departmentId))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                </select>
              )}

              {/* Reset Button */}
              {(startDate || endDate || departmentId || employeeId || datePreset !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 ml-1"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Right: Date Scope Transparency Indicator */}
            <div className="shrink-0 flex items-center">
              {isDateFilterApplicable ? (
                <Badge variant="success" size="sm" dot>
                  Date range active: {startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'}
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  <span className="text-[11px] text-slate-500">
                    Lifetime totals (Date filter applies to Attendance & Leaves)
                  </span>
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive KPI Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatMetricCard
          title={isEmployee ? 'Personal Scope' : 'Total Workforce'}
          value={highLevelStats.workforceCount}
          subtext={
            isAdmin
              ? `${dashboardData?.activeEmployees ?? 0} active employees`
              : isManager
              ? `${dashboardData?.departmentName || 'Team'}`
              : `${dashboardData?.departmentName || 'Active'}`
          }
          icon={Users}
          variant="blue"
        />

        <StatMetricCard
          title="Attendance Rate"
          value={`${highLevelStats.attRate}%`}
          subtext={
            attendanceData?.totalRecords
              ? `${attendanceData.presentCount || 0} of ${attendanceData.totalRecords} present`
              : 'Based on recorded logs'
          }
          icon={Clock}
          variant="emerald"
        />

        <StatMetricCard
          title="Task Velocity"
          value={`${highLevelStats.taskRate}%`}
          subtext={
            taskData?.totalTasks
              ? `${taskData.completedTasks || 0} of ${taskData.totalTasks} completed`
              : `${dashboardData?.completedTasksCount ?? 0} finished tasks`
          }
          icon={CheckSquare}
          variant="indigo"
        />

        <StatMetricCard
          title="Leave Approvals"
          value={`${highLevelStats.leaveRate}%`}
          subtext={
            leaveData?.totalLeaveRequests
              ? `${leaveData.approvedLeaves || 0} approved, ${leaveData.pendingLeaves || 0} pending`
              : `${dashboardData?.pendingLeavesCount ?? dashboardData?.teamPendingLeavesCount ?? 0} pending review`
          }
          icon={CalendarCheck}
          variant="amber"
        />

        <StatMetricCard
          title="Grievance Resolution"
          value={`${highLevelStats.resolutionRate}%`}
          subtext={
            complaintData?.totalComplaints
              ? `${complaintData.resolvedComplaints || 0} of ${complaintData.totalComplaints} resolved`
              : `${dashboardData?.openComplaintsCount ?? dashboardData?.teamOpenComplaintsCount ?? 0} open issues`
          }
          icon={MessageSquareWarning}
          variant="teal"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
          {[
            { id: 'overview', label: 'Workforce & Overview', icon: Users },
            { id: 'attendance', label: 'Attendance Analytics', icon: Clock },
            { id: 'leaves', label: 'Leave Analytics', icon: CalendarCheck },
            { id: 'tasks', label: 'Task Velocity', icon: CheckSquare },
            { id: 'complaints', label: 'Complaints & Grievances', icon: MessageSquareWarning },
            { id: 'meetings', label: 'Meetings Analytics', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Loading & Error States */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12">
            <LoadingState message="Aggregating metrics and computing analytics..." />
          </CardContent>
        </Card>
      ) : loadError ? (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-rose-900">Analytics Service Unavailable</h4>
                <p className="mt-1 text-xs text-rose-700">{loadError}</p>
                <Button variant="outline" size="sm" onClick={fetchAllAnalytics} className="mt-3">
                  Retry Loading
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Tab Contents */
        <div className="space-y-6">
          {/* ----------------- TAB 1: WORKFORCE & OVERVIEW ----------------- */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Department Distribution */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Departmental Workforce Distribution</CardTitle>
                        <CardDescription>
                          Active headcount distribution across registered departments
                        </CardDescription>
                      </div>
                      <Badge variant="primary">
                        {dashboardData?.totalDepartments ?? departments.length} Departments
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {dashboardData?.employeesByDepartment && Object.keys(dashboardData.employeesByDepartment).length > 0 ? (
                      <div className="space-y-4 max-h-[460px] overflow-y-auto pr-2">
                        {Object.entries(dashboardData.employeesByDepartment)
                          .sort(([, a], [, b]) => b - a)
                          .map(([deptName, count], idx) => (
                            <DistributionBarItem
                              key={idx}
                              label={deptName}
                              count={count}
                              total={dashboardData?.activeEmployees || dashboardData?.totalEmployees || 1}
                              colorClass={
                                idx % 4 === 0
                                  ? 'bg-blue-600'
                                  : idx % 4 === 1
                                  ? 'bg-teal-500'
                                  : idx % 4 === 2
                                  ? 'bg-indigo-600'
                                  : 'bg-emerald-500'
                              }
                            />
                          ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Building2}
                        title="No Departmental Distribution Data"
                        description="Department distribution is available for administrators or when employees are assigned to departments."
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Col: Executive Snapshot Cards */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Snapshot</CardTitle>
                    <CardDescription>Live operational metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Active / Total Employees</p>
                          <p className="text-sm font-bold text-slate-900">
                            {dashboardData?.activeEmployees ?? dashboardData?.teamSize ?? '1'} /{' '}
                            {dashboardData?.totalEmployees ?? dashboardData?.teamSize ?? '1'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" size="sm">
                        {dashboardData?.totalEmployees
                          ? `${Math.round(((dashboardData.activeEmployees || 0) / dashboardData.totalEmployees) * 100)}% active`
                          : '100% active'}
                      </Badge>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Today Present Count</p>
                          <p className="text-sm font-bold text-slate-900">
                            {dashboardData?.todayPresentCount ?? dashboardData?.todayTeamPresentCount ?? 0} checked in
                          </p>
                        </div>
                      </div>
                      <Badge variant="teal" size="sm">
                        {dashboardData?.todayLateCount ? `${dashboardData.todayLateCount} late` : 'On time'}
                      </Badge>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total Tasks Tracked</p>
                          <p className="text-sm font-bold text-slate-900">
                            {dashboardData?.totalTasksCount ?? dashboardData?.teamTotalTasks ?? taskData?.totalTasks ?? 0} tasks
                          </p>
                        </div>
                      </div>
                      <Badge variant="primary" size="sm">
                        {dashboardData?.completedTasksCount ?? dashboardData?.teamCompletedTasks ?? taskData?.completedTasks ?? 0} done
                      </Badge>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                          <CalendarCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Pending Leave Requests</p>
                          <p className="text-sm font-bold text-slate-900">
                            {dashboardData?.pendingLeavesCount ?? dashboardData?.teamPendingLeavesCount ?? 0} pending
                          </p>
                        </div>
                      </div>
                      <Badge variant="warning" size="sm">Awaiting Review</Badge>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Scheduled Meetings</p>
                          <p className="text-sm font-bold text-slate-900">
                            {dashboardData?.totalMeetingsCount ?? meetingsData.length} total
                          </p>
                        </div>
                      </div>
                      <Badge variant="info" size="sm">
                        {dashboardData?.upcomingMeetingsCount ?? 0} upcoming
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ----------------- TAB 2: ATTENDANCE ANALYTICS ----------------- */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5 flex items-center gap-4">
                    <CircularProgressGauge
                      percentage={attendanceData?.overallAttendanceRate || 0}
                      size={90}
                      strokeWidth={8}
                      color="text-emerald-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Attendance Rate</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {attendanceData?.overallAttendanceRate || 0}%
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {attendanceData?.totalRecords || 0} total records
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Present</span>
                      <Badge variant="success">On Time</Badge>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">
                      {attendanceData?.presentCount || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(attendanceData?.presentCount, attendanceData?.totalRecords)}% of total logs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Late Arrivals</span>
                      <Badge variant="warning">Late</Badge>
                    </div>
                    <p className="text-3xl font-bold text-amber-600 mt-2">
                      {attendanceData?.lateCount || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(attendanceData?.lateCount, attendanceData?.totalRecords)}% of total logs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Absences & Half-Days</span>
                      <Badge variant="danger">Absent / Half</Badge>
                    </div>
                    <p className="text-3xl font-bold text-rose-600 mt-2">
                      {(attendanceData?.absentCount || 0) + (attendanceData?.halfDayCount || 0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {attendanceData?.halfDayCount || 0} half-day, {attendanceData?.absentCount || 0} absent
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Proportional Attendance Segment Bar */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Distribution Composition</CardTitle>
                  <CardDescription>
                    Visual ratio of attendance statuses for the selected date range and scope
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiSegmentProgressBar
                    segments={[
                      { label: 'Present', value: attendanceData?.presentCount || 0, bgClass: 'bg-emerald-500', dotClass: 'bg-emerald-500' },
                      { label: 'Late', value: attendanceData?.lateCount || 0, bgClass: 'bg-amber-500', dotClass: 'bg-amber-500' },
                      { label: 'Half Day', value: attendanceData?.halfDayCount || 0, bgClass: 'bg-orange-500', dotClass: 'bg-orange-500' },
                      { label: 'Absent', value: attendanceData?.absentCount || 0, bgClass: 'bg-rose-500', dotClass: 'bg-rose-500' },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Status Breakdown Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Status Breakdown</CardTitle>
                  <CardDescription>
                    Aggregated values from GET /api/reports/attendance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceData?.attendanceByStatus ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {Object.entries(attendanceData.attendanceByStatus).map(([status, count]) => (
                        <div key={status} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                          <p className="text-xs font-semibold text-slate-500">{status}</p>
                          <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {calcPercent(count, attendanceData?.totalRecords)}% share
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Clock}
                      title="No Attendance Logs"
                      description="No attendance records matched the specified filter criteria."
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ----------------- TAB 3: LEAVE ANALYTICS ----------------- */}
          {activeTab === 'leaves' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5 flex items-center gap-4">
                    <CircularProgressGauge
                      percentage={leaveData?.approvalRate || 0}
                      size={90}
                      strokeWidth={8}
                      color="text-blue-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Approval Rate</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {leaveData?.approvalRate || 0}%
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {leaveData?.totalLeaveRequests || 0} total requests
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Pending</span>
                      <Badge variant="warning">In Review</Badge>
                    </div>
                    <p className="text-3xl font-bold text-amber-600 mt-2">
                      {leaveData?.pendingLeaves || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(leaveData?.pendingLeaves, leaveData?.totalLeaveRequests)}% pending decision
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Approved</span>
                      <Badge variant="success">Granted</Badge>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">
                      {leaveData?.approvedLeaves || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(leaveData?.approvedLeaves, leaveData?.totalLeaveRequests)}% granted
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Rejected</span>
                      <Badge variant="danger">Declined</Badge>
                    </div>
                    <p className="text-3xl font-bold text-rose-600 mt-2">
                      {leaveData?.rejectedLeaves || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(leaveData?.rejectedLeaves, leaveData?.totalLeaveRequests)}% rejected
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Status Composition */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave Requests Status Composition</CardTitle>
                  <CardDescription>Distribution across application statuses</CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiSegmentProgressBar
                    segments={[
                      { label: 'Pending', value: leaveData?.pendingLeaves || 0, bgClass: 'bg-amber-500' },
                      { label: 'Approved', value: leaveData?.approvedLeaves || 0, bgClass: 'bg-emerald-500' },
                      { label: 'Rejected', value: leaveData?.rejectedLeaves || 0, bgClass: 'bg-rose-500' },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Breakdown by Leave Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave Requests by Leave Type</CardTitle>
                  <CardDescription>
                    Classification across Casual, Sick, Earned, Maternity, and Unpaid leave types
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {leaveData?.leavesByType && Object.keys(leaveData.leavesByType).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(leaveData.leavesByType).map(([type, count], idx) => (
                        <DistributionBarItem
                          key={type}
                          label={type}
                          count={count}
                          total={leaveData?.totalLeaveRequests || 1}
                          colorClass={
                            idx % 3 === 0
                              ? 'bg-blue-600'
                              : idx % 3 === 1
                              ? 'bg-indigo-600'
                              : 'bg-teal-500'
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={CalendarCheck}
                      title="No Leave Records"
                      description="No leave records were found for the chosen filters."
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ----------------- TAB 4: TASK ANALYTICS ----------------- */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5 flex items-center gap-4">
                    <CircularProgressGauge
                      percentage={taskData?.completionRate || 0}
                      size={90}
                      strokeWidth={8}
                      color="text-indigo-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Completion Rate</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {taskData?.completionRate || 0}%
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {taskData?.totalTasks || 0} total tasks
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Completed</span>
                      <Badge variant="success">Done</Badge>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">
                      {taskData?.completedTasks || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(taskData?.completedTasks, taskData?.totalTasks)}% of total assignments
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">In Progress</span>
                      <Badge variant="primary">Active</Badge>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {taskData?.inProgressTasks || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(taskData?.inProgressTasks, taskData?.totalTasks)}% underway
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">To Do & Overdue</span>
                      <Badge variant={taskData?.overdueTasks > 0 ? 'danger' : 'neutral'}>
                        {taskData?.overdueTasks || 0} Overdue
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-slate-700 mt-2">
                      {taskData?.todoTasks || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(taskData?.todoTasks, taskData?.totalTasks)}% pending start
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Multi-Segment Status Track */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Status Velocity</CardTitle>
                  <CardDescription>Overall progress track of all scoped tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiSegmentProgressBar
                    segments={[
                      { label: 'Completed', value: taskData?.completedTasks || 0, bgClass: 'bg-emerald-500' },
                      { label: 'In Progress', value: taskData?.inProgressTasks || 0, bgClass: 'bg-blue-500' },
                      { label: 'To Do', value: taskData?.todoTasks || 0, bgClass: 'bg-slate-400' },
                      { label: 'Cancelled', value: taskData?.cancelledTasks || 0, bgClass: 'bg-rose-400' },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Task Priority Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks by Priority</CardTitle>
                    <CardDescription>Severity distribution across Urgent, High, Medium, Low</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {taskData?.tasksByPriority ? (
                      <div className="space-y-4">
                        <DistributionBarItem
                          label="Urgent Priority"
                          count={taskData.tasksByPriority.URGENT || 0}
                          total={taskData.totalTasks || 1}
                          colorClass="bg-rose-600"
                        />
                        <DistributionBarItem
                          label="High Priority"
                          count={taskData.tasksByPriority.HIGH || 0}
                          total={taskData.totalTasks || 1}
                          colorClass="bg-amber-500"
                        />
                        <DistributionBarItem
                          label="Medium Priority"
                          count={taskData.tasksByPriority.MEDIUM || 0}
                          total={taskData.totalTasks || 1}
                          colorClass="bg-blue-600"
                        />
                        <DistributionBarItem
                          label="Low Priority"
                          count={taskData.tasksByPriority.LOW || 0}
                          total={taskData.totalTasks || 1}
                          colorClass="bg-slate-400"
                        />
                      </div>
                    ) : (
                      <EmptyState icon={CheckSquare} title="No Priority Data" />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tasks by Execution Status</CardTitle>
                    <CardDescription>Counts returned by GET /api/reports/tasks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {taskData?.tasksByStatus ? (
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(taskData.tasksByStatus).map(([st, count]) => (
                          <div key={st} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                            <span className="text-xs font-semibold text-slate-500">{st}</span>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {calcPercent(count, taskData.totalTasks)}% share
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState icon={CheckSquare} title="No Status Data" />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ----------------- TAB 5: COMPLAINTS & GRIEVANCES ----------------- */}
          {activeTab === 'complaints' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5 flex items-center gap-4">
                    <CircularProgressGauge
                      percentage={complaintData?.resolutionRate || 0}
                      size={90}
                      strokeWidth={8}
                      color="text-teal-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Resolution Rate</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {complaintData?.resolutionRate || 0}%
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {complaintData?.totalComplaints || 0} total filed
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Open Grievances</span>
                      <Badge variant="warning">Awaiting Action</Badge>
                    </div>
                    <p className="text-3xl font-bold text-amber-600 mt-2">
                      {complaintData?.openComplaints || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(complaintData?.openComplaints, complaintData?.totalComplaints)}% of total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">In Investigation</span>
                      <Badge variant="info">In Progress</Badge>
                    </div>
                    <p className="text-3xl font-bold text-sky-600 mt-2">
                      {complaintData?.inProgressComplaints || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {calcPercent(complaintData?.inProgressComplaints, complaintData?.totalComplaints)}% being handled
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Resolved & Closed</span>
                      <Badge variant="success">Solved</Badge>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">
                      {(complaintData?.resolvedComplaints || 0) + (complaintData?.closedComplaints || 0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {complaintData?.resolvedComplaints || 0} resolved, {complaintData?.closedComplaints || 0} closed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Complaints Composition */}
              <Card>
                <CardHeader>
                  <CardTitle>Grievance Resolution Lifecycle</CardTitle>
                  <CardDescription>Composition of open, investigation, and closed cases</CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiSegmentProgressBar
                    segments={[
                      { label: 'Open', value: complaintData?.openComplaints || 0, bgClass: 'bg-amber-500' },
                      { label: 'In Progress', value: complaintData?.inProgressComplaints || 0, bgClass: 'bg-sky-500' },
                      { label: 'Resolved', value: complaintData?.resolvedComplaints || 0, bgClass: 'bg-emerald-500' },
                      { label: 'Closed', value: complaintData?.closedComplaints || 0, bgClass: 'bg-slate-400' },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Categories & Priorities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Complaints by Category</CardTitle>
                    <CardDescription>Breakdown across IT, HR, Facilities, Payroll, General</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {complaintData?.complaintsByCategory ? (
                      <div className="space-y-4">
                        {Object.entries(complaintData.complaintsByCategory).map(([cat, count], idx) => (
                          <DistributionBarItem
                            key={cat}
                            label={cat}
                            count={count}
                            total={complaintData?.totalComplaints || 1}
                            colorClass={
                              idx % 3 === 0
                                ? 'bg-teal-600'
                                : idx % 3 === 1
                                ? 'bg-blue-600'
                                : 'bg-indigo-600'
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState icon={MessageSquareWarning} title="No Category Data" />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Complaints by Priority & Status</CardTitle>
                    <CardDescription>Detailed distributions from GET /api/reports/complaints</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {complaintData?.complaintsByPriority && (
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority Distribution</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(complaintData.complaintsByPriority).map(([prio, count]) => (
                            <div key={prio} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">{prio}</span>
                              <span className="font-bold text-slate-900">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {complaintData?.complaintsByStatus && (
                      <div className="space-y-2.5 pt-2 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Distribution</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(complaintData.complaintsByStatus).map(([st, count]) => (
                            <div key={st} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">{st}</span>
                              <span className="font-bold text-slate-900">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ----------------- TAB 6: MEETINGS ANALYTICS ----------------- */}
          {activeTab === 'meetings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total Meetings</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">
                      {dashboardData?.totalMeetingsCount ?? meetingsData.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Conducted and scheduled corporate sessions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Upcoming Meetings</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {dashboardData?.upcomingMeetingsCount ??
                        meetingsData.filter((m) => new Date(m.startDateTime) > new Date()).length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Scheduled in calendar</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Finished / Completed</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-2">
                      {meetingsData.filter(
                        (m) => m.status === 'COMPLETED' || (m.endDateTime && new Date(m.endDateTime) < new Date())
                      ).length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Completed corporate meetings</p>
                  </CardContent>
                </Card>
              </div>

              {/* Meetings List Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Meeting Records Overview</CardTitle>
                      <CardDescription>Recent and scheduled sessions</CardDescription>
                    </div>
                    <Badge variant="teal">{meetingsData.length} Meetings</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {meetingsData.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {meetingsData.slice(0, 8).map((meeting) => (
                        <div key={meeting.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{meeting.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Organizer: {meeting.organizerName || 'Corporate'} •{' '}
                              {meeting.startDateTime ? new Date(meeting.startDateTime).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                          <Badge
                            variant={
                              meeting.status === 'COMPLETED'
                                ? 'success'
                                : meeting.status === 'CANCELLED'
                                ? 'danger'
                                : 'primary'
                            }
                            size="sm"
                          >
                            {meeting.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Calendar}
                      title="No Meetings Found"
                      description="No meeting sessions are currently on record."
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportsPage;

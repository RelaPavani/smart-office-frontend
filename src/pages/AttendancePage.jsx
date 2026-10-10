import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  Calendar,
  LogOut,
  LogIn,
  AlertCircle,
  RefreshCw,
  Users,
  CalendarDays,
  Check,
  X,
  Building2,
  ShieldCheck,
  AlertTriangle,
  History,
  Timer,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { attendanceService } from '../services/attendanceService';

export function AttendancePage() {
  const { showToast } = useApp();
  const { user, isAdmin, isManager } = useAuth();

  // Active view tab for Admin / Manager ('my' | 'daily' | 'monthly')
  const [activeTab, setActiveTab] = useState('my');

  // Today's attendance state
  const [todayRecord, setTodayRecord] = useState(null);
  const [isTodayLoading, setIsTodayLoading] = useState(true);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(true);

  // My Attendance logs state
  const [myLogs, setMyLogs] = useState([]);
  const [mySummary, setMySummary] = useState(null);
  const [isLogsLoading, setIsLogsLoading] = useState(true);

  // Team / Organization attendance states (Admin / Manager)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamDateLogs, setTeamDateLogs] = useState([]);
  const [isTeamDateLoading, setIsTeamDateLoading] = useState(false);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [teamMonthlyLogs, setTeamMonthlyLogs] = useState([]);
  const [isTeamMonthlyLoading, setIsTeamMonthlyLoading] = useState(false);

  // Action states
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Format ISO timestamp to local time string (e.g., 09:30 AM)
   */
  const formatTime = (isoString) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  /**
   * Format ISO date string (e.g., Oct 9, 2026)
   */
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Render Attendance Status Badge
   */
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return <Badge variant="success" dot>Present</Badge>;
      case 'LATE':
        return <Badge variant="warning" dot>Late Arrival</Badge>;
      case 'HALF_DAY':
        return <Badge variant="info" dot>Half Day</Badge>;
      case 'ABSENT':
        return <Badge variant="danger" dot>Absent</Badge>;
      default:
        return <Badge variant="neutral">{status || 'Unknown'}</Badge>;
    }
  };

  /**
   * Load current user's today status & monthly summary
   */
  const loadMyAttendance = useCallback(async (silent = false) => {
    if (!silent) {
      setIsTodayLoading(true);
      setIsLogsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch today's record and full history in parallel
      const [todayList, allLogs, summaryData] = await Promise.allSettled([
        attendanceService.getMyAttendance(todayStr),
        attendanceService.getMyAttendance(),
        attendanceService.getMyMonthlySummary(selectedYear, selectedMonth),
      ]);

      if (todayList.status === 'fulfilled') {
        const list = Array.isArray(todayList.value) ? todayList.value : [];
        setTodayRecord(list.length > 0 ? list[0] : null);
        setHasEmployeeProfile(true);
      } else if (todayList.reason?.response?.status === 404) {
        setHasEmployeeProfile(false);
      }

      if (allLogs.status === 'fulfilled') {
        setMyLogs(Array.isArray(allLogs.value) ? allLogs.value : []);
      }

      if (summaryData.status === 'fulfilled') {
        setMySummary(summaryData.value);
      }
    } catch (err) {
      showToast('Error syncing attendance status', 'error');
    } finally {
      setIsTodayLoading(false);
      setIsLogsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedYear, selectedMonth, showToast]);

  /**
   * Load Team Attendance for specific date (Admin / Manager)
   */
  const loadTeamDateAttendance = useCallback(async () => {
    if (!isAdmin && !isManager) return;
    setIsTeamDateLoading(true);

    try {
      const data = await attendanceService.getAttendanceByDate(selectedDate);
      setTeamDateLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load team date attendance';
      showToast(msg, 'error');
      setTeamDateLogs([]);
    } finally {
      setIsTeamDateLoading(false);
    }
  }, [isAdmin, isManager, selectedDate, showToast]);

  /**
   * Load Team Monthly Attendance (Admin / Manager)
   */
  const loadTeamMonthlyAttendance = useCallback(async () => {
    if (!isAdmin && !isManager) return;
    setIsTeamMonthlyLoading(true);

    try {
      const data = await attendanceService.getMonthlyAttendance(selectedYear, selectedMonth);
      setTeamMonthlyLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load team monthly attendance';
      showToast(msg, 'error');
      setTeamMonthlyLogs([]);
    } finally {
      setIsTeamMonthlyLoading(false);
    }
  }, [isAdmin, isManager, selectedYear, selectedMonth, showToast]);

  // Initial load
  useEffect(() => {
    loadMyAttendance();
  }, [loadMyAttendance]);

  // Switch tab triggers
  useEffect(() => {
    if (activeTab === 'daily') {
      loadTeamDateAttendance();
    } else if (activeTab === 'monthly') {
      loadTeamMonthlyAttendance();
    }
  }, [activeTab, loadTeamDateAttendance, loadTeamMonthlyAttendance]);

  /**
   * Handle Clock-In Action
   */
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const record = await attendanceService.checkIn();
      setTodayRecord(record);
      showToast(
        `Checked in at ${formatTime(record.checkIn)} (Status: ${record.status})`,
        record.status === 'LATE' ? 'warning' : 'success'
      );
      loadMyAttendance(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Check-in failed';
      showToast(msg, 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  /**
   * Handle Clock-Out Action
   */
  const handleCheckOutConfirm = async () => {
    setIsCheckingOut(true);
    try {
      const record = await attendanceService.checkOut();
      setTodayRecord(record);
      setIsCheckOutModalOpen(false);
      showToast(
        `Checked out at ${formatTime(record.checkOut)}. Total: ${record.workingHours || 0} hrs.`,
        'success'
      );
      loadMyAttendance(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Check-out failed';
      showToast(msg, 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Attendance Tracking"
        description="Daily check-in / check-out operations, punch timestamps, working hours, and monthly roster summaries."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Attendance' }]}
        badge={<Badge variant="teal" dot>Live MySQL Biometrics</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              isLoading={isRefreshing}
              onClick={() => {
                if (activeTab === 'my') loadMyAttendance(true);
                else if (activeTab === 'daily') loadTeamDateAttendance();
                else if (activeTab === 'monthly') loadTeamMonthlyAttendance();
              }}
              title="Refresh attendance records"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Account linking warning if user lacks employee profile */}
      {!hasEmployeeProfile && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900">Employee Profile Required</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Your user account is not currently linked to an employee profile in the database. Biometric punch operations require an active employee ID. Please contact an administrator to complete your staff profile.
            </p>
          </div>
        </div>
      )}

      {/* Today's Punch Clock & Live Status Card */}
      <Card className="border-teal-100/70 bg-gradient-to-br from-white via-white to-teal-50/20">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Daily Attendance Punch</CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </CardDescription>
              </div>
            </div>

            {/* Standard Shift Notice */}
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 font-mono">
              Shift Policy: 09:30 AM (Arrivals after 09:30 AM flagged LATE)
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 pb-6">
          {isTodayLoading ? (
            <div className="py-6 flex justify-center">
              <LoadingState message="Verifying today's attendance status..." />
            </div>
          ) : !hasEmployeeProfile ? (
            <div className="text-center py-4 text-xs text-slate-500">
              Punch clock disabled until employee profile is linked.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Status Indicator */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Status</span>
                  {todayRecord ? (
                    renderStatusBadge(todayRecord.status)
                  ) : (
                    <Badge variant="neutral" dot>Not Checked In</Badge>
                  )}
                </div>

                <div className="pt-1">
                  {todayRecord?.checkOut ? (
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Shift Completed
                    </p>
                  ) : todayRecord?.checkIn ? (
                    <p className="text-sm font-semibold text-teal-700 flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-teal-600 animate-pulse" />
                      Shift Currently Active
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-slate-600">
                      Ready to punch in for today's session
                    </p>
                  )}
                </div>
              </div>

              {/* Timestamp Breakdown */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-slate-100 bg-white">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Check-In Time</span>
                  <span className="text-base font-bold text-slate-900 mt-1 block font-mono">
                    {formatTime(todayRecord?.checkIn)}
                  </span>
                  {todayRecord?.checkIn && (
                    <span className="text-[11px] text-slate-500">
                      {todayRecord.status === 'LATE' ? 'Flagged Late' : 'On Schedule'}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">Check-Out Time</span>
                  <span className="text-base font-bold text-slate-900 mt-1 block font-mono">
                    {formatTime(todayRecord?.checkOut)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {todayRecord?.workingHours !== null && todayRecord?.workingHours !== undefined
                      ? `${todayRecord.workingHours} hrs duration`
                      : todayRecord?.checkIn
                      ? 'In Progress...'
                      : 'Pending check-in'}
                  </span>
                </div>
              </div>

              {/* Punch Clock Actions */}
              <div className="flex flex-col gap-2.5 justify-center">
                {!todayRecord ? (
                  <Button
                    variant="teal"
                    size="lg"
                    leftIcon={LogIn}
                    isLoading={isCheckingIn}
                    onClick={handleCheckIn}
                    className="w-full shadow-md"
                  >
                    Check-In Now
                  </Button>
                ) : !todayRecord.checkOut ? (
                  <Button
                    variant="danger"
                    size="lg"
                    leftIcon={LogOut}
                    onClick={() => setIsCheckOutModalOpen(true)}
                    className="w-full shadow-md"
                  >
                    Check-Out Now
                  </Button>
                ) : (
                  <div className="p-3 text-center rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    Today's Attendance Recorded
                  </div>
                )}

                <p className="text-[11px] text-slate-400 text-center">
                  Timestamp recorded directly to enterprise database
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Attendance Summary Metrics */}
      {mySummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Attendance Rate</span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">
              {mySummary.attendancePercentage}%
            </span>
            <span className="text-[10px] text-slate-400">Monthly Avg</span>
          </Card>

          <Card className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Working Days</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">
              {mySummary.totalWorkingDays}
            </span>
            <span className="text-[10px] text-slate-400">Total Month</span>
          </Card>

          <Card className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Present</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              {mySummary.presentDays}
            </span>
            <span className="text-[10px] text-slate-400">Full Days</span>
          </Card>

          <Card className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Late Arrivals</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">
              {mySummary.lateDays}
            </span>
            <span className="text-[10px] text-slate-400">After 09:30 AM</span>
          </Card>

          <Card className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Half Days</span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">
              {mySummary.halfDays}
            </span>
            <span className="text-[10px] text-slate-400">&lt; 4 Hours</span>
          </Card>

          <Card className="p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Absent</span>
            <span className="text-2xl font-bold text-rose-600 mt-1 block">
              {mySummary.absentDays}
            </span>
            <span className="text-[10px] text-slate-400">Unrecorded</span>
          </Card>
        </div>
      )}

      {/* Main Attendance Logs Section with Role-Based Navigation */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Attendance History & Records</CardTitle>
              <CardDescription>
                Audited timestamps from Spring Boot AttendanceService
              </CardDescription>
            </div>

            {/* View Selector for Admin & Manager */}
            {(isAdmin || isManager) && (
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('my')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'my'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Attendance Logs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('daily')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'daily'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Team Daily Roster
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('monthly')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'monthly'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly Roster
                </button>
              </div>
            )}
          </div>

          {/* Secondary Filter Controls for Daily and Monthly Views */}
          {activeTab === 'daily' && (isAdmin || isManager) && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
              <label htmlFor="select-date" className="text-xs font-semibold text-slate-700">
                Filter by Date:
              </label>
              <input
                id="select-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-slate-300 text-xs py-1.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={loadTeamDateAttendance}
                isLoading={isTeamDateLoading}
              >
                Apply Date
              </Button>
            </div>
          )}

          {activeTab === 'monthly' && (isAdmin || isManager) && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 text-xs py-1.5 px-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 text-xs py-1.5 px-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadTeamMonthlyAttendance}
                isLoading={isTeamMonthlyLoading}
              >
                Apply Period
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {/* TAB 1: My Personal Attendance Logs */}
          {activeTab === 'my' && (
            <>
              {isLogsLoading ? (
                <LoadingState message="Loading your attendance history..." fullHeight />
              ) : myLogs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={History}
                    title="No attendance records found"
                    description="Punch logs will appear here once you record your first daily check-in."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">Date</th>
                        <th scope="col" className="px-6 py-3.5">Check-In</th>
                        <th scope="col" className="px-6 py-3.5">Check-Out</th>
                        <th scope="col" className="px-6 py-3.5">Working Hours</th>
                        <th scope="col" className="px-6 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                            {formatDate(log.attendanceDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-800">
                            {formatTime(log.checkIn)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-800">
                            {formatTime(log.checkOut)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700">
                            {log.workingHours !== null && log.workingHours !== undefined
                              ? `${log.workingHours} hrs`
                              : log.checkIn && !log.checkOut
                              ? <span className="text-teal-600 italic">In progress...</span>
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusBadge(log.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 2: Team Daily Attendance (Admin / Manager) */}
          {activeTab === 'daily' && (
            <>
              {isTeamDateLoading ? (
                <LoadingState message={`Fetching attendance for ${selectedDate}...`} fullHeight />
              ) : teamDateLogs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={CalendarDays}
                    title={`No records for ${selectedDate}`}
                    description="No employee attendance records exist for this selected calendar date."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">Employee</th>
                        <th scope="col" className="px-6 py-3.5">Date</th>
                        <th scope="col" className="px-6 py-3.5">Check-In</th>
                        <th scope="col" className="px-6 py-3.5">Check-Out</th>
                        <th scope="col" className="px-6 py-3.5">Hours</th>
                        <th scope="col" className="px-6 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamDateLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                            <div>
                              <span>{log.employeeName || `Employee #${log.employeeId}`}</span>
                              <span className="block text-xs font-mono text-slate-400">{log.employeeCode}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                            {formatDate(log.attendanceDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-800">
                            {formatTime(log.checkIn)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-800">
                            {formatTime(log.checkOut)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700">
                            {log.workingHours !== null && log.workingHours !== undefined
                              ? `${log.workingHours} hrs`
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusBadge(log.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 3: Team Monthly Attendance (Admin / Manager) */}
          {activeTab === 'monthly' && (
            <>
              {isTeamMonthlyLoading ? (
                <LoadingState message={`Fetching monthly logs for ${selectedMonth}/${selectedYear}...`} fullHeight />
              ) : teamMonthlyLogs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Calendar}
                    title="No monthly records found"
                    description={`No attendance records registered for ${selectedMonth}/${selectedYear}.`}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">Employee</th>
                        <th scope="col" className="px-6 py-3.5">Date</th>
                        <th scope="col" className="px-6 py-3.5">Check-In</th>
                        <th scope="col" className="px-6 py-3.5">Check-Out</th>
                        <th scope="col" className="px-6 py-3.5">Hours</th>
                        <th scope="col" className="px-6 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamMonthlyLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                            <div>
                              <span>{log.employeeName || `Employee #${log.employeeId}`}</span>
                              <span className="block text-xs font-mono text-slate-400">{log.employeeCode}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                            {formatDate(log.attendanceDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-800">
                            {formatTime(log.checkIn)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-800">
                            {formatTime(log.checkOut)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700">
                            {log.workingHours !== null && log.workingHours !== undefined
                              ? `${log.workingHours} hrs`
                              : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusBadge(log.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Check-Out Confirmation Modal */}
      {isCheckOutModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 id="checkout-modal-title" className="text-lg font-bold text-slate-900">
              Confirm Check-Out?
            </h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Are you sure you want to clock out of your current shift?
            </p>
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              Policy Reminder: The minimum duration for a full working day is 4.0 hours (240 minutes). Clocking out prior to 4 hours will record this session as a HALF_DAY status.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsCheckOutModalOpen(false)}
                disabled={isCheckingOut}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                isLoading={isCheckingOut}
                onClick={handleCheckOutConfirm}
                leftIcon={Check}
              >
                Confirm Check-Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendancePage;

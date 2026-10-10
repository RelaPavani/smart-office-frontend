import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  User,
  Users,
  Check,
  X,
  UserPlus,
  UserMinus,
  Layers,
  Video,
  CalendarDays,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { InputField } from '../components/common/InputField';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { meetingService } from '../services/meetingService';
import { employeeService } from '../services/employeeService';

// Meeting Status Metadata
const MEETING_STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', variant: 'info', icon: Clock },
  ONGOING: { label: 'Ongoing', variant: 'warning', icon: RefreshCw },
  COMPLETED: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', variant: 'danger', icon: XCircle },
};

// Participant Attendance Status Metadata
const PARTICIPANT_STATUS_CONFIG = {
  INVITED: { label: 'Invited', variant: 'neutral' },
  ACCEPTED: { label: 'Accepted', variant: 'success' },
  DECLINED: { label: 'Declined', variant: 'danger' },
  ATTENDED: { label: 'Attended', variant: 'primary' },
};

export function MeetingsPage() {
  const { showToast } = useApp();
  const { user, isAdmin, isManager, isEmployee } = useAuth();

  const canManageMeetings = isAdmin || isManager;

  // View preferences
  const [viewScope, setViewScope] = useState(canManageMeetings ? 'all' : 'my'); // 'all' | 'my'
  const [timelineFilter, setTimelineFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'PAST'
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Data states
  const [meetings, setMeetings] = useState([]);
  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [detailsModalMeeting, setDetailsModalMeeting] = useState(null);
  const [cancellingMeeting, setCancellingMeeting] = useState(null);

  // Participant Management in Details Modal
  const [meetingParticipants, setMeetingParticipants] = useState([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [selectedInviteEmployeeId, setSelectedInviteEmployeeId] = useState('');
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState(null);
  const [updatingParticipantId, setUpdatingParticipantId] = useState(null);

  // Forms state
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    startDateTime: '',
    endDateTime: '',
    agenda: '',
    organizerId: '',
    status: 'SCHEDULED',
  });
  const [scheduleErrors, setScheduleErrors] = useState({});
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [scheduleServerErrorMessage, setScheduleServerErrorMessage] = useState(null);

  const [editForm, setEditForm] = useState({
    id: null,
    title: '',
    startDateTime: '',
    endDateTime: '',
    agenda: '',
    status: 'SCHEDULED',
  });
  const [editErrors, setEditErrors] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editServerErrorMessage, setEditServerErrorMessage] = useState(null);

  const [isCancelling, setIsCancelling] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Resolve current employee profile
   */
  const loadCurrentEmployee = useCallback(async () => {
    try {
      const emp = await employeeService.getCurrentEmployee();
      if (emp && emp.id) {
        setCurrentEmployee(emp);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  /**
   * Load active employees for assignment and participant invitations
   */
  const loadEmployees = useCallback(async () => {
    if (!canManageMeetings) return;
    try {
      const data = await employeeService.getEmployees({ status: 'ACTIVE' });
      setAssignableEmployees(Array.isArray(data) ? data : []);
    } catch {
      // Non-blocking
    }
  }, [canManageMeetings]);

  /**
   * Fetch meetings according to active view scope
   */
  const loadMeetings = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        let data = [];
        if (viewScope === 'my') {
          data = await meetingService.getMyMeetings();
        } else {
          const filters = {};
          if (statusFilter !== 'ALL') filters.status = statusFilter;
          data = await meetingService.getMeetings(filters);
        }

        setMeetings(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to load meetings';
        setErrorMessage(msg);
        showToast(msg, 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [viewScope, statusFilter, showToast]
  );

  // Initial load
  useEffect(() => {
    loadCurrentEmployee();
    loadEmployees();
  }, [loadCurrentEmployee, loadEmployees]);

  // Reload when scope or status filter changes
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  /**
   * Format ISO date/time to local display string
   */
  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  /**
   * Format date for HTML input type="datetime-local"
   */
  const formatForDateTimeInput = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${mins}`;
    } catch {
      return '';
    }
  };

  /**
   * Calculate human readable duration
   */
  const getDurationString = (start, end) => {
    if (!start || !end) return '';
    try {
      const diffMs = new Date(end) - new Date(start);
      if (diffMs <= 0) return '';
      const diffMins = Math.round(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
      if (hours > 0) return `${hours} hr`;
      return `${mins} min`;
    } catch {
      return '';
    }
  };

  /**
   * Check if meeting is in past
   */
  const isPastMeeting = (meeting) => {
    if (!meeting?.endDateTime) return false;
    try {
      return new Date(meeting.endDateTime) < new Date();
    } catch {
      return false;
    }
  };

  /**
   * Check if meeting is upcoming
   */
  const isUpcomingMeeting = (meeting) => {
    if (!meeting?.startDateTime) return false;
    if (meeting.status === 'CANCELLED' || meeting.status === 'COMPLETED') return false;
    try {
      return new Date(meeting.startDateTime) >= new Date();
    } catch {
      return false;
    }
  };

  /**
   * Filtered list based on timeline tabs and search
   */
  const processedMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter((m) => {
      // Timeline filter
      if (timelineFilter === 'UPCOMING') {
        if (m.status === 'CANCELLED' || m.status === 'COMPLETED') return false;
        if (m.endDateTime && new Date(m.endDateTime) < now) return false;
      } else if (timelineFilter === 'PAST') {
        const isPast = m.endDateTime && new Date(m.endDateTime) < now;
        const isDone = m.status === 'COMPLETED' || m.status === 'CANCELLED';
        if (!isPast && !isDone) return false;
      }

      // Status filter (applied in-memory if in 'my' scope)
      if (statusFilter !== 'ALL' && m.status !== statusFilter) {
        return false;
      }

      // Search query
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const matchTitle = m.title?.toLowerCase().includes(term);
        const matchAgenda = m.agenda?.toLowerCase().includes(term);
        const matchOrganizer = m.organizerName?.toLowerCase().includes(term);
        if (!matchTitle && !matchAgenda && !matchOrganizer) return false;
      }

      return true;
    });
  }, [meetings, timelineFilter, statusFilter, debouncedSearch]);

  /**
   * KPI Metrics
   */
  const kpiStats = useMemo(() => {
    const total = meetings.length;
    const now = new Date();

    let upcoming = 0;
    let ongoing = 0;
    let completed = 0;
    let cancelled = 0;

    meetings.forEach((m) => {
      if (m.status === 'CANCELLED') {
        cancelled++;
      } else if (
        m.status === 'COMPLETED' ||
        (m.endDateTime && new Date(m.endDateTime) < now)
      ) {
        completed++;
      } else if (
        m.status === 'ONGOING' ||
        (m.startDateTime && m.endDateTime && new Date(m.startDateTime) <= now && new Date(m.endDateTime) >= now)
      ) {
        ongoing++;
      } else {
        upcoming++;
      }
    });

    return { total, upcoming, ongoing, completed, cancelled };
  }, [meetings]);

  /**
   * Load participants for a specific meeting
   */
  const loadParticipants = useCallback(async (meetingId) => {
    try {
      setIsLoadingParticipants(true);
      const data = await meetingService.getMeetingParticipants(meetingId);
      setMeetingParticipants(Array.isArray(data) ? data : []);
    } catch {
      setMeetingParticipants([]);
    } finally {
      setIsLoadingParticipants(false);
    }
  }, []);

  /**
   * Open Meeting Details Modal
   */
  const handleOpenDetailsModal = (meeting) => {
    setDetailsModalMeeting(meeting);
    setSelectedInviteEmployeeId('');
    loadParticipants(meeting.id);
  };

  /**
   * Open Schedule Meeting Modal
   */
  const handleOpenScheduleModal = () => {
    // Default start time: top of next hour
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const startStr = formatForDateTimeInput(now.toISOString());

    // Default end time: 1 hour after start
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const endStr = formatForDateTimeInput(end.toISOString());

    const defaultOrganizer = currentEmployee ? String(currentEmployee.id) : assignableEmployees[0]?.id ? String(assignableEmployees[0].id) : '';

    setScheduleForm({
      title: '',
      startDateTime: startStr,
      endDateTime: endStr,
      agenda: '',
      organizerId: defaultOrganizer,
      status: 'SCHEDULED',
    });
    setScheduleErrors({});
    setScheduleServerErrorMessage(null);
    setIsScheduleModalOpen(true);
  };

  /**
   * Submit Schedule Meeting
   */
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!scheduleForm.title.trim()) {
      errors.title = 'Meeting title is required';
    } else if (scheduleForm.title.length > 150) {
      errors.title = 'Title cannot exceed 150 characters';
    }

    if (!scheduleForm.startDateTime) {
      errors.startDateTime = 'Start date and time is required';
    } else {
      const startDate = new Date(scheduleForm.startDateTime);
      if (startDate < new Date(Date.now() - 5 * 60000)) {
        errors.startDateTime = 'Start time cannot be in the past';
      }
    }

    if (!scheduleForm.endDateTime) {
      errors.endDateTime = 'End date and time is required';
    } else if (scheduleForm.startDateTime) {
      const startDate = new Date(scheduleForm.startDateTime);
      const endDate = new Date(scheduleForm.endDateTime);
      if (endDate <= startDate) {
        errors.endDateTime = 'End time must be strictly after start time';
      }
    }

    if (!scheduleForm.organizerId) {
      errors.organizerId = 'Please select a meeting organizer';
    }

    if (Object.keys(errors).length > 0) {
      setScheduleErrors(errors);
      return;
    }

    try {
      setIsSubmittingSchedule(true);
      setScheduleServerErrorMessage(null);

      const payload = {
        title: scheduleForm.title.trim(),
        startDateTime: scheduleForm.startDateTime.length === 16 ? `${scheduleForm.startDateTime}:00` : scheduleForm.startDateTime,
        endDateTime: scheduleForm.endDateTime.length === 16 ? `${scheduleForm.endDateTime}:00` : scheduleForm.endDateTime,
        agenda: scheduleForm.agenda.trim(),
        organizerId: Number(scheduleForm.organizerId),
        status: scheduleForm.status,
      };

      const created = await meetingService.createMeeting(payload);
      showToast('Meeting scheduled successfully', 'success');
      setIsScheduleModalOpen(false);
      loadMeetings(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to schedule meeting';
      setScheduleServerErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  /**
   * Open Edit Meeting Modal
   */
  const handleOpenEditModal = (meeting) => {
    setEditForm({
      id: meeting.id,
      title: meeting.title || '',
      startDateTime: formatForDateTimeInput(meeting.startDateTime),
      endDateTime: formatForDateTimeInput(meeting.endDateTime),
      agenda: meeting.agenda || '',
      status: meeting.status || 'SCHEDULED',
    });
    setEditErrors({});
    setEditServerErrorMessage(null);
    setIsEditModalOpen(true);
  };

  /**
   * Submit Edit Meeting
   */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!editForm.title.trim()) {
      errors.title = 'Meeting title is required';
    } else if (editForm.title.length > 150) {
      errors.title = 'Title cannot exceed 150 characters';
    }

    if (editForm.startDateTime && editForm.endDateTime) {
      const startDate = new Date(editForm.startDateTime);
      const endDate = new Date(editForm.endDateTime);
      if (endDate <= startDate) {
        errors.endDateTime = 'End time must be after start time';
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditServerErrorMessage(null);

      const payload = {
        title: editForm.title.trim(),
        agenda: editForm.agenda.trim(),
        status: editForm.status,
      };

      if (editForm.startDateTime) {
        payload.startDateTime = editForm.startDateTime.length === 16 ? `${editForm.startDateTime}:00` : editForm.startDateTime;
      }
      if (editForm.endDateTime) {
        payload.endDateTime = editForm.endDateTime.length === 16 ? `${editForm.endDateTime}:00` : editForm.endDateTime;
      }

      const updated = await meetingService.updateMeeting(editForm.id, payload);
      showToast('Meeting updated successfully', 'success');
      setIsEditModalOpen(false);

      setMeetings((prev) => prev.map((m) => (m.id === editForm.id ? updated : m)));
      if (detailsModalMeeting && detailsModalMeeting.id === editForm.id) {
        setDetailsModalMeeting(updated);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update meeting';
      setEditServerErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  /**
   * Cancel Meeting
   */
  const handleCancelMeeting = async () => {
    if (!cancellingMeeting) return;
    try {
      setIsCancelling(true);
      const updated = await meetingService.updateMeetingStatus(cancellingMeeting.id, 'CANCELLED');
      showToast('Meeting cancelled successfully', 'success');
      setMeetings((prev) => prev.map((m) => (m.id === cancellingMeeting.id ? updated : m)));
      if (detailsModalMeeting && detailsModalMeeting.id === cancellingMeeting.id) {
        setDetailsModalMeeting(updated);
      }
      setCancellingMeeting(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to cancel meeting';
      showToast(msg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  /**
   * Quick meeting status update (e.g. mark ONGOING or COMPLETED)
   */
  const handleQuickStatusUpdate = async (meetingId, newStatus) => {
    try {
      const updated = await meetingService.updateMeetingStatus(meetingId, newStatus);
      showToast(`Meeting status marked as ${MEETING_STATUS_CONFIG[newStatus]?.label || newStatus}`, 'success');
      setMeetings((prev) => prev.map((m) => (m.id === meetingId ? updated : m)));
      if (detailsModalMeeting && detailsModalMeeting.id === meetingId) {
        setDetailsModalMeeting(updated);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update meeting status';
      showToast(msg, 'error');
    }
  };

  /**
   * Add Participant
   */
  const handleAddParticipant = async () => {
    if (!detailsModalMeeting || !selectedInviteEmployeeId) return;
    try {
      setIsAddingParticipant(true);
      const newParticipant = await meetingService.addParticipant(
        detailsModalMeeting.id,
        selectedInviteEmployeeId,
        'INVITED'
      );
      showToast('Participant invited successfully', 'success');
      setMeetingParticipants((prev) => [...prev, newParticipant]);
      setSelectedInviteEmployeeId('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to invite participant';
      showToast(msg, 'error');
    } finally {
      setIsAddingParticipant(false);
    }
  };

  /**
   * Remove Participant
   */
  const handleRemoveParticipant = async (employeeId) => {
    if (!detailsModalMeeting) return;
    try {
      setRemovingParticipantId(employeeId);
      await meetingService.removeParticipant(detailsModalMeeting.id, employeeId);
      showToast('Participant removed', 'success');
      setMeetingParticipants((prev) => prev.filter((p) => p.employeeId !== employeeId));
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to remove participant';
      showToast(msg, 'error');
    } finally {
      setRemovingParticipantId(null);
    }
  };

  /**
   * Update Participant Attendance Status (e.g. ACCEPTED, DECLINED, ATTENDED)
   */
  const handleUpdateParticipantStatus = async (employeeId, newStatus) => {
    if (!detailsModalMeeting) return;
    try {
      setUpdatingParticipantId(employeeId);
      const updated = await meetingService.updateParticipantStatus(
        detailsModalMeeting.id,
        employeeId,
        newStatus
      );
      showToast(`Attendance status updated to ${PARTICIPANT_STATUS_CONFIG[newStatus]?.label || newStatus}`, 'success');
      setMeetingParticipants((prev) =>
        prev.map((p) => (p.employeeId === employeeId ? updated : p))
      );
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update attendance status';
      showToast(msg, 'error');
    } finally {
      setUpdatingParticipantId(null);
    }
  };

  /**
   * Check if user is organizer of this meeting
   */
  const isMeetingOrganizer = (meeting) => {
    if (!currentEmployee || !meeting) return false;
    return meeting.organizerId === currentEmployee.id;
  };

  /**
   * Check if current user can modify this meeting
   */
  const canModifyMeeting = (meeting) => {
    if (isAdmin) return true;
    if (isManager && isMeetingOrganizer(meeting)) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Meetings"
        description="Schedule corporate conferences, track real-time agendas, and coordinate attendee invitations."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Meetings' }]}
        badge={<Badge variant="primary" dot>REST Endpoint: /api/meetings</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              isLoading={isRefreshing}
              onClick={() => loadMeetings(true)}
            >
              Refresh
            </Button>
            {canManageMeetings && (
              <Button
                size="sm"
                leftIcon={Plus}
                onClick={handleOpenScheduleModal}
              >
                Schedule Meeting
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.total}</div>
            <div className="text-xs text-slate-500 mt-0.5">Across current scope</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming</span>
              <CalendarDays className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.upcoming}</div>
            <div className="text-xs text-slate-500 mt-0.5">Scheduled ahead</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Session</span>
              <RefreshCw className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.ongoing}</div>
            <div className="text-xs text-slate-500 mt-0.5">Active or ongoing</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.completed}</div>
            <div className="text-xs text-slate-500 mt-0.5">Finished sessions</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cancelled</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.cancelled}</div>
            <div className="text-xs text-slate-500 mt-0.5">Aborted sessions</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Scope & Timeline Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b lg:border-b-0 pb-3 lg:pb-0">
              {canManageMeetings && (
                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg mr-2">
                  <button
                    type="button"
                    onClick={() => setViewScope('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      viewScope === 'all'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Meetings
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewScope('my')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      viewScope === 'my'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    My Meetings
                  </button>
                </div>
              )}

              {/* Timeline filters */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
                {['ALL', 'UPCOMING', 'PAST'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTimelineFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${
                      timelineFilter === filter
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Status Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search meeting title, agenda, organizer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Meetings Listing */}
      {isLoading ? (
        <LoadingState message="Loading scheduled meetings from backend..." />
      ) : errorMessage ? (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-rose-900 mb-1">Failed to Load Meetings</h3>
            <p className="text-sm text-rose-700 mb-4">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={() => loadMeetings()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : processedMeetings.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={Calendar}
              title={
                searchQuery || statusFilter !== 'ALL' || timelineFilter !== 'ALL'
                  ? 'No Meetings Match Your Filters'
                  : viewScope === 'my'
                  ? 'No Meetings on Your Schedule'
                  : 'No Meetings Scheduled'
              }
              description={
                searchQuery || statusFilter !== 'ALL' || timelineFilter !== 'ALL'
                  ? 'Try clearing the search query or adjusting your status and timeline filters.'
                  : canManageMeetings
                  ? 'Create and coordinate new company meetings with active employee attendees.'
                  : 'You have not been invited to or organized any scheduled meetings.'
              }
              action={
                searchQuery || statusFilter !== 'ALL' || timelineFilter !== 'ALL' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                      setTimelineFilter('ALL');
                    }}
                  >
                    Clear All Filters
                  </Button>
                ) : canManageMeetings ? (
                  <Button size="sm" leftIcon={Plus} onClick={handleOpenScheduleModal}>
                    Schedule First Meeting
                  </Button>
                ) : null
              }
            />
          </CardContent>
        </Card>
      ) : (
        /* Meetings Card / List View */
        <div className="space-y-3">
          {processedMeetings.map((meeting) => {
            const statusConf = MEETING_STATUS_CONFIG[meeting.status] || MEETING_STATUS_CONFIG.SCHEDULED;
            const durationStr = getDurationString(meeting.startDateTime, meeting.endDateTime);
            const isPast = isPastMeeting(meeting);
            const isUpcoming = isUpcomingMeeting(meeting);
            const canModify = canModifyMeeting(meeting);

            // Date parsing for visual date pill
            const startDate = meeting.startDateTime ? new Date(meeting.startDateTime) : null;
            const monthStr = startDate ? startDate.toLocaleString(undefined, { month: 'short' }).toUpperCase() : '—';
            const dayStr = startDate ? startDate.getDate() : '—';
            const timeStr = startDate
              ? startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              : '';
            const endTimeStr = meeting.endDateTime
              ? new Date(meeting.endDateTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <Card
                key={meeting.id}
                className={`hover:border-blue-300 transition-all ${
                  meeting.status === 'CANCELLED' ? 'opacity-70 bg-slate-50/50' : ''
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Left: Date Badge + Meeting Details */}
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="shrink-0 w-14 text-center border border-blue-200 bg-blue-50/60 rounded-xl py-2 px-1 text-slate-800">
                        <span className="block text-[10px] font-bold tracking-wider text-blue-600">
                          {monthStr}
                        </span>
                        <span className="block text-xl font-extrabold text-slate-900 leading-none mt-0.5">
                          {dayStr}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailsModal(meeting)}
                            className="text-base font-bold text-slate-900 hover:text-blue-600 text-left transition-colors"
                          >
                            {meeting.title}
                          </button>
                          <Badge variant={statusConf.variant} dot>
                            {statusConf.label}
                          </Badge>
                          {isUpcoming && (
                            <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                              Upcoming
                            </span>
                          )}
                        </div>

                        {/* Timing and Duration */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1 font-medium text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {timeStr} – {endTimeStr}
                            </span>
                            {durationStr && <span className="text-slate-400">({durationStr})</span>}
                          </div>

                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Organizer:</span>
                            <span className="font-semibold text-slate-800">
                              {meeting.organizerName || 'Unassigned'}
                            </span>
                          </div>
                        </div>

                        {/* Agenda snippet */}
                        {meeting.agenda && (
                          <p className="text-xs text-slate-600 line-clamp-1 pt-0.5">
                            {meeting.agenda}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={Eye}
                        onClick={() => handleOpenDetailsModal(meeting)}
                      >
                        Details
                      </Button>

                      {canModify && meeting.status !== 'CANCELLED' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                            title="Edit Meeting"
                            onClick={() => handleOpenEditModal(meeting)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"
                            title="Cancel Meeting"
                            onClick={() => setCancellingMeeting(meeting)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= SCHEDULE MEETING MODAL ================= */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">Schedule New Meeting</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-4 space-y-4">
              {scheduleServerErrorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{scheduleServerErrorMessage}</span>
                </div>
              )}

              {/* Title */}
              <InputField
                label="Meeting Title *"
                placeholder="e.g. Q4 Sprint Planning & Alignment"
                value={scheduleForm.title}
                onChange={(e) => {
                  setScheduleForm({ ...scheduleForm, title: e.target.value });
                  if (scheduleErrors.title) setScheduleErrors({ ...scheduleErrors, title: null });
                }}
                error={scheduleErrors.title}
                helperText="Maximum 150 characters"
              />

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Date Time */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.startDateTime}
                    onChange={(e) => {
                      setScheduleForm({ ...scheduleForm, startDateTime: e.target.value });
                      if (scheduleErrors.startDateTime) setScheduleErrors({ ...scheduleErrors, startDateTime: null });
                    }}
                    className={`w-full text-xs px-2.5 py-2 border rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      scheduleErrors.startDateTime ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  />
                  {scheduleErrors.startDateTime && (
                    <p className="text-[11px] text-rose-600">{scheduleErrors.startDateTime}</p>
                  )}
                </div>

                {/* End Date Time */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.endDateTime}
                    onChange={(e) => {
                      setScheduleForm({ ...scheduleForm, endDateTime: e.target.value });
                      if (scheduleErrors.endDateTime) setScheduleErrors({ ...scheduleErrors, endDateTime: null });
                    }}
                    className={`w-full text-xs px-2.5 py-2 border rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      scheduleErrors.endDateTime ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  />
                  {scheduleErrors.endDateTime && (
                    <p className="text-[11px] text-rose-600">{scheduleErrors.endDateTime}</p>
                  )}
                </div>
              </div>

              {/* Organizer */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Meeting Organizer *
                </label>
                <select
                  value={scheduleForm.organizerId}
                  disabled={!isAdmin && currentEmployee} // Managers organize their own meetings
                  onChange={(e) => {
                    setScheduleForm({ ...scheduleForm, organizerId: e.target.value });
                    if (scheduleErrors.organizerId) setScheduleErrors({ ...scheduleErrors, organizerId: null });
                  }}
                  className={`w-full text-xs px-2.5 py-2 border rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    scheduleErrors.organizerId ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select Organizer Employee...</option>
                  {assignableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
                {scheduleErrors.organizerId && (
                  <p className="text-[11px] text-rose-600">{scheduleErrors.organizerId}</p>
                )}
              </div>

              {/* Agenda */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Meeting Agenda</label>
                <textarea
                  rows={3}
                  placeholder="State the meeting objective, topics to discuss, or required preparation..."
                  value={scheduleForm.agenda}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, agenda: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScheduleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmittingSchedule}
                  leftIcon={Plus}
                >
                  Schedule Meeting
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT MEETING MODAL ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  Edit Meeting #{editForm.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
              {editServerErrorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{editServerErrorMessage}</span>
                </div>
              )}

              {/* Title */}
              <InputField
                label="Meeting Title *"
                value={editForm.title}
                onChange={(e) => {
                  setEditForm({ ...editForm, title: e.target.value });
                  if (editErrors.title) setEditErrors({ ...editErrors, title: null });
                }}
                error={editErrors.title}
                helperText="Maximum 150 characters"
              />

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Date Time */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.startDateTime}
                    onChange={(e) => setEditForm({ ...editForm, startDateTime: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* End Date Time */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.endDateTime}
                    onChange={(e) => {
                      setEditForm({ ...editForm, endDateTime: e.target.value });
                      if (editErrors.endDateTime) setEditErrors({ ...editErrors, endDateTime: null });
                    }}
                    className={`w-full text-xs px-2.5 py-2 border rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editErrors.endDateTime ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  />
                  {editErrors.endDateTime && (
                    <p className="text-[11px] text-rose-600">{editErrors.endDateTime}</p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Agenda */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Meeting Agenda</label>
                <textarea
                  rows={3}
                  value={editForm.agenda}
                  onChange={(e) => setEditForm({ ...editForm, agenda: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmittingEdit}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MEETING DETAILS & PARTICIPANTS MODAL ================= */}
      {detailsModalMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={MEETING_STATUS_CONFIG[detailsModalMeeting.status]?.variant || 'neutral'}
                    dot
                  >
                    {MEETING_STATUS_CONFIG[detailsModalMeeting.status]?.label || detailsModalMeeting.status}
                  </Badge>
                  {isUpcomingMeeting(detailsModalMeeting) && (
                    <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                      Upcoming
                    </span>
                  )}
                  {isPastMeeting(detailsModalMeeting) && (
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Past
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 pt-1">
                  {detailsModalMeeting.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalMeeting(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-6">
              {/* Timing & Organizer Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-1">Date & Time</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{formatDateTime(detailsModalMeeting.startDateTime)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 pl-5">
                    to {formatDateTime(detailsModalMeeting.endDateTime)}{' '}
                    {getDurationString(detailsModalMeeting.startDateTime, detailsModalMeeting.endDateTime) && (
                      <span className="font-medium text-slate-700">
                        ({getDurationString(detailsModalMeeting.startDateTime, detailsModalMeeting.endDateTime)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-1">Meeting Organizer</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{detailsModalMeeting.organizerName || 'Unassigned'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 pl-5">
                    Organizer ID: #{detailsModalMeeting.organizerId}
                  </div>
                </div>
              </div>

              {/* Agenda */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Meeting Agenda
                </h4>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-200/60">
                  {detailsModalMeeting.agenda || 'No agenda provided for this meeting.'}
                </div>
              </div>

              {/* Quick Status Advancement (for Organizer or Admin) */}
              {canModifyMeeting(detailsModalMeeting) && detailsModalMeeting.status !== 'CANCELLED' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Update Meeting Status</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {detailsModalMeeting.status !== 'ONGOING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickStatusUpdate(detailsModalMeeting.id, 'ONGOING')}
                      >
                        Start Meeting (Ongoing)
                      </Button>
                    )}
                    {detailsModalMeeting.status !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleQuickStatusUpdate(detailsModalMeeting.id, 'COMPLETED')}
                      >
                        Mark as Completed
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setCancellingMeeting(detailsModalMeeting)}
                    >
                      Cancel Meeting
                    </Button>
                  </div>
                </div>
              )}

              {/* ================= PARTICIPANTS SECTION ================= */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Invited Attendees ({meetingParticipants.length})
                    </h4>
                  </div>
                </div>

                {/* Add Participant input (for Admin/Organizer) */}
                {canModifyMeeting(detailsModalMeeting) && detailsModalMeeting.status !== 'CANCELLED' && (
                  <div className="flex items-center gap-2 mb-3">
                    <select
                      value={selectedInviteEmployeeId}
                      onChange={(e) => setSelectedInviteEmployeeId(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    >
                      <option value="">Select team member to invite...</option>
                      {assignableEmployees
                        .filter(
                          (emp) =>
                            !meetingParticipants.some((p) => p.employeeId === emp.id)
                        )
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeCode})
                          </option>
                        ))}
                    </select>
                    <Button
                      size="sm"
                      leftIcon={UserPlus}
                      disabled={!selectedInviteEmployeeId}
                      isLoading={isAddingParticipant}
                      onClick={handleAddParticipant}
                    >
                      Invite
                    </Button>
                  </div>
                )}

                {/* Participants Roster List */}
                {isLoadingParticipants ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Loading attendees...
                  </div>
                ) : meetingParticipants.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    No participants invited yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {meetingParticipants.map((p) => {
                      const pStatusConf = PARTICIPANT_STATUS_CONFIG[p.attendanceStatus] || PARTICIPANT_STATUS_CONFIG.INVITED;
                      const isSelf = currentEmployee && p.employeeId === currentEmployee.id;
                      const isOrganizer = detailsModalMeeting.organizerId === p.employeeId;

                      return (
                        <div
                          key={p.id}
                          className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                              {p.employeeName ? p.employeeName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-semibold text-slate-800">
                                {p.employeeName}
                              </span>
                              {isOrganizer && (
                                <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  Organizer
                                </span>
                              )}
                              <span className="block text-[10px] text-slate-400">
                                {p.employeeCode}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={pStatusConf.variant} size="sm">
                              {pStatusConf.label}
                            </Badge>

                            {/* Self RSVP action */}
                            {isSelf && detailsModalMeeting.status !== 'CANCELLED' && p.attendanceStatus !== 'ATTENDED' && (
                              <div className="flex items-center gap-1">
                                {p.attendanceStatus !== 'ACCEPTED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateParticipantStatus(p.employeeId, 'ACCEPTED')}
                                    disabled={updatingParticipantId === p.employeeId}
                                    className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 font-medium transition-colors"
                                  >
                                    Accept
                                  </button>
                                )}
                                {p.attendanceStatus !== 'DECLINED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateParticipantStatus(p.employeeId, 'DECLINED')}
                                    disabled={updatingParticipantId === p.employeeId}
                                    className="text-[11px] px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 font-medium transition-colors"
                                  >
                                    Decline
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Organizer / Admin Mark as Attended */}
                            {canModifyMeeting(detailsModalMeeting) && !isOrganizer && (
                              <div className="flex items-center gap-1">
                                {p.attendanceStatus !== 'ATTENDED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateParticipantStatus(p.employeeId, 'ATTENDED')}
                                    disabled={updatingParticipantId === p.employeeId}
                                    title="Mark as Attended"
                                    className="text-[11px] px-1.5 py-0.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded border border-sky-200 font-medium transition-colors"
                                  >
                                    Attended
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleRemoveParticipant(p.employeeId)}
                                  disabled={removingParticipantId === p.employeeId}
                                  title="Remove attendee"
                                  className="text-slate-400 hover:text-rose-600 p-0.5"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                {canModifyMeeting(detailsModalMeeting) && detailsModalMeeting.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:text-rose-700 border-rose-200"
                    leftIcon={XCircle}
                    onClick={() => setCancellingMeeting(detailsModalMeeting)}
                  >
                    Cancel Meeting
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canModifyMeeting(detailsModalMeeting) && detailsModalMeeting.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={Edit2}
                    onClick={() => {
                      handleOpenEditModal(detailsModalMeeting);
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button size="sm" onClick={() => setDetailsModalMeeting(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CANCEL MEETING CONFIRMATION MODAL ================= */}
      {cancellingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Cancel Meeting?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to cancel the meeting{' '}
              <span className="font-semibold text-slate-900">"{cancellingMeeting.title}"</span>? Participants will see this session marked as cancelled.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancellingMeeting(null)}
                disabled={isCancelling}
              >
                Keep Meeting
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isCancelling}
                onClick={handleCancelMeeting}
              >
                Yes, Cancel Meeting
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MeetingsPage;

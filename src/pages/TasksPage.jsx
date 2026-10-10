import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  User,
  Calendar,
  LayoutGrid,
  List,
  X,
  Check,
  Briefcase,
  Layers,
  ArrowRight,
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
import { taskService } from '../services/taskService';
import { employeeService } from '../services/employeeService';

// Priority display metadata
const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', variant: 'danger', order: 1 },
  HIGH: { label: 'High', variant: 'warning', order: 2 },
  MEDIUM: { label: 'Medium', variant: 'info', order: 3 },
  LOW: { label: 'Low', variant: 'neutral', order: 4 },
};

// Status display metadata
const STATUS_CONFIG = {
  TODO: { label: 'To Do', variant: 'neutral', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', variant: 'primary', icon: RefreshCw },
  COMPLETED: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', variant: 'danger', icon: XCircle },
};

export function TasksPage() {
  const { showToast } = useApp();
  const { user, isAdmin, isManager, isEmployee } = useAuth();

  // Role ability flags
  const canManageTasks = isAdmin || isManager;

  // View preferences
  const [viewScope, setViewScope] = useState(canManageTasks ? 'team' : 'my'); // 'team' | 'my'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  // Data states
  const [tasks, setTasks] = useState([]);
  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [detailsModalTask, setDetailsModalTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [statusUpdatingTaskId, setStatusUpdatingTaskId] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assignedToId: '',
    priority: 'MEDIUM',
    deadline: '',
    status: 'TODO',
  });
  const [createErrors, setCreateErrors] = useState({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createServerErrorMessage, setCreateServerErrorMessage] = useState(null);

  const [editForm, setEditForm] = useState({
    id: null,
    title: '',
    description: '',
    assignedToId: '',
    priority: 'MEDIUM',
    deadline: '',
    status: 'TODO',
  });
  const [editErrors, setEditErrors] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editServerErrorMessage, setEditServerErrorMessage] = useState(null);

  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Resolve current authenticated employee profile
   */
  const loadCurrentEmployeeProfile = useCallback(async () => {
    try {
      const emp = await employeeService.getCurrentEmployee();
      if (emp && emp.id) {
        setCurrentEmployee(emp);
      }
    } catch {
      // Non-blocking: will fall back to role checks
    }
  }, []);

  /**
   * Load active employees for assignment dropdowns
   */
  const loadAssignableEmployees = useCallback(async () => {
    if (!canManageTasks) return;
    try {
      const data = await employeeService.getEmployees({ status: 'ACTIVE' });
      setAssignableEmployees(Array.isArray(data) ? data : []);
    } catch {
      // Non-blocking
    }
  }, [canManageTasks]);

  /**
   * Fetch tasks based on scope and filters
   */
  const loadTasks = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        let taskData = [];
        if (viewScope === 'my') {
          const filters = {};
          if (statusFilter !== 'ALL') filters.status = statusFilter;
          if (priorityFilter !== 'ALL') filters.priority = priorityFilter;
          taskData = await taskService.getMyTasks(filters);
        } else {
          // Team / Enterprise tasks view (scoped by backend)
          const filters = {};
          if (statusFilter !== 'ALL') filters.status = statusFilter;
          if (priorityFilter !== 'ALL') filters.priority = priorityFilter;
          if (assigneeFilter !== 'ALL') filters.assignedToId = assigneeFilter;
          if (debouncedSearch) filters.search = debouncedSearch;
          taskData = await taskService.getTasks(filters);
        }

        setTasks(Array.isArray(taskData) ? taskData : []);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to load tasks';
        setErrorMessage(msg);
        showToast(msg, 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [viewScope, statusFilter, priorityFilter, assigneeFilter, debouncedSearch, showToast]
  );

  // Initial load
  useEffect(() => {
    loadCurrentEmployeeProfile();
    loadAssignableEmployees();
  }, [loadCurrentEmployeeProfile, loadAssignableEmployees]);

  // Reload tasks on filter / scope change
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /**
   * Check if a task is overdue
   */
  const isOverdue = (task) => {
    if (!task?.deadline) return false;
    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
    try {
      return new Date(task.deadline) < new Date();
    } catch {
      return false;
    }
  };

  /**
   * Format ISO date/time string
   */
  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString(undefined, {
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
   * Filtered and client-searched tasks (for instant search if needed)
   */
  const processedTasks = useMemo(() => {
    return tasks.filter((t) => {
      // If we are in 'my' scope, client-search by title & description
      if (viewScope === 'my' && debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(term);
        const matchDesc = t.description?.toLowerCase().includes(term);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [tasks, viewScope, debouncedSearch]);

  /**
   * KPI metrics
   */
  const kpiStats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === 'TODO').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    return { total, todo, inProgress, completed, overdue };
  }, [tasks]);

  /**
   * Quick status update handler
   */
  const handleQuickStatusChange = async (taskId, newStatus) => {
    try {
      setStatusUpdatingTaskId(taskId);
      await taskService.updateTaskStatus(taskId, newStatus);
      showToast(`Task status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`, 'success');

      // Update local state smoothly
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      // If modal is open with this task, update it
      if (detailsModalTask && detailsModalTask.id === taskId) {
        setDetailsModalTask((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update task status';
      showToast(msg, 'error');
    } finally {
      setStatusUpdatingTaskId(null);
    }
  };

  /**
   * Open Create Modal
   */
  const handleOpenCreateModal = () => {
    setCreateForm({
      title: '',
      description: '',
      assignedToId: assignableEmployees.length > 0 ? String(assignableEmployees[0].id) : '',
      priority: 'MEDIUM',
      deadline: '',
      status: 'TODO',
    });
    setCreateErrors({});
    setCreateServerErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  /**
   * Handle Create Task Submission
   */
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!createForm.title.trim()) {
      errors.title = 'Task title is required';
    } else if (createForm.title.length > 150) {
      errors.title = 'Title cannot exceed 150 characters';
    }

    if (!createForm.assignedToId) {
      errors.assignedToId = 'Please select an assigned employee';
    }

    if (!createForm.priority) {
      errors.priority = 'Priority is required';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    try {
      setIsSubmittingCreate(true);
      setCreateServerErrorMessage(null);

      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        assignedToId: Number(createForm.assignedToId),
        priority: createForm.priority,
        status: createForm.status,
      };

      if (createForm.deadline) {
        // Append seconds if omitted by input
        payload.deadline = createForm.deadline.length === 16 ? `${createForm.deadline}:00` : createForm.deadline;
      }

      await taskService.createTask(payload);
      showToast('Task created successfully', 'success');
      setIsCreateModalOpen(false);
      loadTasks(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create task';
      setCreateServerErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  /**
   * Open Edit Modal
   */
  const handleOpenEditModal = (task) => {
    setEditForm({
      id: task.id,
      title: task.title || '',
      description: task.description || '',
      assignedToId: task.assignedToId ? String(task.assignedToId) : '',
      priority: task.priority || 'MEDIUM',
      deadline: formatForDateTimeInput(task.deadline),
      status: task.status || 'TODO',
    });
    setEditErrors({});
    setEditServerErrorMessage(null);
    setIsEditModalOpen(true);
  };

  /**
   * Handle Edit Task Submission
   */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!editForm.title.trim()) {
      errors.title = 'Task title is required';
    } else if (editForm.title.length > 150) {
      errors.title = 'Title cannot exceed 150 characters';
    }

    if (!editForm.assignedToId) {
      errors.assignedToId = 'Please select an assigned employee';
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
        description: editForm.description.trim(),
        assignedToId: Number(editForm.assignedToId),
        priority: editForm.priority,
        status: editForm.status,
      };

      if (editForm.deadline) {
        payload.deadline = editForm.deadline.length === 16 ? `${editForm.deadline}:00` : editForm.deadline;
      }

      const updated = await taskService.updateTask(editForm.id, payload);
      showToast('Task updated successfully', 'success');
      setIsEditModalOpen(false);

      // Update state
      setTasks((prev) => prev.map((t) => (t.id === editForm.id ? updated : t)));
      if (detailsModalTask && detailsModalTask.id === editForm.id) {
        setDetailsModalTask(updated);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update task';
      setEditServerErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  /**
   * Handle Delete Task
   */
  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    try {
      setIsDeleting(true);
      await taskService.deleteTask(deletingTask.id);
      showToast('Task deleted successfully', 'success');
      setTasks((prev) => prev.filter((t) => t.id !== deletingTask.id));
      if (detailsModalTask && detailsModalTask.id === deletingTask.id) {
        setDetailsModalTask(null);
      }
      setDeletingTask(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete task';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Helper to check if current user can transition status
   */
  const canModifyTaskStatus = (task) => {
    if (isAdmin || isManager) return true;
    if (currentEmployee && task.assignedToId === currentEmployee.id) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Tasks"
        description="Assign assignments, monitor team deadlines, and track real-time delivery milestones."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Tasks' }]}
        badge={<Badge variant="info" dot>REST Endpoint: /api/tasks</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              isLoading={isRefreshing}
              onClick={() => loadTasks(true)}
            >
              Refresh
            </Button>
            {canManageTasks && (
              <Button
                size="sm"
                leftIcon={Plus}
                onClick={handleOpenCreateModal}
              >
                Create Task
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.total}</div>
            <div className="text-xs text-slate-500 mt-0.5">Across current view</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To Do</span>
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.todo}</div>
            <div className="text-xs text-slate-500 mt-0.5">Pending start</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
              <RefreshCw className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.inProgress}</div>
            <div className="text-xs text-slate-500 mt-0.5">Active execution</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.completed}</div>
            <div className="text-xs text-slate-500 mt-0.5">Finished deliveries</div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${kpiStats.overdue > 0 ? 'border-l-rose-500 bg-rose-50/20' : 'border-l-slate-300'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</span>
              <AlertTriangle className={`w-4 h-4 ${kpiStats.overdue > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            </div>
            <div className={`mt-2 text-2xl font-bold ${kpiStats.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpiStats.overdue}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Passed deadline</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* View Scope Tabs */}
            <div className="flex items-center gap-2 border-b lg:border-b-0 pb-3 lg:pb-0">
              {canManageTasks && (
                <button
                  type="button"
                  onClick={() => setViewScope('team')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    viewScope === 'team'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Team Tasks
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewScope('my')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  viewScope === 'my'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Assigned to Me
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search task title or description..."
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
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Assignee Filter (if Team view & Admin/Manager) */}
              {canManageTasks && viewScope === 'team' && (
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Assignees</option>
                  {assignableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              )}

              {/* Layout Switcher (List vs Kanban) */}
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                <button
                  type="button"
                  title="List View"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Kanban Board View"
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingState message="Loading tasks from backend..." />
      ) : errorMessage ? (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-rose-900 mb-1">Failed to Load Tasks</h3>
            <p className="text-sm text-rose-700 mb-4">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={() => loadTasks()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : processedTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={CheckSquare}
              title={
                searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || assigneeFilter !== 'ALL'
                  ? 'No Tasks Match Your Filters'
                  : viewScope === 'my'
                  ? 'No Tasks Assigned to You'
                  : 'No Tasks Found'
              }
              description={
                searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                  ? 'Try clearing the search query or adjusting your status and priority filters.'
                  : canManageTasks
                  ? 'Get started by creating and delegating assignments to active team members.'
                  : 'You currently have no tasks assigned to your employee account.'
              }
              action={
                searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || assigneeFilter !== 'ALL' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                      setPriorityFilter('ALL');
                      setAssigneeFilter('ALL');
                    }}
                  >
                    Clear All Filters
                  </Button>
                ) : canManageTasks ? (
                  <Button size="sm" leftIcon={Plus} onClick={handleOpenCreateModal}>
                    Create First Task
                  </Button>
                ) : null
              }
            />
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* ================= LIST / TABLE VIEW ================= */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Task Details</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedTasks.map((task) => {
                  const overdue = isOverdue(task);
                  const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.TODO;
                  const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                  const canUpdate = canModifyTaskStatus(task);

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Title & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-start gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => setDetailsModalTask(task)}
                              className="font-medium text-slate-900 hover:text-blue-600 text-left transition-colors flex items-center gap-1.5"
                            >
                              <span>{task.title}</span>
                            </button>
                            {task.description && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant={priorityConf.variant} dot>
                          {priorityConf.label}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusConf.variant}>
                            {statusConf.label}
                          </Badge>
                          {canUpdate && task.status !== 'CANCELLED' && (
                            <select
                              value={task.status}
                              disabled={statusUpdatingTaskId === task.id}
                              onChange={(e) => handleQuickStatusChange(task.id, e.target.value)}
                              className="text-xs py-0.5 px-1.5 border border-slate-200 rounded bg-white text-slate-600 focus:ring-1 focus:ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Quick status change"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                              {canManageTasks && <option value="CANCELLED">Cancelled</option>}
                            </select>
                          )}
                        </div>
                      </td>

                      {/* Assigned To */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {task.assignedToName ? task.assignedToName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-800">
                              {task.assignedToName || 'Unassigned'}
                            </span>
                            {task.assignedByName && (
                              <span className="block text-[10px] text-slate-400">
                                by {task.assignedByName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.deadline ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs ${
                                overdue
                                  ? 'text-rose-600 font-semibold flex items-center gap-1'
                                  : 'text-slate-600'
                              }`}
                            >
                              {overdue && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                              {formatDateTime(task.deadline)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No deadline</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
                            title="View Details"
                            onClick={() => setDetailsModalTask(task)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {canManageTasks && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                                title="Edit Task"
                                onClick={() => handleOpenEditModal(task)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"
                                title="Delete Task"
                                onClick={() => setDeletingTask(task)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* ================= KANBAN BOARD VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((colStatus) => {
            const colConfig = STATUS_CONFIG[colStatus];
            const colTasks = processedTasks.filter((t) => t.status === colStatus);

            return (
              <div
                key={colStatus}
                className="bg-slate-100/70 border border-slate-200 rounded-xl p-3 flex flex-col max-h-[800px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {colConfig.label}
                    </span>
                    <Badge variant={colConfig.variant} size="sm">
                      {colTasks.length}
                    </Badge>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      No tasks in {colConfig.label}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const overdue = isOverdue(task);
                      const priorityConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                      const canUpdate = canModifyTaskStatus(task);

                      return (
                        <div
                          key={task.id}
                          className="bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-xs hover:shadow-md transition-shadow group relative"
                        >
                          {/* Priority and Overdue indicators */}
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={priorityConf.variant} size="sm">
                              {priorityConf.label}
                            </Badge>
                            {overdue && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </div>

                          {/* Task Title */}
                          <button
                            type="button"
                            onClick={() => setDetailsModalTask(task)}
                            className="font-semibold text-slate-900 text-sm hover:text-blue-600 text-left line-clamp-2 mb-1.5 transition-colors"
                          >
                            {task.title}
                          </button>

                          {/* Description snippet */}
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                              {task.description}
                            </p>
                          )}

                          {/* Card Footer: Assignee & Deadline */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5" title={`Assigned to ${task.assignedToName || 'Unassigned'}`}>
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold">
                                {task.assignedToName ? task.assignedToName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <span className="truncate max-w-[90px] font-medium text-slate-700">
                                {task.assignedToName || 'Unassigned'}
                              </span>
                            </div>

                            {task.deadline && (
                              <span
                                className={`text-[11px] flex items-center gap-1 ${
                                  overdue ? 'text-rose-600 font-medium' : 'text-slate-500'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {new Date(task.deadline).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>

                          {/* Quick Transition Buttons */}
                          {canUpdate && task.status !== 'CANCELLED' && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                              {colStatus === 'TODO' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(task.id, 'IN_PROGRESS')}
                                  disabled={statusUpdatingTaskId === task.id}
                                  className="w-full text-center text-xs py-1 px-2 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium transition-colors"
                                >
                                  Start Progress →
                                </button>
                              )}
                              {colStatus === 'IN_PROGRESS' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(task.id, 'COMPLETED')}
                                  disabled={statusUpdatingTaskId === task.id}
                                  className="w-full text-center text-xs py-1 px-2 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                                >
                                  ✓ Mark Done
                                </button>
                              )}
                              {colStatus === 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(task.id, 'IN_PROGRESS')}
                                  disabled={statusUpdatingTaskId === task.id}
                                  className="w-full text-center text-xs py-1 px-2 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
                                >
                                  ↺ Reopen
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= CREATE TASK MODAL ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">Create New Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 space-y-4">
              {createServerErrorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createServerErrorMessage}</span>
                </div>
              )}

              {/* Title */}
              <InputField
                label="Task Title *"
                placeholder="e.g. Implement security audit findings"
                value={createForm.title}
                onChange={(e) => {
                  setCreateForm({ ...createForm, title: e.target.value });
                  if (createErrors.title) setCreateErrors({ ...createErrors, title: null });
                }}
                error={createErrors.title}
                helperText="Maximum 150 characters"
              />

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide scope, deliverables, or context for this assignment..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Assignee & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Assignee */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Assign To Employee *
                  </label>
                  <select
                    value={createForm.assignedToId}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, assignedToId: e.target.value });
                      if (createErrors.assignedToId) setCreateErrors({ ...createErrors, assignedToId: null });
                    }}
                    className={`w-full text-xs px-2.5 py-2 border rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      createErrors.assignedToId ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Select Employee...</option>
                    {assignableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                  {createErrors.assignedToId && (
                    <p className="text-[11px] text-rose-600">{createErrors.assignedToId}</p>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Priority *</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Deadline & Initial Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Deadline */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={createForm.deadline}
                    onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Initial Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmittingCreate}
                  leftIcon={Plus}
                >
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT TASK MODAL ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">Edit Task #{editForm.id}</h3>
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
                label="Task Title *"
                value={editForm.title}
                onChange={(e) => {
                  setEditForm({ ...editForm, title: e.target.value });
                  if (editErrors.title) setEditErrors({ ...editErrors, title: null });
                }}
                error={editErrors.title}
                helperText="Maximum 150 characters"
              />

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Assignee & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Assignee */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Assign To Employee *
                  </label>
                  <select
                    value={editForm.assignedToId}
                    onChange={(e) => {
                      setEditForm({ ...editForm, assignedToId: e.target.value });
                      if (editErrors.assignedToId) setEditErrors({ ...editErrors, assignedToId: null });
                    }}
                    className={`w-full text-xs px-2.5 py-2 border rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      editErrors.assignedToId ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Select Employee...</option>
                    {assignableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                  {editErrors.assignedToId && (
                    <p className="text-[11px] text-rose-600">{editErrors.assignedToId}</p>
                  )}
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Deadline & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Deadline */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
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

      {/* ================= TASK DETAILS MODAL ================= */}
      {detailsModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <Badge variant={PRIORITY_CONFIG[detailsModalTask.priority]?.variant || 'neutral'}>
                    {PRIORITY_CONFIG[detailsModalTask.priority]?.label || detailsModalTask.priority}
                  </Badge>
                  <Badge variant={STATUS_CONFIG[detailsModalTask.status]?.variant || 'neutral'}>
                    {STATUS_CONFIG[detailsModalTask.status]?.label || detailsModalTask.status}
                  </Badge>
                  {isOverdue(detailsModalTask) && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 pt-1">
                  {detailsModalTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Description
                </h4>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-200/60">
                  {detailsModalTask.description || 'No description provided.'}
                </div>
              </div>

              {/* Assignment & Timeline Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-1">Assigned To</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>{detailsModalTask.assignedToName || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-1">Assigned By</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{detailsModalTask.assignedByName || 'System / Unspecified'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-1">Due Date (Deadline)</span>
                  <div className={`font-semibold flex items-center gap-1.5 ${isOverdue(detailsModalTask) ? 'text-rose-600' : 'text-slate-900'}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDateTime(detailsModalTask.deadline)}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-1">Completion Status</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {detailsModalTask.completedAt
                        ? formatDateTime(detailsModalTask.completedAt)
                        : detailsModalTask.status === 'COMPLETED'
                        ? 'Completed'
                        : 'Incomplete'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Transition Bar */}
              {canModifyTaskStatus(detailsModalTask) && detailsModalTask.status !== 'CANCELLED' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Advance Task Status</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {detailsModalTask.status !== 'TODO' && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={statusUpdatingTaskId === detailsModalTask.id}
                        onClick={() => handleQuickStatusChange(detailsModalTask.id, 'TODO')}
                      >
                        Set To Do
                      </Button>
                    )}
                    {detailsModalTask.status !== 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={statusUpdatingTaskId === detailsModalTask.id}
                        onClick={() => handleQuickStatusChange(detailsModalTask.id, 'IN_PROGRESS')}
                      >
                        Move to In Progress
                      </Button>
                    )}
                    {detailsModalTask.status !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={statusUpdatingTaskId === detailsModalTask.id}
                        onClick={() => handleQuickStatusChange(detailsModalTask.id, 'COMPLETED')}
                      >
                        Mark as Completed
                      </Button>
                    )}
                    {canManageTasks && (
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={statusUpdatingTaskId === detailsModalTask.id}
                        onClick={() => handleQuickStatusChange(detailsModalTask.id, 'CANCELLED')}
                      >
                        Cancel Task
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                {canManageTasks && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:text-rose-700 border-rose-200"
                    leftIcon={Trash2}
                    onClick={() => {
                      setDeletingTask(detailsModalTask);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canManageTasks && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={Edit2}
                    onClick={() => {
                      handleOpenEditModal(detailsModalTask);
                    }}
                  >
                    Edit Task
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setDetailsModalTask(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deletingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Task?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete task{' '}
              <span className="font-semibold text-slate-900">"{deletingTask.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingTask(null)}
                disabled={isDeleting}
              >
                Keep Task
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={handleDeleteTask}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksPage;

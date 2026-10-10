import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquareWarning,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Eye,
  User,
  Users,
  Check,
  X,
  FileText,
  Layers,
  ShieldAlert,
  Send,
  Tag,
  Briefcase,
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
import { complaintService } from '../services/complaintService';
import { employeeService } from '../services/employeeService';

// Status display metadata
const STATUS_CONFIG = {
  OPEN: { label: 'Open', variant: 'warning', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', variant: 'info', icon: RefreshCw },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
  CLOSED: { label: 'Closed', variant: 'neutral', icon: Check },
  REJECTED: { label: 'Rejected', variant: 'danger', icon: XCircle },
};

// Priority display metadata
const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', variant: 'danger' },
  HIGH: { label: 'High', variant: 'warning' },
  MEDIUM: { label: 'Medium', variant: 'info' },
  LOW: { label: 'Low', variant: 'neutral' },
};

// Category display labels
const CATEGORY_LABELS = {
  GENERAL: 'General Inquiry',
  IT: 'IT & Hardware',
  HR: 'Human Resources',
  FACILITIES: 'Facilities & Office',
  PAYROLL: 'Payroll & Compensation',
  OTHER: 'Other / Miscellaneous',
};

export function ComplaintsPage() {
  const { showToast } = useApp();
  const { user, isAdmin, isManager, isEmployee } = useAuth();

  const canManageComplaints = isAdmin || isManager;

  // View state
  const [viewScope, setViewScope] = useState(canManageComplaints ? 'all' : 'my'); // 'all' | 'my'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Data states
  const [complaints, setComplaints] = useState([]);
  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailsModalComplaint, setDetailsModalComplaint] = useState(null);
  const [resolvingComplaint, setResolvingComplaint] = useState(null);
  const [assigningComplaint, setAssigningComplaint] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    description: '',
    employeeId: '',
  });
  const [createErrors, setCreateErrors] = useState({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createServerErrorMessage, setCreateServerErrorMessage] = useState(null);

  const [resolutionText, setResolutionText] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Load current authenticated employee
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
   * Load active staff for assignment (Admin/Manager only)
   */
  const loadAssignableStaff = useCallback(async () => {
    if (!canManageComplaints) return;
    try {
      const data = await employeeService.getEmployees({ status: 'ACTIVE' });
      setAssignableEmployees(Array.isArray(data) ? data : []);
    } catch {
      // Non-blocking
    }
  }, [canManageComplaints]);

  /**
   * Fetch complaints
   */
  const loadComplaints = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        let data = [];
        if (viewScope === 'my') {
          data = await complaintService.getMyComplaints();
        } else {
          const filters = {};
          if (statusFilter !== 'ALL') filters.status = statusFilter;
          if (categoryFilter !== 'ALL') filters.category = categoryFilter;
          if (priorityFilter !== 'ALL') filters.priority = priorityFilter;
          data = await complaintService.listComplaints(filters);
        }

        setComplaints(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to load complaints';
        setErrorMessage(msg);
        showToast(msg, 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [viewScope, statusFilter, categoryFilter, priorityFilter, showToast]
  );

  useEffect(() => {
    loadCurrentEmployee();
    loadAssignableStaff();
  }, [loadCurrentEmployee, loadAssignableStaff]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  /**
   * Format ISO LocalDateTime
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
   * KPI metrics
   */
  const kpiStats = useMemo(() => {
    const total = complaints.length;
    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    let closedOrRejected = 0;

    complaints.forEach((c) => {
      if (c.status === 'OPEN') open++;
      else if (c.status === 'IN_PROGRESS') inProgress++;
      else if (c.status === 'RESOLVED') resolved++;
      else if (c.status === 'CLOSED' || c.status === 'REJECTED') closedOrRejected++;
    });

    return { total, open, inProgress, resolved, closedOrRejected };
  }, [complaints]);

  /**
   * Filtered & client-searched complaints
   */
  const processedComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // In-memory filters for 'my' view
      if (viewScope === 'my') {
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
        if (priorityFilter !== 'ALL' && c.priority !== priorityFilter) return false;
      }

      // Search query
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(term);
        const matchDesc = c.description?.toLowerCase().includes(term);
        const matchEmp = c.employeeName?.toLowerCase().includes(term);
        const matchAssignee = c.assignedToName?.toLowerCase().includes(term);
        if (!matchTitle && !matchDesc && !matchEmp && !matchAssignee) return false;
      }

      return true;
    });
  }, [complaints, viewScope, statusFilter, categoryFilter, priorityFilter, debouncedSearch]);

  /**
   * Open Submit Complaint Modal
   */
  const handleOpenCreateModal = () => {
    const defaultEmp = currentEmployee ? String(currentEmployee.id) : assignableEmployees[0]?.id ? String(assignableEmployees[0].id) : '';
    setCreateForm({
      title: '',
      category: 'GENERAL',
      priority: 'MEDIUM',
      description: '',
      employeeId: defaultEmp,
    });
    setCreateErrors({});
    setCreateServerErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  /**
   * Submit Create Complaint
   */
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!createForm.title.trim()) {
      errors.title = 'Title is required';
    } else if (createForm.title.length > 200) {
      errors.title = 'Title cannot exceed 200 characters';
    }

    if (!createForm.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!createForm.category) {
      errors.category = 'Category is required';
    }

    if (!createForm.priority) {
      errors.priority = 'Priority is required';
    }

    const targetEmpId = createForm.employeeId || currentEmployee?.id;
    if (!targetEmpId) {
      errors.employeeId = 'Employee profile is required to submit a complaint';
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
        category: createForm.category,
        priority: createForm.priority,
        employeeId: Number(targetEmpId),
      };

      await complaintService.createComplaint(payload);
      showToast('Grievance ticket submitted successfully', 'success');
      setIsCreateModalOpen(false);
      loadComplaints(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit complaint';
      setCreateServerErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  /**
   * Quick Status Update (Admin & Manager)
   */
  const handleStatusUpdate = async (complaintId, newStatus) => {
    try {
      setUpdatingStatusId(complaintId);
      const updated = await complaintService.updateComplaintStatus(complaintId, newStatus);
      showToast(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`, 'success');

      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? updated : c))
      );

      if (detailsModalComplaint && detailsModalComplaint.id === complaintId) {
        setDetailsModalComplaint(updated);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update status';
      showToast(msg, 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /**
   * Open Resolve Modal
   */
  const handleOpenResolveModal = (complaint) => {
    setResolvingComplaint(complaint);
    setResolutionText(complaint.resolution || '');
  };

  /**
   * Submit Resolve Complaint
   */
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingComplaint || !resolutionText.trim()) return;

    try {
      setIsSubmittingResolve(true);
      const updated = await complaintService.resolveComplaint(
        resolvingComplaint.id,
        resolutionText.trim()
      );
      showToast('Complaint resolved with resolution notes', 'success');

      setComplaints((prev) =>
        prev.map((c) => (c.id === resolvingComplaint.id ? updated : c))
      );

      if (detailsModalComplaint && detailsModalComplaint.id === resolvingComplaint.id) {
        setDetailsModalComplaint(updated);
      }

      setResolvingComplaint(null);
      setResolutionText('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to resolve complaint';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  /**
   * Open Assign Modal
   */
  const handleOpenAssignModal = (complaint) => {
    setAssigningComplaint(complaint);
    setSelectedAssigneeId(complaint.assignedToId ? String(complaint.assignedToId) : '');
  };

  /**
   * Submit Assign Complaint
   */
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assigningComplaint || !selectedAssigneeId) return;

    try {
      setIsSubmittingAssign(true);
      const updated = await complaintService.assignComplaint(
        assigningComplaint.id,
        selectedAssigneeId
      );
      showToast('Complaint assigned to staff', 'success');

      setComplaints((prev) =>
        prev.map((c) => (c.id === assigningComplaint.id ? updated : c))
      );

      if (detailsModalComplaint && detailsModalComplaint.id === assigningComplaint.id) {
        setDetailsModalComplaint(updated);
      }

      setAssigningComplaint(null);
      setSelectedAssigneeId('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to assign complaint';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Complaints & Feedback"
        description="Confidential employee grievance submission, ticket routing, and resolution tracking."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Complaints' }]}
        badge={<Badge variant="primary" dot>REST Endpoint: /api/complaints</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              isLoading={isRefreshing}
              onClick={() => loadComplaints(true)}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={Plus}
              onClick={handleOpenCreateModal}
            >
              Submit Grievance
            </Button>
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

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.open}</div>
            <div className="text-xs text-slate-500 mt-0.5">Awaiting assignment</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
              <RefreshCw className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.inProgress}</div>
            <div className="text-xs text-slate-500 mt-0.5">Under investigation</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.resolved}</div>
            <div className="text-xs text-slate-500 mt-0.5">Successfully remediated</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Closed / Other</span>
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.closedOrRejected}</div>
            <div className="text-xs text-slate-500 mt-0.5">Closed or rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Controls Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Scope Tabs */}
            <div className="flex items-center gap-2 border-b lg:border-b-0 pb-3 lg:pb-0">
              {canManageComplaints && (
                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewScope('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      viewScope === 'all'
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Grievances
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
                    Filed by Me
                  </button>
                </div>
              )}
            </div>

            {/* Search and Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search grievance, employee, assignee..."
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
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Categories</option>
                <option value="GENERAL">General</option>
                <option value="IT">IT & Tech</option>
                <option value="HR">HR</option>
                <option value="FACILITIES">Facilities</option>
                <option value="PAYROLL">Payroll</option>
                <option value="OTHER">Other</option>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Complaints List */}
      {isLoading ? (
        <LoadingState message="Loading grievance records from backend..." />
      ) : errorMessage ? (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-rose-900 mb-1">Failed to Load Complaints</h3>
            <p className="text-sm text-rose-700 mb-4">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={() => loadComplaints()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : processedComplaints.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={MessageSquareWarning}
              title={
                searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || priorityFilter !== 'ALL'
                  ? 'No Complaints Match Your Filters'
                  : viewScope === 'my'
                  ? 'No Grievances Filed by You'
                  : 'No Complaints on Record'
              }
              description={
                searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || priorityFilter !== 'ALL'
                  ? 'Try clearing your search query or adjusting your status and category filters.'
                  : 'The workplace environment is clear. You can file a confidential complaint whenever needed.'
              }
              action={
                searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                      setCategoryFilter('ALL');
                      setPriorityFilter('ALL');
                    }}
                  >
                    Clear All Filters
                  </Button>
                ) : (
                  <Button size="sm" leftIcon={Plus} onClick={handleOpenCreateModal}>
                    Submit Grievance
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Grievance Ticket</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Filed By</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Filed On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedComplaints.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.OPEN;
                  const priorityConf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
                  const categoryLabel = CATEGORY_LABELS[item.category] || item.category;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Ticket Title & Preview */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div>
                          <button
                            type="button"
                            onClick={() => setDetailsModalComplaint(item)}
                            className="font-medium text-slate-900 hover:text-blue-600 text-left transition-colors block"
                          >
                            #{item.id} - {item.title}
                          </button>
                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                          {categoryLabel}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant={priorityConf.variant} dot>
                          {priorityConf.label}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant={statusConf.variant}>
                          {statusConf.label}
                        </Badge>
                      </td>

                      {/* Filed By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-medium text-slate-800">
                            {item.employeeName || 'Anonymous'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned To */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.assignedToName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold">
                              {item.assignedToName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-800">
                              {item.assignedToName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Filed On */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(item.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
                            title="View Details"
                            onClick={() => setDetailsModalComplaint(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {canManageComplaints && item.status !== 'RESOLVED' && item.status !== 'CLOSED' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs py-1 px-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                                onClick={() => handleOpenAssignModal(item)}
                              >
                                Assign
                              </Button>
                              <Button
                                size="sm"
                                className="text-xs py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleOpenResolveModal(item)}
                              >
                                Resolve
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
      )}

      {/* ================= SUBMIT COMPLAINT MODAL ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">Submit Grievance Ticket</h3>
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
                label="Ticket Title *"
                placeholder="e.g. Broken AC in Floor 3 Conference Room"
                value={createForm.title}
                onChange={(e) => {
                  setCreateForm({ ...createForm, title: e.target.value });
                  if (createErrors.title) setCreateErrors({ ...createErrors, title: null });
                }}
                error={createErrors.title}
                helperText="Maximum 200 characters"
              />

              {/* Category & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Category */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">Category *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GENERAL">General Inquiry</option>
                    <option value="IT">IT & Hardware</option>
                    <option value="HR">Human Resources</option>
                    <option value="FACILITIES">Facilities & Office</option>
                    <option value="PAYROLL">Payroll & Comp</option>
                    <option value="OTHER">Other</option>
                  </select>
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

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide precise details, impact on work, and locations involved..."
                  value={createForm.description}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, description: e.target.value });
                    if (createErrors.description) setCreateErrors({ ...createErrors, description: null });
                  }}
                  className={`w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    createErrors.description ? 'border-rose-400' : 'border-slate-300'
                  }`}
                />
                {createErrors.description && (
                  <p className="text-[11px] text-rose-600">{createErrors.description}</p>
                )}
              </div>

              {/* Submitting Employee (Admin can choose, otherwise auto-linked) */}
              {isAdmin && assignableEmployees.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Filing Employee *
                  </label>
                  <select
                    value={createForm.employeeId}
                    onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                    className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {assignableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
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
                  leftIcon={Send}
                >
                  Submit Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= COMPLAINT DETAILS MODAL ================= */}
      {detailsModalComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div className="space-y-1.5 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={STATUS_CONFIG[detailsModalComplaint.status]?.variant || 'neutral'}
                  >
                    {STATUS_CONFIG[detailsModalComplaint.status]?.label || detailsModalComplaint.status}
                  </Badge>
                  <Badge
                    variant={PRIORITY_CONFIG[detailsModalComplaint.priority]?.variant || 'neutral'}
                    dot
                  >
                    {PRIORITY_CONFIG[detailsModalComplaint.priority]?.label || detailsModalComplaint.priority} Priority
                  </Badge>
                  <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {CATEGORY_LABELS[detailsModalComplaint.category] || detailsModalComplaint.category}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  #{detailsModalComplaint.id} - {detailsModalComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalComplaint(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5">
              {/* Attribution Meta Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-1">Filed By</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>{detailsModalComplaint.employeeName || 'Anonymous'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Code: {detailsModalComplaint.employeeCode || '—'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-1">Assigned Handler</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{detailsModalComplaint.assignedToName || 'Unassigned'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Filed on: {formatDateTime(detailsModalComplaint.createdAt)}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Grievance Description
                </h4>
                <div className="p-3.5 bg-slate-50/70 rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-200/70">
                  {detailsModalComplaint.description}
                </div>
              </div>

              {/* Resolution (if resolved) */}
              {detailsModalComplaint.resolution && (
                <div className="p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Official Resolution
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-900 whitespace-pre-wrap leading-relaxed">
                    {detailsModalComplaint.resolution}
                  </p>
                  {detailsModalComplaint.resolvedAt && (
                    <div className="text-[10px] text-emerald-700 mt-2 font-medium">
                      Resolved on: {formatDateTime(detailsModalComplaint.resolvedAt)}
                    </div>
                  )}
                </div>
              )}

              {/* Manager / Admin Status Controls */}
              {canManageComplaints && (
                <div className="p-3.5 bg-blue-50/40 rounded-lg border border-blue-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Administrative Action
                  </h4>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAssignModal(detailsModalComplaint)}
                    >
                      {detailsModalComplaint.assignedToName ? 'Reassign Staff' : 'Assign Staff'}
                    </Button>

                    {detailsModalComplaint.status !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleOpenResolveModal(detailsModalComplaint)}
                      >
                        Resolve Grievance
                      </Button>
                    )}

                    {detailsModalComplaint.status !== 'IN_PROGRESS' && detailsModalComplaint.status !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={updatingStatusId === detailsModalComplaint.id}
                        onClick={() => handleStatusUpdate(detailsModalComplaint.id, 'IN_PROGRESS')}
                      >
                        Mark In Progress
                      </Button>
                    )}

                    {detailsModalComplaint.status !== 'CLOSED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={updatingStatusId === detailsModalComplaint.id}
                        onClick={() => handleStatusUpdate(detailsModalComplaint.id, 'CLOSED')}
                      >
                        Close Ticket
                      </Button>
                    )}

                    {detailsModalComplaint.status !== 'REJECTED' && detailsModalComplaint.status !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={updatingStatusId === detailsModalComplaint.id}
                        onClick={() => handleStatusUpdate(detailsModalComplaint.id, 'REJECTED')}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <Button size="sm" onClick={() => setDetailsModalComplaint(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESOLVE COMPLAINT MODAL ================= */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  Resolve Ticket #{resolvingComplaint.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResolvingComplaint(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Resolution Explanation / Remediation Steps *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the actions taken to address this grievance..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResolvingComplaint(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  isLoading={isSubmittingResolve}
                  disabled={!resolutionText.trim()}
                >
                  Confirm Resolution
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ASSIGN COMPLAINT MODAL ================= */}
      {assigningComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  Assign Ticket #{assigningComplaint.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningComplaint(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Select Staff Member *
                </label>
                <select
                  required
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Employee to Handle Ticket...</option>
                  {assignableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssigningComplaint(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmittingAssign}
                  disabled={!selectedAssigneeId}
                >
                  Assign Handler
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplaintsPage;

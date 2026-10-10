import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarCheck,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw,
  FileText,
  Check,
  X,
  Briefcase,
  Layers,
  Inbox,
  User,
  AlertTriangle,
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
import { leaveService } from '../services/leaveService';

const LEAVE_TYPES = [
  { value: 'CASUAL', label: 'Casual Leave (12 days/yr)', color: 'blue' },
  { value: 'SICK', label: 'Sick Leave (10 days/yr)', color: 'emerald' },
  { value: 'EARNED', label: 'Earned / Vacation (15 days/yr)', color: 'indigo' },
  { value: 'OTHER', label: 'Special / Other (5 days/yr)', color: 'amber' },
];

export function LeavesPage() {
  const { showToast } = useApp();
  const { user, isAdmin, isManager } = useAuth();

  // Active view tab ('my' | 'pending')
  const [activeTab, setActiveTab] = useState(isAdmin || isManager ? 'pending' : 'my');

  // Data states
  const [balances, setBalances] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Apply For Leave Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveType: 'CASUAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [applyErrors, setApplyErrors] = useState({});
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);
  const [applyServerError, setApplyServerError] = useState(null);

  // Approval / Rejection Action Modals
  const [actionLeave, setActionLeave] = useState(null); // The leave object to approve/reject
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [actionRemarks, setActionRemarks] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  /**
   * Format ISO date string nicely
   */
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  /**
   * Status Badge renderer
   */
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" dot>Pending Review</Badge>;
      case 'APPROVED':
        return <Badge variant="success" dot>Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" dot>Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral" dot>Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  /**
   * Leave Type Badge renderer
   */
  const renderTypeBadge = (type) => {
    switch (type) {
      case 'CASUAL':
        return <Badge variant="primary">Casual</Badge>;
      case 'SICK':
        return <Badge variant="teal">Sick</Badge>;
      case 'EARNED':
        return <Badge variant="info">Earned</Badge>;
      case 'OTHER':
        return <Badge variant="warning">Other</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  /**
   * Fetch all leave data (balances, personal requests, pending queue)
   */
  const loadLeaveData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const requests = [
        leaveService.getMyLeaveBalances(),
        leaveService.getMyLeaves(),
      ];

      // Only Admin and Manager are authorized for /api/leaves/pending
      if (isAdmin || isManager) {
        requests.push(leaveService.getPendingLeaves());
      }

      const results = await Promise.allSettled(requests);

      // Balances
      if (results[0].status === 'fulfilled') {
        setBalances(Array.isArray(results[0].value) ? results[0].value : []);
      }

      // My Leaves
      if (results[1].status === 'fulfilled') {
        setMyLeaves(Array.isArray(results[1].value) ? results[1].value : []);
      }

      // Pending Leaves
      if (results[2] && results[2].status === 'fulfilled') {
        setPendingLeaves(Array.isArray(results[2].value) ? results[2].value : []);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to sync leave records';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin, isManager, showToast]);

  useEffect(() => {
    loadLeaveData();
  }, [loadLeaveData]);

  /**
   * Calculate requested duration in calendar days
   */
  const requestedDays = useMemo(() => {
    if (!applyForm.startDate || !applyForm.endDate) return 0;
    const start = new Date(applyForm.startDate);
    const end = new Date(applyForm.endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [applyForm.startDate, applyForm.endDate]);

  /**
   * Get remaining balance for currently selected leave type in modal
   */
  const selectedTypeRemaining = useMemo(() => {
    const bal = balances.find((b) => b.leaveType === applyForm.leaveType);
    return bal ? bal.remainingLeaves : 0;
  }, [balances, applyForm.leaveType]);

  /**
   * Open Apply For Leave modal
   */
  const handleOpenApplyModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setApplyForm({
      leaveType: 'CASUAL',
      startDate: today,
      endDate: today,
      reason: '',
    });
    setApplyErrors({});
    setApplyServerError(null);
    setIsApplyModalOpen(true);
  };

  /**
   * Form validation for leave application
   */
  const validateApplyForm = () => {
    const errors = {};

    if (!applyForm.startDate) {
      errors.startDate = 'Start date is required';
    }

    if (!applyForm.endDate) {
      errors.endDate = 'End date is required';
    } else if (applyForm.startDate && applyForm.endDate < applyForm.startDate) {
      errors.endDate = 'End date cannot be earlier than start date';
    }

    if (requestedDays > selectedTypeRemaining) {
      errors.days = `Insufficient balance. Requested: ${requestedDays} day(s), Remaining: ${selectedTypeRemaining} day(s)`;
    }

    if (!applyForm.reason?.trim()) {
      errors.reason = 'Reason for leave is required';
    } else if (applyForm.reason.trim().length > 500) {
      errors.reason = 'Reason cannot exceed 500 characters';
    }

    setApplyErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Submit Leave Application
   */
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyServerError(null);

    if (!validateApplyForm()) return;

    setIsSubmittingApply(true);
    try {
      const result = await leaveService.applyForLeave({
        leaveType: applyForm.leaveType,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason,
      });

      showToast(`Leave request for ${result.days} day(s) submitted successfully`, 'success');
      setIsApplyModalOpen(false);
      loadLeaveData(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit leave request';
      setApplyServerError(msg);
    } finally {
      setIsSubmittingApply(false);
    }
  };

  /**
   * Open Confirmation Dialog for Approve or Reject
   */
  const handleOpenActionModal = (leave, type) => {
    setActionLeave(leave);
    setActionType(type);
    setActionRemarks('');
    setIsSubmittingAction(false);
  };

  /**
   * Execute Approve or Reject action
   */
  const handleConfirmAction = async () => {
    if (!actionLeave || !actionType) return;

    setIsSubmittingAction(true);
    try {
      if (actionType === 'approve') {
        await leaveService.approveLeave(actionLeave.id, actionRemarks);
        showToast(`Leave request #${actionLeave.id} approved successfully`, 'success');
      } else {
        await leaveService.rejectLeave(actionLeave.id, actionRemarks);
        showToast(`Leave request #${actionLeave.id} rejected`, 'info');
      }

      setActionLeave(null);
      setActionType(null);
      loadLeaveData(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || `Failed to ${actionType} leave`;
      showToast(msg, 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Leave Management"
        description="Submit time-off requests, monitor leave balance quotas, and review departmental approvals."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Leave Management' }]}
        badge={<Badge variant="warning" dot>Live MySQL Workflow</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              isLoading={isRefreshing}
              onClick={() => loadLeaveData(true)}
              title="Refresh leave balances and requests"
            >
              Refresh
            </Button>
            <Button
              leftIcon={PlusCircle}
              size="sm"
              onClick={handleOpenApplyModal}
            >
              Apply For Leave
            </Button>
          </div>
        }
      />

      {/* Leave Balances Summary Cards */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Annual Leave Quota & Remaining Balances ({new Date().getFullYear()})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LEAVE_TYPES.map((typeMeta) => {
            const bal = balances.find((b) => b.leaveType === typeMeta.value);
            const remaining = bal ? bal.remainingLeaves : 0;
            const total = bal ? bal.totalLeaves : (typeMeta.value === 'CASUAL' ? 12 : typeMeta.value === 'SICK' ? 10 : typeMeta.value === 'EARNED' ? 15 : 5);
            const used = bal ? bal.usedLeaves : 0;
            const percentage = total > 0 ? Math.round((remaining / total) * 100) : 0;

            return (
              <Card key={typeMeta.value} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">{typeMeta.label.split(' (')[0]}</span>
                  {renderTypeBadge(typeMeta.value)}
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">{remaining}</span>
                  <span className="text-xs text-slate-400 font-medium">/ {total} days remaining</span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      percentage > 50
                        ? 'bg-emerald-500'
                        : percentage > 20
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Used: {used} day(s)</span>
                  <span className="font-medium text-slate-700">{percentage}% remaining</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Main Leave Records Card with Navigation Tabs */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Leave Requests & Approvals</CardTitle>
              <CardDescription>
                Audited leave records and approval workflows from LeaveService
              </CardDescription>
            </div>

            {/* View Selector for Admin & Manager */}
            {(isAdmin || isManager) && (
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'pending'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending Approvals
                  {pendingLeaves.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {pendingLeaves.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'my'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Requests History
                </button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* TAB 1: Pending Approvals Queue (Admin & Manager) */}
          {activeTab === 'pending' && (isAdmin || isManager) && (
            <>
              {isLoading ? (
                <LoadingState message="Loading pending leave requests..." fullHeight />
              ) : pendingLeaves.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={CheckCircle2}
                    title="No pending requests"
                    description="All employee leave requests have been reviewed and processed."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">Applicant</th>
                        <th scope="col" className="px-6 py-3.5">Leave Type</th>
                        <th scope="col" className="px-6 py-3.5">Dates & Duration</th>
                        <th scope="col" className="px-6 py-3.5">Reason</th>
                        <th scope="col" className="px-6 py-3.5">Status</th>
                        <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingLeaves.map((item) => {
                        // Check if the current reviewer is the applicant to prevent self-review
                        const isSelf = user?.id && item.reviewedByUserId === user.id;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Applicant */}
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  {item.employeeName?.charAt(0) || 'E'}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900 block">{item.employeeName}</span>
                                  <span className="text-xs font-mono text-slate-400">{item.employeeCode}</span>
                                </div>
                              </div>
                            </td>

                            {/* Leave Type */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderTypeBadge(item.leaveType)}
                            </td>

                            {/* Dates & Duration */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-medium text-slate-800 block text-xs">
                                {formatDate(item.startDate)} → {formatDate(item.endDate)}
                              </span>
                              <span className="text-xs font-semibold text-blue-600 mt-0.5 block">
                                {item.days} {item.days === 1 ? 'day' : 'days'}
                              </span>
                            </td>

                            {/* Reason */}
                            <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate" title={item.reason}>
                              {item.reason}
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderStatusBadge(item.status)}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="teal"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs shadow-none"
                                  leftIcon={Check}
                                  onClick={() => handleOpenActionModal(item, 'approve')}
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot approve own leave' : 'Approve leave request'}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs shadow-none"
                                  leftIcon={X}
                                  onClick={() => handleOpenActionModal(item, 'reject')}
                                  disabled={isSelf}
                                  title={isSelf ? 'Cannot reject own leave' : 'Reject leave request'}
                                >
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 2: My Personal Leave Requests History */}
          {activeTab === 'my' && (
            <>
              {isLoading ? (
                <LoadingState message="Loading your leave history..." fullHeight />
              ) : myLeaves.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={CalendarCheck}
                    title="No leave requests filed"
                    description="You have not submitted any leave applications yet."
                    action={
                      <Button
                        leftIcon={PlusCircle}
                        size="sm"
                        onClick={handleOpenApplyModal}
                      >
                        Apply For Leave
                      </Button>
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">Leave Type</th>
                        <th scope="col" className="px-6 py-3.5">Dates & Duration</th>
                        <th scope="col" className="px-6 py-3.5">Reason</th>
                        <th scope="col" className="px-6 py-3.5">Status</th>
                        <th scope="col" className="px-6 py-3.5">Reviewer Remarks</th>
                        <th scope="col" className="px-6 py-3.5">Submitted On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myLeaves.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderTypeBadge(item.leaveType)}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-slate-800 block text-xs">
                              {formatDate(item.startDate)} → {formatDate(item.endDate)}
                            </span>
                            <span className="text-xs font-semibold text-blue-600 mt-0.5 block">
                              {item.days} {item.days === 1 ? 'day' : 'days'}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate" title={item.reason}>
                            {item.reason}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusBadge(item.status)}
                          </td>

                          <td className="px-6 py-4 text-xs">
                            {item.reviewedByUsername ? (
                              <div>
                                <span className="font-medium text-slate-800 block">
                                  Reviewed by {item.reviewedByUsername}
                                </span>
                                {item.rejectionReason && (
                                  <span className="text-rose-600 italic block mt-0.5">
                                    "{item.rejectionReason}"
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Awaiting review</span>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {item.createdAt ? formatDate(item.createdAt.split('T')[0]) : '—'}
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

      {/* Apply For Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="apply-modal-title" className="text-base font-semibold text-slate-900">
                    Apply For Leave
                  </h3>
                  <p className="text-xs text-slate-500">Submit a formal time-off application</p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
                onClick={() => setIsApplyModalOpen(false)}
                disabled={isSubmittingApply}
              >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Server Error Alert */}
            {applyServerError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{applyServerError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleApplySubmit} className="mt-5 space-y-4">
              {/* Leave Type Select with Balance Indicator */}
              <div className="w-full text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="leave-type-select"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                  >
                    Leave Category
                  </label>
                  <span className="text-xs font-semibold text-blue-600">
                    Available: {selectedTypeRemaining} day(s)
                  </span>
                </div>
                <select
                  id="leave-type-select"
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                  disabled={isSubmittingApply}
                  className="block w-full rounded-lg border border-slate-300 text-sm py-2.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  {LEAVE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="leave-start-date"
                  label="Start Date"
                  type="date"
                  required
                  value={applyForm.startDate}
                  onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                  error={applyErrors.startDate}
                  disabled={isSubmittingApply}
                />

                <InputField
                  id="leave-end-date"
                  label="End Date"
                  type="date"
                  required
                  value={applyForm.endDate}
                  onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                  error={applyErrors.endDate}
                  disabled={isSubmittingApply}
                  min={applyForm.startDate}
                />
              </div>

              {/* Calculated Duration Display */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Total Requested Duration:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {requestedDays} {requestedDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              {applyErrors.days && (
                <p className="text-xs text-rose-600 font-medium">{applyErrors.days}</p>
              )}

              {/* Reason Textarea */}
              <div className="w-full text-left">
                <label
                  htmlFor="leave-reason"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Reason for Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="leave-reason"
                  rows={3}
                  className="block w-full rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 p-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="Provide context or business justification for this leave request..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  disabled={isSubmittingApply}
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
                  {applyErrors.reason ? (
                    <span className="text-rose-600 font-medium">{applyErrors.reason}</span>
                  ) : (
                    <span>Detailed purpose</span>
                  )}
                  <span>{applyForm.reason?.length || 0}/500</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="md"
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  disabled={isSubmittingApply}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={isSubmittingApply}
                  leftIcon={Check}
                >
                  Submit Application
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve / Reject Action Confirmation Modal */}
      {actionLeave && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="action-dialog-title"
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                actionType === 'approve'
                  ? 'bg-teal-50 text-teal-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {actionType === 'approve' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
            </div>

            <h3 id="action-dialog-title" className="text-lg font-bold text-slate-900">
              {actionType === 'approve' ? 'Approve Leave Request?' : 'Reject Leave Request?'}
            </h3>

            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Reviewing request for <span className="font-semibold text-slate-900">{actionLeave.employeeName}</span> ({actionLeave.employeeCode})
            </p>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Leave Category:</span>
                <span className="font-semibold text-slate-800">{actionLeave.leaveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duration:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(actionLeave.startDate)} → {formatDate(actionLeave.endDate)} ({actionLeave.days} days)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reason:</span>
                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                  "{actionLeave.reason}"
                </span>
              </div>
            </div>

            {/* Remarks Input */}
            <div className="mt-4 text-left">
              <label
                htmlFor="action-remarks"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                {actionType === 'approve' ? 'Approval Remarks (Optional)' : 'Rejection Reason (Optional)'}
              </label>
              <textarea
                id="action-remarks"
                rows={2}
                className="block w-full rounded-lg border border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-400 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                placeholder={
                  actionType === 'approve'
                    ? 'e.g. Approved. Ensure handover is completed.'
                    : 'e.g. Critical deployment scheduled during this window.'
                }
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                disabled={isSubmittingAction}
                maxLength={500}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setActionLeave(null)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === 'approve' ? 'teal' : 'danger'}
                size="md"
                isLoading={isSubmittingAction}
                onClick={handleConfirmAction}
              >
                {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeavesPage;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  User,
  X,
  FileText,
  Radio,
  Send,
  CalendarDays,
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
import { announcementService } from '../services/announcementService';

export function AnnouncementsPage() {
  const { showToast } = useApp();
  const { user, isAdmin } = useAuth();

  // Data states
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DRAFT' | 'EXPIRED'
  const [sortOrder, setSortOrder] = useState('NEWEST'); // 'NEWEST' | 'OLDEST'

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [detailsModalAnnouncement, setDetailsModalAnnouncement] = useState(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState(null);
  const [togglingPublishId, setTogglingPublishId] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    expiryDate: '',
    active: true,
  });
  const [createErrors, setCreateErrors] = useState({});
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createServerErrorMessage, setCreateServerErrorMessage] = useState(null);

  const [editForm, setEditForm] = useState({
    id: null,
    title: '',
    content: '',
    expiryDate: '',
    active: true,
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
   * Fetch announcements according to user role
   */
  const loadAnnouncements = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        let data = [];
        if (isAdmin) {
          // Admin retrieves full management feed
          data = await announcementService.listAnnouncements();
        } else {
          // Employee / Manager retrieves live published feed
          data = await announcementService.getPublishedAnnouncements();
        }

        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to load announcements';
        setErrorMessage(msg);
        showToast(msg, 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAdmin, showToast]
  );

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  /**
   * Check if an announcement has expired
   */
  const isExpired = (item) => {
    if (!item?.expiryDate) return false;
    try {
      const today = new Date().toISOString().split('T')[0];
      return item.expiryDate < today;
    } catch {
      return false;
    }
  };

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
   * Format LocalDate (YYYY-MM-DD)
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  /**
   * Compute KPI metrics
   */
  const kpiStats = useMemo(() => {
    const total = announcements.length;
    let published = 0;
    let expired = 0;
    let draft = 0;

    announcements.forEach((a) => {
      if (!a.active) {
        draft++;
      } else if (isExpired(a)) {
        expired++;
      } else {
        published++;
      }
    });

    return { total, published, expired, draft };
  }, [announcements]);

  /**
   * Processed & filtered announcements
   */
  const processedAnnouncements = useMemo(() => {
    let list = announcements.filter((a) => {
      // Status filter
      if (statusFilter === 'ACTIVE') {
        if (!a.active || isExpired(a)) return false;
      } else if (statusFilter === 'DRAFT') {
        if (a.active) return false;
      } else if (statusFilter === 'EXPIRED') {
        if (!isExpired(a)) return false;
      }

      // Search query
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        const matchTitle = a.title?.toLowerCase().includes(term);
        const matchContent = a.content?.toLowerCase().includes(term);
        const matchAuthor = a.publishedByUsername?.toLowerCase().includes(term);
        if (!matchTitle && !matchContent && !matchAuthor) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [announcements, statusFilter, debouncedSearch, sortOrder]);

  /**
   * Toggle Publish Status (Admin only)
   */
  const handleTogglePublish = async (announcement) => {
    try {
      setTogglingPublishId(announcement.id);
      const newActive = !announcement.active;
      const updated = await announcementService.togglePublish(announcement.id, newActive);
      showToast(
        newActive ? 'Announcement published live' : 'Announcement moved to draft',
        'success'
      );

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcement.id ? updated : a))
      );

      if (detailsModalAnnouncement && detailsModalAnnouncement.id === announcement.id) {
        setDetailsModalAnnouncement(updated);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update publication status';
      showToast(msg, 'error');
    } finally {
      setTogglingPublishId(null);
    }
  };

  /**
   * Open Create Modal
   */
  const handleOpenCreateModal = () => {
    setCreateForm({
      title: '',
      content: '',
      expiryDate: '',
      active: true,
    });
    setCreateErrors({});
    setCreateServerErrorMessage(null);
    setIsCreateModalOpen(true);
  };

  /**
   * Submit Create Announcement
   */
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!createForm.title.trim()) {
      errors.title = 'Title is required';
    } else if (createForm.title.length > 200) {
      errors.title = 'Title cannot exceed 200 characters';
    }

    if (!createForm.content.trim()) {
      errors.content = 'Content is required';
    }

    if (createForm.expiryDate) {
      const today = new Date().toISOString().split('T')[0];
      if (createForm.expiryDate < today) {
        errors.expiryDate = 'Expiry date cannot be in the past';
      }
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
        content: createForm.content.trim(),
        active: createForm.active,
      };

      if (createForm.expiryDate) {
        payload.expiryDate = createForm.expiryDate;
      }

      await announcementService.createAnnouncement(payload);
      showToast('Announcement posted successfully', 'success');
      setIsCreateModalOpen(false);
      loadAnnouncements(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to post announcement';
      setCreateServerErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  /**
   * Open Edit Modal
   */
  const handleOpenEditModal = (item) => {
    setEditForm({
      id: item.id,
      title: item.title || '',
      content: item.content || '',
      expiryDate: item.expiryDate || '',
      active: item.active,
    });
    setEditErrors({});
    setEditServerErrorMessage(null);
    setIsEditModalOpen(true);
  };

  /**
   * Submit Edit Announcement
   */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!editForm.title.trim()) {
      errors.title = 'Title is required';
    } else if (editForm.title.length > 200) {
      errors.title = 'Title cannot exceed 200 characters';
    }

    if (!editForm.content.trim()) {
      errors.content = 'Content is required';
    }

    if (editForm.expiryDate) {
      const today = new Date().toISOString().split('T')[0];
      if (editForm.expiryDate < today) {
        errors.expiryDate = 'Expiry date cannot be in the past';
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
        content: editForm.content.trim(),
        active: editForm.active,
        expiryDate: editForm.expiryDate || null,
      };

      const updated = await announcementService.updateAnnouncement(editForm.id, payload);
      showToast('Announcement updated successfully', 'success');
      setIsEditModalOpen(false);

      setAnnouncements((prev) =>
        prev.map((a) => (a.id === editForm.id ? updated : a))
      );
      if (detailsModalAnnouncement && detailsModalAnnouncement.id === editForm.id) {
        setDetailsModalAnnouncement(updated);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update announcement';
      setEditServerErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  /**
   * Delete Announcement
   */
  const handleDeleteAnnouncement = async () => {
    if (!deletingAnnouncement) return;
    try {
      setIsDeleting(true);
      await announcementService.deleteAnnouncement(deletingAnnouncement.id);
      showToast('Announcement deleted permanently', 'success');
      setAnnouncements((prev) => prev.filter((a) => a.id !== deletingAnnouncement.id));
      if (detailsModalAnnouncement && detailsModalAnnouncement.id === deletingAnnouncement.id) {
        setDetailsModalAnnouncement(null);
      }
      setDeletingAnnouncement(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete announcement';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Announcements"
        description="Broadcast official office bulletins, administrative advisories, and company news."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Announcements' }]}
        badge={<Badge variant="primary" dot>REST Endpoint: /api/announcements</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              isLoading={isRefreshing}
              onClick={() => loadAnnouncements(true)}
            >
              Refresh
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                leftIcon={Plus}
                onClick={handleOpenCreateModal}
              >
                New Announcement
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Notices</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.total}</div>
            <div className="text-xs text-slate-500 mt-0.5">Across company board</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & Live</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.published}</div>
            <div className="text-xs text-slate-500 mt-0.5">Currently visible</div>
          </CardContent>
        </Card>

        {isAdmin ? (
          <>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.expired}</div>
                <div className="text-xs text-slate-500 mt-0.5">Past expiry date</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-slate-400">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drafts</span>
                  <FileText className="w-4 h-4 text-slate-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{kpiStats.draft}</div>
                <div className="text-xs text-slate-500 mt-0.5">Unpublished notices</div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="col-span-2 border-l-4 border-l-sky-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notice Board Status</span>
                <div className="mt-1 text-sm font-semibold text-slate-800">
                  Real-time official communication channel
                </div>
                <div className="text-xs text-slate-500">Verified and published by Administration</div>
              </div>
              <Megaphone className="w-8 h-8 text-sky-500 opacity-80" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search and Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search notice title, content, or author..."
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

            <div className="flex items-center gap-2">
              {/* Status filter (Admin only) */}
              {isAdmin && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Live (Active)</option>
                  <option value="DRAFT">Draft / Unpublished</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              )}

              {/* Sort Order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Announcements Feed */}
      {isLoading ? (
        <LoadingState message="Loading company announcements..." />
      ) : errorMessage ? (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-rose-900 mb-1">Failed to Load Announcements</h3>
            <p className="text-sm text-rose-700 mb-4">{errorMessage}</p>
            <Button size="sm" variant="outline" onClick={() => loadAnnouncements()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : processedAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={Megaphone}
              title={
                searchQuery || statusFilter !== 'ALL'
                  ? 'No Announcements Match Your Filters'
                  : 'No Announcements Broadcasted'
              }
              description={
                searchQuery || statusFilter !== 'ALL'
                  ? 'Try clearing the search query or adjusting your status filters.'
                  : isAdmin
                  ? 'Publish your first company-wide announcement to communicate office updates.'
                  : 'There are currently no active company announcements on the bulletin board.'
              }
              action={
                searchQuery || statusFilter !== 'ALL' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : isAdmin ? (
                  <Button size="sm" leftIcon={Plus} onClick={handleOpenCreateModal}>
                    Create First Announcement
                  </Button>
                ) : null
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {processedAnnouncements.map((item) => {
            const expired = isExpired(item);

            return (
              <Card
                key={item.id}
                className={`hover:border-blue-300 transition-all ${
                  !item.active ? 'bg-slate-50/70 border-slate-200/90' : ''
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    {/* Main Content */}
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Status Badges & Metadata */}
                      <div className="flex flex-wrap items-center gap-2">
                        {item.active ? (
                          expired ? (
                            <Badge variant="warning" dot>
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="success" dot>
                              Published
                            </Badge>
                          )
                        ) : (
                          <Badge variant="neutral" dot>
                            Draft
                          </Badge>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">
                            {item.publishedByUsername || 'Administrator'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(item.publishedAt || item.createdAt)}</span>
                        </div>

                        {item.expiryDate && (
                          <div className={`flex items-center gap-1 text-xs ${expired ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                            <span>Expires: {formatDate(item.expiryDate)}</span>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <button
                        type="button"
                        onClick={() => setDetailsModalAnnouncement(item)}
                        className="text-base font-bold text-slate-900 hover:text-blue-600 text-left transition-colors block"
                      >
                        {item.title}
                      </button>

                      {/* Content Preview */}
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={Eye}
                        onClick={() => setDetailsModalAnnouncement(item)}
                      >
                        Read Notice
                      </Button>

                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                            title="Edit Announcement"
                            onClick={() => handleOpenEditModal(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600"
                            title="Delete Announcement"
                            onClick={() => setDeletingAnnouncement(item)}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ================= CREATE ANNOUNCEMENT MODAL ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">New Company Announcement</h3>
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
                label="Announcement Title *"
                placeholder="e.g. Annual Office Maintenance & Network Upgrade Notice"
                value={createForm.title}
                onChange={(e) => {
                  setCreateForm({ ...createForm, title: e.target.value });
                  if (createErrors.title) setCreateErrors({ ...createErrors, title: null });
                }}
                error={createErrors.title}
                helperText="Maximum 200 characters"
              />

              {/* Content */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Notice Content *</label>
                <textarea
                  rows={5}
                  placeholder="Draft the complete message, instructions, or policy memo..."
                  value={createForm.content}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, content: e.target.value });
                    if (createErrors.content) setCreateErrors({ ...createErrors, content: null });
                  }}
                  className={`w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    createErrors.content ? 'border-rose-400' : 'border-slate-300'
                  }`}
                />
                {createErrors.content && (
                  <p className="text-[11px] text-rose-600">{createErrors.content}</p>
                )}
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={createForm.expiryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setCreateForm({ ...createForm, expiryDate: e.target.value });
                    if (createErrors.expiryDate) setCreateErrors({ ...createErrors, expiryDate: null });
                  }}
                  className={`w-full text-xs px-2.5 py-2 border rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    createErrors.expiryDate ? 'border-rose-400' : 'border-slate-300'
                  }`}
                />
                {createErrors.expiryDate ? (
                  <p className="text-[11px] text-rose-600">{createErrors.expiryDate}</p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    After this date, the announcement will automatically be archived from the general feed.
                  </p>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create-active"
                  checked={createForm.active}
                  onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="create-active" className="text-xs font-medium text-slate-800">
                  Publish immediately (Uncheck to save as draft)
                </label>
              </div>

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
                  Publish Announcement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT ANNOUNCEMENT MODAL ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  Edit Announcement #{editForm.id}
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
                label="Announcement Title *"
                value={editForm.title}
                onChange={(e) => {
                  setEditForm({ ...editForm, title: e.target.value });
                  if (editErrors.title) setEditErrors({ ...editErrors, title: null });
                }}
                error={editErrors.title}
                helperText="Maximum 200 characters"
              />

              {/* Content */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Notice Content *</label>
                <textarea
                  rows={5}
                  value={editForm.content}
                  onChange={(e) => {
                    setEditForm({ ...editForm, content: e.target.value });
                    if (editErrors.content) setEditErrors({ ...editErrors, content: null });
                  }}
                  className={`w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    editErrors.content ? 'border-rose-400' : 'border-slate-300'
                  }`}
                />
                {editErrors.content && (
                  <p className="text-[11px] text-rose-600">{editErrors.content}</p>
                )}
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">Expiration Date</label>
                <input
                  type="date"
                  value={editForm.expiryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setEditForm({ ...editForm, expiryDate: e.target.value });
                    if (editErrors.expiryDate) setEditErrors({ ...editErrors, expiryDate: null });
                  }}
                  className={`w-full text-xs px-2.5 py-2 border rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    editErrors.expiryDate ? 'border-rose-400' : 'border-slate-300'
                  }`}
                />
                {editErrors.expiryDate && (
                  <p className="text-[11px] text-rose-600">{editErrors.expiryDate}</p>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="edit-active" className="text-xs font-medium text-slate-800">
                  Published and Active
                </label>
              </div>

              {/* Actions */}
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

      {/* ================= ANNOUNCEMENT DETAILS MODAL ================= */}
      {detailsModalAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div className="space-y-1.5 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  {detailsModalAnnouncement.active ? (
                    isExpired(detailsModalAnnouncement) ? (
                      <Badge variant="warning" dot>
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="success" dot>
                        Published
                      </Badge>
                    )
                  ) : (
                    <Badge variant="neutral" dot>
                      Draft
                    </Badge>
                  )}

                  {detailsModalAnnouncement.expiryDate && (
                    <span className="text-[11px] text-slate-500">
                      Expires: {formatDate(detailsModalAnnouncement.expiryDate)}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {detailsModalAnnouncement.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalAnnouncement(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Attribution Meta Box */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {detailsModalAnnouncement.publishedByUsername
                      ? detailsModalAnnouncement.publishedByUsername.charAt(0).toUpperCase()
                      : 'A'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {detailsModalAnnouncement.publishedByUsername || 'Administrator'}
                    </span>
                    <span className="text-[11px] text-slate-400">Author & Publisher</span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500">
                  <span>Published on:</span>
                  <div className="font-medium text-slate-700">
                    {formatDateTime(detailsModalAnnouncement.publishedAt || detailsModalAnnouncement.createdAt)}
                  </div>
                </div>
              </div>

              {/* Full Content */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Notice Details
                </h4>
                <div className="p-4 bg-white border border-slate-200/80 rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {detailsModalAnnouncement.content}
                </div>
              </div>

              {/* Admin Publication Quick Toggle */}
              {isAdmin && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Publication Status
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {detailsModalAnnouncement.active
                        ? 'This notice is currently live to all employees.'
                        : 'This notice is currently in draft mode.'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={detailsModalAnnouncement.active ? 'outline' : 'primary'}
                    isLoading={togglingPublishId === detailsModalAnnouncement.id}
                    onClick={() => handleTogglePublish(detailsModalAnnouncement)}
                  >
                    {detailsModalAnnouncement.active ? 'Unpublish to Draft' : 'Publish Live'}
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 hover:text-rose-700 border-rose-200"
                    leftIcon={Trash2}
                    onClick={() => setDeletingAnnouncement(detailsModalAnnouncement)}
                  >
                    Delete
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={Edit2}
                    onClick={() => {
                      handleOpenEditModal(detailsModalAnnouncement);
                    }}
                  >
                    Edit
                  </Button>
                )}
                <Button size="sm" onClick={() => setDetailsModalAnnouncement(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {deletingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Announcement?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete announcement{' '}
              <span className="font-semibold text-slate-900">"{deletingAnnouncement.title}"</span>? This will permanently remove it from the company notice board.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingAnnouncement(null)}
                disabled={isDeleting}
              >
                Keep Notice
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={handleDeleteAnnouncement}
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

export default AnnouncementsPage;

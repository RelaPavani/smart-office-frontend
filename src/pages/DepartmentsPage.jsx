import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  CheckCircle2,
  Layers,
  Check,
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
import { departmentService } from '../services/departmentService';

export function DepartmentsPage() {
  const { showToast } = useApp();
  const { isAdmin } = useAuth();

  // Data states
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Create / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', active: true });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalServerError, setModalServerError] = useState(null);

  // Delete Confirmation Modal State
  const [deletingDepartment, setDeletingDepartment] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Fetch departments from backend
   */
  const loadDepartments = useCallback(async (search = '', silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const data = await departmentService.getDepartments(search);
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load departments';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Load when debounced search term changes
  useEffect(() => {
    loadDepartments(debouncedSearch);
  }, [debouncedSearch, loadDepartments]);

  /**
   * Calculate summary metrics
   */
  const metrics = useMemo(() => {
    const total = departments.length;
    const active = departments.filter((d) => d.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [departments]);

  /**
   * Open modal for creating a new department
   */
  const handleOpenCreateModal = () => {
    setEditingDepartment(null);
    setFormData({ name: '', description: '', active: true });
    setFormErrors({});
    setModalServerError(null);
    setIsFormModalOpen(true);
  };

  /**
   * Open modal for editing an existing department
   */
  const handleOpenEditModal = (dept) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name || '',
      description: dept.description || '',
      active: dept.active !== undefined ? dept.active : true,
    });
    setFormErrors({});
    setModalServerError(null);
    setIsFormModalOpen(true);
  };

  /**
   * Form validation
   */
  const validateForm = () => {
    const errors = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      errors.name = 'Department name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Department name must be at least 2 characters';
    } else if (trimmedName.length > 100) {
      errors.name = 'Department name cannot exceed 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission (Create or Update)
   */
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingDepartment) {
        // Update existing department
        const updated = await departmentService.updateDepartment(editingDepartment.id, {
          name: formData.name,
          description: formData.description,
          active: formData.active,
        });
        showToast(`Department "${updated.name}" updated successfully`, 'success');
      } else {
        // Create new department
        const created = await departmentService.createDepartment({
          name: formData.name,
          description: formData.description,
          active: formData.active,
        });
        showToast(`Department "${created.name}" created successfully`, 'success');
      }

      setIsFormModalOpen(false);
      loadDepartments(debouncedSearch, true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      setModalServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle department deletion
   */
  const handleDeleteConfirm = async () => {
    if (!deletingDepartment) return;

    setIsDeleting(true);
    try {
      await departmentService.deleteDepartment(deletingDepartment.id);
      showToast(`Department "${deletingDepartment.name}" deleted successfully`, 'success');
      setDeletingDepartment(null);
      loadDepartments(debouncedSearch, true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete department';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Departments"
        description="Organize enterprise divisions, managerial hierarchies, and departmental structures."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Departments' }]}
        badge={<Badge variant="primary" dot>Live MySQL Database</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              isLoading={isRefreshing}
              onClick={() => loadDepartments(debouncedSearch, true)}
              title="Refresh list"
            >
              Refresh
            </Button>
            {isAdmin && (
              <Button
                leftIcon={Plus}
                size="sm"
                onClick={handleOpenCreateModal}
              >
                Create Department
              </Button>
            )}
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Departments</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.total}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Divisions</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.active}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive Divisions</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.inactive}</p>
          </div>
        </Card>
      </div>

      {/* Main Department List Card */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Department Directory</CardTitle>
              <CardDescription>
                Live divisions retrieved from Spring Boot DepartmentService
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-72">
              <InputField
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={Search}
                rightIcon={searchQuery ? X : undefined}
                className="py-1.5 text-xs"
                containerClassName="mb-0"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Loading State */}
          {isLoading ? (
            <LoadingState message="Loading departments from MySQL..." fullHeight />
          ) : errorMessage ? (
            /* Error State */
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-500 mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Failed to Load Departments</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                leftIcon={RefreshCw}
                onClick={() => loadDepartments(debouncedSearch)}
              >
                Try Again
              </Button>
            </div>
          ) : departments.length === 0 ? (
            /* Empty State */
            <div className="p-6">
              <EmptyState
                icon={Building2}
                title={searchQuery ? 'No departments found' : 'No departments configured'}
                description={
                  searchQuery
                    ? `No departments matched your search for "${searchQuery}". Try a different keyword.`
                    : 'Get started by creating your organization’s first department.'
                }
                action={
                  searchQuery ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </Button>
                  ) : isAdmin ? (
                    <Button
                      leftIcon={Plus}
                      size="sm"
                      onClick={handleOpenCreateModal}
                    >
                      Create Department
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            /* Department Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Department Name</th>
                    <th scope="col" className="px-6 py-3.5">Description</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5">Created Date</th>
                    {isAdmin && (
                      <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((dept) => (
                    <tr
                      key={dept.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">{dept.name}</span>
                            <span className="block text-xs font-mono text-slate-400">ID #{dept.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                        {dept.description || <span className="text-slate-400 italic">No description</span>}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {dept.active ? (
                          <Badge variant="success" dot>Active</Badge>
                        ) : (
                          <Badge variant="neutral" dot>Inactive</Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }) : '—'}
                      </td>

                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-slate-600 hover:text-blue-600"
                              onClick={() => handleOpenEditModal(dept)}
                              title="Edit department"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => setDeletingDepartment(dept)}
                              title="Delete department"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span className="sr-only sm:not-sr-only sm:ml-1 text-rose-600">Delete</span>
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Department Modal Dialog */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="modal-title" className="text-base font-semibold text-slate-900">
                    {editingDepartment ? 'Edit Department' : 'Create New Department'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingDepartment ? `Updating department #${editingDepartment.id}` : 'Fill in the division parameters'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
                onClick={() => setIsFormModalOpen(false)}
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Server Error Alert inside Modal */}
            {modalServerError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{modalServerError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
              <InputField
                id="dept-name"
                label="Department Name"
                required
                placeholder="e.g. Information Technology"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
                disabled={isSubmitting}
                maxLength={100}
              />

              <div className="w-full text-left">
                <label
                  htmlFor="dept-description"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="dept-description"
                  rows={3}
                  className="block w-full rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 p-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="Optional summary of responsibilities, team scope, or division goals..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-1 text-xs text-slate-400">
                  {formErrors.description ? (
                    <span className="text-rose-600 font-medium">{formErrors.description}</span>
                  ) : (
                    <span>Brief division scope</span>
                  )}
                  <span>{formData.description?.length || 0}/500</span>
                </div>
              </div>

              {/* Active Toggle Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    disabled={isSubmitting}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800">Active Department</span>
                    <p className="text-xs text-slate-400">Permits employee assignments and operational scheduling</p>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="md"
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={isSubmitting}
                  leftIcon={Check}
                >
                  {editingDepartment ? 'Save Changes' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDepartment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 id="delete-dialog-title" className="text-lg font-bold text-slate-900">
              Delete Department?
            </h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{deletingDepartment.name}"</span>?
              This action cannot be undone.
            </p>
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              Note: The backend will prevent deletion if active employees are currently assigned to this department.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setDeletingDepartment(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isDeleting}
                onClick={handleDeleteConfirm}
              >
                Delete Department
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentsPage;

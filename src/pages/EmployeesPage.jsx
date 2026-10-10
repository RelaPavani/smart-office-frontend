import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  UserX,
  Eye,
  Mail,
  Phone,
  Calendar,
  Building2,
  Shield,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
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
import { employeeService } from '../services/employeeService';
import { departmentService } from '../services/departmentService';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export function EmployeesPage() {
  const { showToast } = useApp();
  const { user, role, isAdmin, isManager } = useAuth();

  // Employee list states
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileModalEmployee, setProfileModalEmployee] = useState(null);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
    departmentId: '',
    managerId: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalServerError, setModalServerError] = useState(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Load departments for filter and select dropdowns
   */
  const loadDepartments = useCallback(async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch {
      // Non-critical: failure here simply keeps department list empty
    }
  }, []);

  /**
   * Load employees based on current role and filters
   */
  const loadEmployees = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        if (isAdmin || isManager) {
          const filters = {};
          if (debouncedSearch) filters.search = debouncedSearch;
          if (selectedDepartment) filters.departmentId = selectedDepartment;
          if (selectedStatus) filters.status = selectedStatus;

          const data = await employeeService.getEmployees(filters);
          setEmployees(Array.isArray(data) ? data : []);
        } else {
          // Regular employee role: Fetch current employee profile
          const myProfile = await employeeService.getCurrentEmployee();
          setEmployees(myProfile ? [myProfile] : []);
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to load employee records';
        setErrorMessage(msg);
        showToast(msg, 'error');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAdmin, isManager, debouncedSearch, selectedDepartment, selectedStatus, showToast]
  );

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /**
   * Calculate summary metrics from loaded employees
   */
  const metrics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'ACTIVE').length;
    const onLeave = employees.filter((e) => e.status === 'ON_LEAVE').length;
    const inactive = employees.filter((e) => e.status === 'INACTIVE').length;
    return { total, active, onLeave, inactive };
  }, [employees]);

  /**
   * Open Add Employee modal
   */
  const handleOpenAddModal = () => {
    setFormData({
      employeeCode: `EMP${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      designation: '',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      departmentId: departments[0]?.id ? String(departments[0].id) : '',
      managerId: '',
      userId: '',
    });
    setFormErrors({});
    setModalServerError(null);
    setIsAddModalOpen(true);
  };

  /**
   * Open Edit Employee modal
   */
  const handleOpenEditModal = (emp) => {
    setEditingEmployeeId(emp.id);
    setFormData({
      employeeCode: emp.employeeCode || '',
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      joiningDate: emp.joiningDate || '',
      status: emp.status || 'ACTIVE',
      departmentId: emp.departmentId ? String(emp.departmentId) : '',
      managerId: emp.managerId ? String(emp.managerId) : '',
    });
    setFormErrors({});
    setModalServerError(null);
    setIsEditModalOpen(true);
  };

  /**
   * Client-side form validation
   */
  const validateForm = (isEdit = false) => {
    const errors = {};

    if (!isEdit) {
      if (!formData.employeeCode?.trim()) {
        errors.employeeCode = 'Employee code is required';
      } else if (formData.employeeCode.trim().length > 30) {
        errors.employeeCode = 'Employee code cannot exceed 30 characters';
      }

      if (!formData.email?.trim()) {
        errors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errors.email = 'Please provide a valid email format';
      }

      if (!formData.joiningDate) {
        errors.joiningDate = 'Joining date is required';
      } else {
        const today = new Date().toISOString().split('T')[0];
        if (formData.joiningDate > today) {
          errors.joiningDate = 'Joining date cannot be in the future';
        }
      }
    }

    if (!formData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length > 50) {
      errors.firstName = 'First name cannot exceed 50 characters';
    }

    if (!formData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length > 50) {
      errors.lastName = 'Last name cannot exceed 50 characters';
    }

    if (!formData.designation?.trim()) {
      errors.designation = 'Designation is required';
    } else if (formData.designation.trim().length > 100) {
      errors.designation = 'Designation cannot exceed 100 characters';
    }

    if (formData.phone && formData.phone.length > 20) {
      errors.phone = 'Phone cannot exceed 20 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle Add Employee form submission
   */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setModalServerError(null);

    if (!validateForm(false)) return;

    setIsSubmitting(true);
    try {
      const created = await employeeService.createEmployee({
        employeeCode: formData.employeeCode,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        designation: formData.designation,
        joiningDate: formData.joiningDate,
        status: formData.status,
        departmentId: formData.departmentId ? Number(formData.departmentId) : null,
        managerId: formData.managerId ? Number(formData.managerId) : null,
        userId: formData.userId ? Number(formData.userId) : null,
      });

      showToast(`Employee ${created.firstName} ${created.lastName} created successfully`, 'success');
      setIsAddModalOpen(false);
      loadEmployees(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create employee';
      setModalServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle Edit Employee form submission
   */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setModalServerError(null);

    if (!validateForm(true)) return;

    setIsSubmitting(true);
    try {
      const updated = await employeeService.updateEmployee(editingEmployeeId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || null,
        designation: formData.designation,
        status: formData.status,
        departmentId: formData.departmentId ? Number(formData.departmentId) : null,
        managerId: formData.managerId ? Number(formData.managerId) : null,
      });

      showToast(`Employee ${updated.firstName} ${updated.lastName} updated successfully`, 'success');
      setIsEditModalOpen(false);
      loadEmployees(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update employee';
      setModalServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle Employee Deactivation
   */
  const handleDeactivateConfirm = async () => {
    if (!deactivatingEmployee) return;

    setIsSubmitting(true);
    try {
      await employeeService.deactivateEmployee(deactivatingEmployee.id);
      showToast(`Employee ${deactivatingEmployee.firstName} ${deactivatingEmployee.lastName} deactivated`, 'success');
      setDeactivatingEmployee(null);
      loadEmployees(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to deactivate employee';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Render status badge helper
   */
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success" dot>Active</Badge>;
      case 'ON_LEAVE':
        return <Badge variant="warning" dot>On Leave</Badge>;
      case 'INACTIVE':
        return <Badge variant="neutral" dot>Inactive</Badge>;
      default:
        return <Badge variant="neutral">{status || 'Unknown'}</Badge>;
    }
  };

  // Check if any filter is applied
  const hasActiveFilters = debouncedSearch || selectedDepartment || selectedStatus;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('');
    setSelectedStatus('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Employees Directory"
        description="Comprehensive workplace directory, personnel profiles, departmental assignments, and reporting structures."
        breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Employees' }]}
        badge={<Badge variant="primary" dot>Live MySQL Database</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              isLoading={isRefreshing}
              onClick={() => loadEmployees(true)}
              title="Refresh employee records"
            >
              Refresh
            </Button>
            {isAdmin && (
              <Button
                leftIcon={UserPlus}
                size="sm"
                onClick={handleOpenAddModal}
              >
                Add Employee
              </Button>
            )}
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.total}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Staff</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.active}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">On Leave</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.onLeave}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Inactive Staff</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{metrics.inactive}</p>
          </div>
        </Card>
      </div>

      {/* Main Staff Directory Card */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>Staff Records</CardTitle>
              <CardDescription>
                Live personnel profiles connected to Spring Boot EmployeeService
              </CardDescription>
            </div>

            {/* Filter and Search Bar */}
            {(isAdmin || isManager) && (
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Field */}
                <div className="w-full sm:w-60">
                  <InputField
                    placeholder="Search by name, email, code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={Search}
                    rightIcon={searchQuery ? X : undefined}
                    className="py-1.5 text-xs"
                    containerClassName="mb-0"
                  />
                </div>

                {/* Department Filter */}
                <div className="w-full sm:w-44">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 text-xs py-2 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-36">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 text-xs py-2 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters Button */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Reset
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Loading State */}
          {isLoading ? (
            <LoadingState message="Loading staff directory from MySQL..." fullHeight />
          ) : errorMessage ? (
            /* Error State */
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-500 mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Failed to Load Staff Directory</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                leftIcon={RefreshCw}
                onClick={() => loadEmployees()}
              >
                Try Again
              </Button>
            </div>
          ) : employees.length === 0 ? (
            /* Empty State */
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={hasActiveFilters ? 'No employees match criteria' : 'No employees registered'}
                description={
                  hasActiveFilters
                    ? 'Try adjusting your search keywords, department filter, or status selection.'
                    : 'Get started by onboarding your organization’s first employee.'
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={handleResetFilters}>
                      Clear Filters
                    </Button>
                  ) : isAdmin ? (
                    <Button leftIcon={UserPlus} size="sm" onClick={handleOpenAddModal}>
                      Add Employee
                    </Button>
                  ) : null
                }
              />
            </div>
          ) : (
            /* Employee Directory Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">Employee</th>
                    <th scope="col" className="px-6 py-3.5">Department & Role</th>
                    <th scope="col" className="px-6 py-3.5">Contact</th>
                    <th scope="col" className="px-6 py-3.5">Status</th>
                    <th scope="col" className="px-6 py-3.5">Joined</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const initials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Employee Avatar & Name */}
                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-sm">
                              {initials}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900">
                                {emp.firstName} {emp.lastName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs font-mono text-slate-500">{emp.employeeCode}</span>
                                {emp.userId && (
                                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 font-mono">
                                    User #{emp.userId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department & Designation */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-slate-800 block text-xs">{emp.designation}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            {emp.departmentName || <span className="italic text-slate-400">Unassigned</span>}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a href={`mailto:${emp.email}`} className="hover:text-blue-600 hover:underline">
                              {emp.email}
                            </a>
                          </div>
                          {emp.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderStatusBadge(emp.status)}
                        </td>

                        {/* Joined Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {emp.joiningDate ? (
                            new Date(emp.joiningDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-slate-600 hover:text-blue-600"
                              onClick={() => setProfileModalEmployee(emp)}
                              title="View employee profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="sr-only sm:not-sr-only sm:ml-1">View</span>
                            </Button>

                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-slate-600 hover:text-blue-600"
                                  onClick={() => handleOpenEditModal(emp)}
                                  title="Edit employee details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
                                </Button>

                                {emp.status !== 'INACTIVE' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                                    onClick={() => setDeactivatingEmployee(emp)}
                                    title="Deactivate employee"
                                  >
                                    <UserX className="w-3.5 h-3.5 text-rose-500" />
                                    <span className="sr-only sm:not-sr-only sm:ml-1 text-rose-600">Deactivate</span>
                                  </Button>
                                )}
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
          )}
        </CardContent>
      </Card>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="add-modal-title" className="text-base font-semibold text-slate-900">
                    Add New Employee
                  </h3>
                  <p className="text-xs text-slate-500">Register employee record in MySQL database</p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Server Error Alert */}
            {modalServerError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{modalServerError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="add-emp-code"
                  label="Employee Code"
                  required
                  placeholder="e.g. EMP1024"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  error={formErrors.employeeCode}
                  disabled={isSubmitting}
                  maxLength={30}
                />

                <InputField
                  id="add-emp-email"
                  label="Email Address"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={formErrors.email}
                  disabled={isSubmitting}
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="add-emp-firstname"
                  label="First Name"
                  required
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  error={formErrors.firstName}
                  disabled={isSubmitting}
                  maxLength={50}
                />

                <InputField
                  id="add-emp-lastname"
                  label="Last Name"
                  required
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  error={formErrors.lastName}
                  disabled={isSubmitting}
                  maxLength={50}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="add-emp-designation"
                  label="Designation / Role"
                  required
                  placeholder="Senior Software Engineer"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  error={formErrors.designation}
                  disabled={isSubmitting}
                  maxLength={100}
                />

                <InputField
                  id="add-emp-phone"
                  label="Phone Number"
                  placeholder="+1 (555) 019-2834"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={formErrors.phone}
                  disabled={isSubmitting}
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="add-emp-joiningdate"
                  label="Joining Date"
                  type="date"
                  required
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  error={formErrors.joiningDate}
                  disabled={isSubmitting}
                  max={new Date().toISOString().split('T')[0]}
                />

                {/* Department Select */}
                <div className="w-full text-left">
                  <label
                    htmlFor="add-emp-department"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Department
                  </label>
                  <select
                    id="add-emp-department"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    disabled={isSubmitting}
                    className="block w-full rounded-lg border border-slate-300 text-sm py-2.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full text-left">
                  <label
                    htmlFor="add-emp-status"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Status
                  </label>
                  <select
                    id="add-emp-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={isSubmitting}
                    className="block w-full rounded-lg border border-slate-300 text-sm py-2.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                {/* Manager Select */}
                <div className="w-full text-left">
                  <label
                    htmlFor="add-emp-manager"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Reporting Manager
                  </label>
                  <select
                    id="add-emp-manager"
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    disabled={isSubmitting}
                    className="block w-full rounded-lg border border-slate-300 text-sm py-2.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="">None / Top Level</option>
                    {employees
                      .filter((e) => e.status === 'ACTIVE')
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.designation})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Linked User Account ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="add-emp-userid"
                  label="Linked User ID"
                  placeholder="e.g. 179 (Optional)"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  disabled={isSubmitting}
                  helperText={user ? `Current user: #${user.id} (${user.username})` : 'Associates login account for attendance and self-service'}
                />
              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="md"
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
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
                  Save Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="edit-modal-title" className="text-base font-semibold text-slate-900">
                    Edit Employee Record
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formData.employeeCode} • {formData.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Server Error Alert */}
            {modalServerError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{modalServerError}</span>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="edit-emp-firstname"
                  label="First Name"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  error={formErrors.firstName}
                  disabled={isSubmitting}
                  maxLength={50}
                />

                <InputField
                  id="edit-emp-lastname"
                  label="Last Name"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  error={formErrors.lastName}
                  disabled={isSubmitting}
                  maxLength={50}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="edit-emp-designation"
                  label="Designation / Role"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  error={formErrors.designation}
                  disabled={isSubmitting}
                  maxLength={100}
                />

                <InputField
                  id="edit-emp-phone"
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  error={formErrors.phone}
                  disabled={isSubmitting}
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department Select */}
                <div className="w-full text-left">
                  <label
                    htmlFor="edit-emp-department"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Department
                  </label>
                  <select
                    id="edit-emp-department"
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    disabled={isSubmitting}
                    className="block w-full rounded-lg border border-slate-300 text-sm py-2.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Select */}
                <div className="w-full text-left">
                  <label
                    htmlFor="edit-emp-status"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Status
                  </label>
                  <select
                    id="edit-emp-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={isSubmitting}
                    className="block w-full rounded-lg border border-slate-300 text-sm py-2.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Manager Select */}
              <div className="w-full text-left">
                <label
                  htmlFor="edit-emp-manager"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Reporting Manager
                </label>
                <select
                  id="edit-emp-manager"
                  value={formData.managerId}
                  onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  disabled={isSubmitting}
                  className="block w-full rounded-lg border border-slate-300 text-sm py-2.5 px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  <option value="">None / Top Level</option>
                  {employees
                    .filter((e) => e.id !== editingEmployeeId && e.status === 'ACTIVE')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.designation})
                      </option>
                    ))}
                </select>
              </div>

              <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                Employee code, primary email, and joining date are permanent identifiers that can only be altered by a database administrator.
              </p>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="md"
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Details / Profile Modal */}
      {profileModalEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 id="profile-dialog-title" className="text-base font-semibold text-slate-900">
                Employee Profile Details
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
                onClick={() => setProfileModalEmployee(null)}
              >
                <X className="w-5 h-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Profile Avatar Card */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md">
                {`${profileModalEmployee.firstName?.charAt(0) || ''}${profileModalEmployee.lastName?.charAt(0) || ''}`.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-slate-900 truncate">
                  {profileModalEmployee.firstName} {profileModalEmployee.lastName}
                </h4>
                <p className="text-xs font-medium text-slate-600">{profileModalEmployee.designation}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-xs text-slate-500 font-semibold">
                    {profileModalEmployee.employeeCode}
                  </span>
                  {renderStatusBadge(profileModalEmployee.status)}
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="mt-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-100 bg-white">
                <div>
                  <span className="text-slate-400 block font-medium">Department</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                    {profileModalEmployee.departmentName || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Reporting Line</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                    {profileModalEmployee.managerName || 'None (Top Level)'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email
                  </span>
                  <a
                    href={`mailto:${profileModalEmployee.email}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {profileModalEmployee.email}
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone
                  </span>
                  <span className="font-medium text-slate-700">
                    {profileModalEmployee.phone || 'Not provided'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Joining Date
                  </span>
                  <span className="font-medium text-slate-700">
                    {profileModalEmployee.joiningDate || '—'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Database Employee ID:</span>
                  <span className="font-mono font-medium text-slate-700">#{profileModalEmployee.id}</span>
                </div>
                {profileModalEmployee.userId && (
                  <div className="flex justify-between">
                    <span>Linked User Account:</span>
                    <span className="font-mono font-medium text-blue-600">User #{profileModalEmployee.userId}</span>
                  </div>
                )}
                {profileModalEmployee.createdAt && (
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(profileModalEmployee.createdAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setProfileModalEmployee(null)}
              >
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Employee Confirmation Modal */}
      {deactivatingEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="deactivate-dialog-title"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <UserX className="w-6 h-6" />
            </div>

            <h3 id="deactivate-dialog-title" className="text-lg font-bold text-slate-900">
              Deactivate Employee?
            </h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-slate-900">
                {deactivatingEmployee.firstName} {deactivatingEmployee.lastName}
              </span>{' '}
              ({deactivatingEmployee.employeeCode})?
            </p>
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              Deactivating this employee sets their status to INACTIVE. Their historical logs, attendance records, and leave history will remain preserved in MySQL.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="md"
                onClick={() => setDeactivatingEmployee(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isSubmitting}
                onClick={handleDeactivateConfirm}
              >
                Deactivate Employee
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeesPage;

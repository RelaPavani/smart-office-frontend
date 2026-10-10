import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Employee Management operations.
 * Communicates with Spring Boot EmployeeController (/api/employees).
 */
export const employeeService = {
  /**
   * Fetches employees with optional department, status, and search filters.
   * Accessible by ADMIN and MANAGER roles.
   * @param {{ departmentId?: number|string, status?: string, search?: string }} [filters]
   * @returns {Promise<Array<object>>} List of EmployeeResponse objects
   */
  async getEmployees(filters = {}) {
    const params = {};
    if (filters.departmentId) {
      params.departmentId = filters.departmentId;
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }

    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.BASE, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves a single employee by their ID.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE (for own profile / team).
   * @param {number|string} id
   * @returns {Promise<object>} EmployeeResponse
   */
  async getEmployeeById(id) {
    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
    return response.data?.data || response.data;
  },

  /**
   * Retrieves the currently authenticated user's employee profile.
   * @returns {Promise<object>} EmployeeResponse
   */
  async getCurrentEmployee() {
    const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES.ME);
    return response.data?.data || response.data;
  },

  /**
   * Creates a new employee record (Admin only).
   * @param {{
   *   employeeCode: string,
   *   firstName: string,
   *   lastName: string,
   *   email: string,
   *   phone?: string,
   *   designation: string,
   *   joiningDate: string,
   *   status: string,
   *   departmentId?: number,
   *   managerId?: number,
   *   userId?: number
   * }} payload
   * @returns {Promise<object>} Created EmployeeResponse
   */
  async createEmployee(payload) {
    const body = {
      employeeCode: payload.employeeCode.trim(),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone ? payload.phone.trim() : null,
      designation: payload.designation.trim(),
      joiningDate: payload.joiningDate,
      status: payload.status || 'ACTIVE',
      departmentId: payload.departmentId ? Number(payload.departmentId) : null,
      managerId: payload.managerId ? Number(payload.managerId) : null,
      userId: payload.userId ? Number(payload.userId) : null,
    };

    const response = await apiClient.post(API_ENDPOINTS.EMPLOYEES.BASE, body);
    return response.data?.data || response.data;
  },

  /**
   * Updates an existing employee record (Admin only).
   * @param {number|string} id
   * @param {{
   *   firstName?: string,
   *   lastName?: string,
   *   phone?: string,
   *   designation?: string,
   *   status?: string,
   *   departmentId?: number,
   *   managerId?: number
   * }} payload
   * @returns {Promise<object>} Updated EmployeeResponse
   */
  async updateEmployee(id, payload) {
    const body = {};
    if (payload.firstName !== undefined) body.firstName = payload.firstName.trim();
    if (payload.lastName !== undefined) body.lastName = payload.lastName.trim();
    if (payload.phone !== undefined) body.phone = payload.phone ? payload.phone.trim() : null;
    if (payload.designation !== undefined) body.designation = payload.designation.trim();
    if (payload.status !== undefined) body.status = payload.status;
    if (payload.departmentId !== undefined) {
      body.departmentId = payload.departmentId ? Number(payload.departmentId) : null;
    }
    if (payload.managerId !== undefined) {
      body.managerId = payload.managerId ? Number(payload.managerId) : null;
    }

    const response = await apiClient.put(API_ENDPOINTS.EMPLOYEES.BY_ID(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Updates personal details for the authenticated employee.
   * @param {{ firstName?: string, lastName?: string, phone?: string }} payload
   * @returns {Promise<object>}
   */
  async updatePersonalDetails(payload) {
    const response = await apiClient.put(API_ENDPOINTS.EMPLOYEES.ME, payload);
    return response.data?.data || response.data;
  },

  /**
   * Deactivates an employee (Admin only).
   * Marks employee status as INACTIVE in MySQL.
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async deactivateEmployee(id) {
    const response = await apiClient.delete(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
    return response.data;
  },

  /**
   * Fetches employees belonging to a specific department.
   * @param {number|string} departmentId
   * @returns {Promise<Array<object>>}
   */
  async getEmployeesByDepartment(departmentId) {
    const response = await apiClient.get(`/api/employees/department/${departmentId}`);
    return response.data?.data || response.data || [];
  },
};

export default employeeService;

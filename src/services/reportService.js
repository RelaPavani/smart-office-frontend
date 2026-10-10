import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Reports & Analytics operations.
 * Communicates with Spring Boot ReportController (/api/reports).
 */
export const reportService = {
  /**
   * Fetches Admin Dashboard executive metrics.
   * Access: ROLE_ADMIN
   * @returns {Promise<object>} AdminDashboardResponse
   */
  async getAdminDashboard() {
    const response = await apiClient.get(API_ENDPOINTS.REPORTS.DASHBOARD_ADMIN);
    return response.data?.data || response.data;
  },

  /**
   * Fetches Manager Dashboard team metrics.
   * Access: ROLE_ADMIN, ROLE_MANAGER
   * @returns {Promise<object>} ManagerDashboardResponse
   */
  async getManagerDashboard() {
    const response = await apiClient.get(API_ENDPOINTS.REPORTS.DASHBOARD_MANAGER);
    return response.data?.data || response.data;
  },

  /**
   * Fetches Employee Dashboard personal metrics.
   * Access: ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE
   * @returns {Promise<object>} EmployeeDashboardResponse
   */
  async getEmployeeDashboard() {
    const response = await apiClient.get(API_ENDPOINTS.REPORTS.DASHBOARD_EMPLOYEE);
    return response.data?.data || response.data;
  },

  /**
   * Helper to retrieve the appropriate executive dashboard based on role.
   * @param {string} role - 'ADMIN', 'MANAGER', or 'EMPLOYEE'
   * @returns {Promise<object>}
   */
  async getRoleDashboard(role) {
    if (role === 'ADMIN') {
      return this.getAdminDashboard();
    }
    if (role === 'MANAGER') {
      return this.getManagerDashboard();
    }
    return this.getEmployeeDashboard();
  },

  /**
   * Fetches Attendance Analytics with optional date range and scoping.
   * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), departmentId, employeeId
   * @param {{
   *   startDate?: string,
   *   endDate?: string,
   *   departmentId?: number|string,
   *   employeeId?: number|string
   * }} [filters]
   * @returns {Promise<object>} AttendanceAnalyticsResponse
   */
  async getAttendanceAnalytics(filters = {}) {
    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.employeeId) params.employeeId = filters.employeeId;

    const response = await apiClient.get(API_ENDPOINTS.REPORTS.ATTENDANCE, { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetches Leave Analytics with optional date range and scoping.
   * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), departmentId, employeeId
   * @param {{
   *   startDate?: string,
   *   endDate?: string,
   *   departmentId?: number|string,
   *   employeeId?: number|string
   * }} [filters]
   * @returns {Promise<object>} LeaveAnalyticsResponse
   */
  async getLeaveAnalytics(filters = {}) {
    const params = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.employeeId) params.employeeId = filters.employeeId;

    const response = await apiClient.get(API_ENDPOINTS.REPORTS.LEAVES, { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetches Task Analytics with optional department/employee scoping.
   * Note: The backend TaskAnalytics endpoint does not accept date parameters.
   * Query params: departmentId, employeeId
   * @param {{
   *   departmentId?: number|string,
   *   employeeId?: number|string
   * }} [filters]
   * @returns {Promise<object>} TaskAnalyticsResponse
   */
  async getTaskAnalytics(filters = {}) {
    const params = {};
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.employeeId) params.employeeId = filters.employeeId;

    const response = await apiClient.get(API_ENDPOINTS.REPORTS.TASKS, { params });
    return response.data?.data || response.data;
  },

  /**
   * Fetches Complaint Analytics with optional department/employee scoping.
   * Note: The backend ComplaintAnalytics endpoint does not accept date parameters.
   * Query params: departmentId, employeeId
   * @param {{
   *   departmentId?: number|string,
   *   employeeId?: number|string
   * }} [filters]
   * @returns {Promise<object>} ComplaintAnalyticsResponse
   */
  async getComplaintAnalytics(filters = {}) {
    const params = {};
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.employeeId) params.employeeId = filters.employeeId;

    const response = await apiClient.get(API_ENDPOINTS.REPORTS.COMPLAINTS, { params });
    return response.data?.data || response.data;
  },
};

export default reportService;

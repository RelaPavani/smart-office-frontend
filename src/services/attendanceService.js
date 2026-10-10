import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Attendance Management operations.
 * Communicates with Spring Boot AttendanceController (/api/attendance).
 */
export const attendanceService = {
  /**
   * Check in for today's work shift
   * @returns {Promise<object>} AttendanceResponse
   */
  async checkIn() {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.CHECK_IN);
    return response.data?.data || response.data;
  },

  /**
   * Check out for today's work shift
   * @returns {Promise<object>} AttendanceResponse
   */
  async checkOut() {
    const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE.CHECK_OUT);
    return response.data?.data || response.data;
  },

  /**
   * Retrieves attendance records for the authenticated user
   * @param {string} [date] - Optional date in YYYY-MM-DD format
   * @returns {Promise<Array<object>>} List of AttendanceResponse objects
   */
  async getMyAttendance(date) {
    const params = {};
    if (date) params.date = date;
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.MY, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves current user's monthly attendance summary
   * @param {number} [year]
   * @param {number} [month]
   * @returns {Promise<object>} AttendanceSummaryResponse
   */
  async getMyMonthlySummary(year, month) {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.MY_SUMMARY, { params });
    return response.data?.data || response.data;
  },

  /**
   * Retrieves attendance records for a specific date (ADMIN, MANAGER)
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array<object>>}
   */
  async getAttendanceByDate(date) {
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.BY_DATE(date));
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves monthly attendance records across enterprise/department (ADMIN, MANAGER)
   * @param {number} [year]
   * @param {number} [month]
   * @returns {Promise<Array<object>>}
   */
  async getMonthlyAttendance(year, month) {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const response = await apiClient.get(API_ENDPOINTS.ATTENDANCE.MONTHLY, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves attendance records for a specific employee
   * @param {number|string} employeeId
   * @returns {Promise<Array<object>>}
   */
  async getEmployeeAttendance(employeeId) {
    const response = await apiClient.get(`/api/attendance/employee/${employeeId}`);
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves monthly attendance summary for a specific employee
   * @param {number|string} employeeId
   * @param {number} [year]
   * @param {number} [month]
   * @returns {Promise<object>} AttendanceSummaryResponse
   */
  async getEmployeeMonthlySummary(employeeId, year, month) {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const response = await apiClient.get(`/api/attendance/employee/${employeeId}/summary`, { params });
    return response.data?.data || response.data;
  },
};

export default attendanceService;

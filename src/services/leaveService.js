import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Leave Management operations.
 * Communicates with Spring Boot LeaveController (/api/leaves).
 */
export const leaveService = {
  /**
   * Applies for a leave request.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE.
   * @param {{
   *   employeeId?: number,
   *   leaveType: 'CASUAL'|'SICK'|'EARNED'|'OTHER',
   *   startDate: string,
   *   endDate: string,
   *   reason: string
   * }} payload
   * @returns {Promise<object>} LeaveRequestResponse
   */
  async applyForLeave(payload) {
    const body = {
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason.trim(),
    };
    if (payload.employeeId) {
      body.employeeId = Number(payload.employeeId);
    }
    const response = await apiClient.post(API_ENDPOINTS.LEAVES.BASE, body);
    return response.data?.data || response.data;
  },

  /**
   * Retrieves personal leave requests for the authenticated employee.
   * @returns {Promise<Array<object>>} List of LeaveRequestResponse objects
   */
  async getMyLeaves() {
    const response = await apiClient.get(API_ENDPOINTS.LEAVES.MY);
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves pending leave requests across enterprise (Admin) or department (Manager).
   * Accessible by ADMIN and MANAGER.
   * @returns {Promise<Array<object>>} List of LeaveRequestResponse objects
   */
  async getPendingLeaves() {
    const response = await apiClient.get(API_ENDPOINTS.LEAVES.PENDING);
    return response.data?.data || response.data || [];
  },

  /**
   * Approves a pending leave request.
   * Accessible by ADMIN and MANAGER.
   * Note: The backend prohibits reviewing one's own leave request.
   * @param {number|string} id - Leave request ID
   * @param {string} [remarks] - Optional approval remarks
   * @returns {Promise<object>} LeaveRequestResponse
   */
  async approveLeave(id, remarks = '') {
    const body = remarks ? { remarks: remarks.trim() } : {};
    const response = await apiClient.put(API_ENDPOINTS.LEAVES.APPROVE(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Rejects a pending leave request.
   * Accessible by ADMIN and MANAGER.
   * Note: The backend prohibits reviewing one's own leave request.
   * @param {number|string} id - Leave request ID
   * @param {string} [remarks] - Optional rejection reason
   * @returns {Promise<object>} LeaveRequestResponse
   */
  async rejectLeave(id, remarks = '') {
    const body = remarks ? { remarks: remarks.trim() } : {};
    const response = await apiClient.put(API_ENDPOINTS.LEAVES.REJECT(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Retrieves leave balances for the authenticated employee.
   * Returns initialized balances for CASUAL, SICK, EARNED, and OTHER.
   * @param {number} [year] - Optional year (defaults to current year)
   * @returns {Promise<Array<object>>} List of LeaveBalanceResponse objects
   */
  async getMyLeaveBalances(year) {
    const params = {};
    if (year) params.year = year;
    const response = await apiClient.get(API_ENDPOINTS.LEAVES.BALANCE, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves leave balances for a specific employee.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE (own record).
   * @param {number|string} employeeId
   * @param {number} [year]
   * @returns {Promise<Array<object>>} List of LeaveBalanceResponse objects
   */
  async getLeaveBalancesByEmployee(employeeId, year) {
    const params = {};
    if (year) params.year = year;
    const response = await apiClient.get(API_ENDPOINTS.LEAVES.BALANCE_BY_EMPLOYEE(employeeId), { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves all leave requests for a specific employee.
   * @param {number|string} employeeId
   * @returns {Promise<Array<object>>} List of LeaveRequestResponse objects
   */
  async getLeavesByEmployee(employeeId) {
    const response = await apiClient.get(API_ENDPOINTS.LEAVES.BY_EMPLOYEE(employeeId));
    return response.data?.data || response.data || [];
  },
};

export default leaveService;

import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

export const dashboardService = {
  /**
   * Fetches dashboard analytics according to user role
   * @param {string} role - Normalized role (ADMIN, MANAGER, EMPLOYEE)
   * @returns {Promise<object>}
   */
  async getDashboardMetrics(role) {
    let endpoint = API_ENDPOINTS.REPORTS.DASHBOARD_EMPLOYEE;
    if (role === 'ADMIN') {
      endpoint = API_ENDPOINTS.REPORTS.DASHBOARD_ADMIN;
    } else if (role === 'MANAGER') {
      endpoint = API_ENDPOINTS.REPORTS.DASHBOARD_MANAGER;
    }

    const response = await apiClient.get(endpoint);
    // Backend wraps response in ApiResponse<T>
    return response.data?.data || response.data;
  },

  /**
   * Fetches published announcements for recent activity feed
   * @returns {Promise<Array<object>>}
   */
  async getPublishedAnnouncements() {
    const response = await apiClient.get(API_ENDPOINTS.ANNOUNCEMENTS.PUBLISHED);
    return response.data?.data || response.data || [];
  },
};

export default dashboardService;

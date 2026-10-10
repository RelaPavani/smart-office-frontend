import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Health check response structure returned by Spring Boot HealthController:
 * {
 *   status: "UP",
 *   service: "Smart Office Management System",
 *   version: "1.0.0",
 *   timestamp: "2026-10-09T..."
 * }
 */

export const healthService = {
  /**
   * Fetches backend health status from /api/health (public endpoint)
   * @returns {Promise<{ status: string, service: string, version: string, timestamp: string }>}
   */
  async checkHealth() {
    const response = await apiClient.get(API_ENDPOINTS.HEALTH);
    return response.data;
  },
};

export default healthService;

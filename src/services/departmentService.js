import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Department Management operations.
 * Communicates with Spring Boot DepartmentController (/api/departments).
 */
export const departmentService = {
  /**
   * Fetches departments with optional search filtering by name
   * @param {string} [search] - Optional search query
   * @returns {Promise<Array<object>>} List of DepartmentResponse objects
   */
  async getDepartments(search) {
    const params = {};
    if (search && search.trim()) {
      params.search = search.trim();
    }
    const response = await apiClient.get(API_ENDPOINTS.DEPARTMENTS.BASE, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves a single department by its ID
   * @param {number|string} id
   * @returns {Promise<object>} DepartmentResponse
   */
  async getDepartmentById(id) {
    const response = await apiClient.get(API_ENDPOINTS.DEPARTMENTS.BY_ID(id));
    return response.data?.data || response.data;
  },

  /**
   * Creates a new department (Admin only)
   * @param {{ name: string, description?: string, active?: boolean }} payload
   * @returns {Promise<object>} Created DepartmentResponse
   */
  async createDepartment(payload) {
    const response = await apiClient.post(API_ENDPOINTS.DEPARTMENTS.BASE, {
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : null,
      active: payload.active !== undefined ? Boolean(payload.active) : true,
    });
    return response.data?.data || response.data;
  },

  /**
   * Updates an existing department by ID (Admin only)
   * @param {number|string} id
   * @param {{ name?: string, description?: string, active?: boolean }} payload
   * @returns {Promise<object>} Updated DepartmentResponse
   */
  async updateDepartment(id, payload) {
    const body = {};
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.description !== undefined) body.description = payload.description.trim();
    if (payload.active !== undefined) body.active = Boolean(payload.active);

    const response = await apiClient.put(API_ENDPOINTS.DEPARTMENTS.BY_ID(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Deletes a department by ID (Admin only)
   * Backend will reject if department has active employees assigned.
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async deleteDepartment(id) {
    const response = await apiClient.delete(API_ENDPOINTS.DEPARTMENTS.BY_ID(id));
    return response.data;
  },
};

export default departmentService;

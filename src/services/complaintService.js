import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Complaint & Grievance Management operations.
 * Communicates with Spring Boot ComplaintController (/api/complaints).
 */
export const complaintService = {
  /**
   * Retrieves complaints list with optional filtering.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE (scoped by backend).
   *
   * @param {{
   *   status?: 'OPEN'|'IN_PROGRESS'|'RESOLVED'|'CLOSED'|'REJECTED',
   *   category?: 'GENERAL'|'IT'|'HR'|'FACILITIES'|'PAYROLL'|'OTHER',
   *   priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT',
   *   employeeId?: number|string
   * }} [filters]
   * @returns {Promise<Array<object>>} List of ComplaintResponse objects
   */
  async listComplaints(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.priority) params.priority = filters.priority;
    if (filters.employeeId) params.employeeId = filters.employeeId;

    const response = await apiClient.get(API_ENDPOINTS.COMPLAINTS.BASE, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves personal complaints submitted by the authenticated employee.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE.
   *
   * @returns {Promise<Array<object>>} List of ComplaintResponse objects
   */
  async getMyComplaints() {
    const response = await apiClient.get(API_ENDPOINTS.COMPLAINTS.MY);
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves a single complaint by ID.
   *
   * @param {number|string} id
   * @returns {Promise<object>} ComplaintResponse
   */
  async getComplaintById(id) {
    const response = await apiClient.get(API_ENDPOINTS.COMPLAINTS.BY_ID(id));
    return response.data?.data || response.data;
  },

  /**
   * Submits a new formal complaint/grievance.
   *
   * @param {{
   *   employeeId: number|string,
   *   title: string,
   *   description: string,
   *   category: 'GENERAL'|'IT'|'HR'|'FACILITIES'|'PAYROLL'|'OTHER',
   *   priority: 'LOW'|'MEDIUM'|'HIGH'|'URGENT'
   * }} payload
   * @returns {Promise<object>} ComplaintResponse
   */
  async createComplaint(payload) {
    const body = {
      employeeId: Number(payload.employeeId),
      title: payload.title.trim(),
      description: payload.description.trim(),
      category: payload.category,
      priority: payload.priority,
    };

    const response = await apiClient.post(API_ENDPOINTS.COMPLAINTS.BASE, body);
    return response.data?.data || response.data;
  },

  /**
   * Updates an existing complaint.
   *
   * @param {number|string} id
   * @param {{
   *   category?: 'GENERAL'|'IT'|'HR'|'FACILITIES'|'PAYROLL'|'OTHER',
   *   priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT',
   *   status?: 'OPEN'|'IN_PROGRESS'|'RESOLVED'|'CLOSED'|'REJECTED',
   *   assignedToId?: number|string,
   *   resolution?: string
   * }} payload
   * @returns {Promise<object>} ComplaintResponse
   */
  async updateComplaint(id, payload) {
    const body = {};
    if (payload.category !== undefined) body.category = payload.category;
    if (payload.priority !== undefined) body.priority = payload.priority;
    if (payload.status !== undefined) body.status = payload.status;
    if (payload.assignedToId !== undefined) {
      body.assignedToId = payload.assignedToId ? Number(payload.assignedToId) : null;
    }
    if (payload.resolution !== undefined) {
      body.resolution = payload.resolution ? payload.resolution.trim() : null;
    }

    const response = await apiClient.put(API_ENDPOINTS.COMPLAINTS.BY_ID(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Assigns a complaint to an active staff member (Admin & Manager).
   *
   * @param {number|string} id
   * @param {number|string} assignedToId
   * @returns {Promise<object>} ComplaintResponse
   */
  async assignComplaint(id, assignedToId) {
    const body = { assignedToId: Number(assignedToId) };
    const response = await apiClient.patch(API_ENDPOINTS.COMPLAINTS.ASSIGN(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Updates a complaint's status directly (Admin & Manager).
   *
   * @param {number|string} id
   * @param {'OPEN'|'IN_PROGRESS'|'RESOLVED'|'CLOSED'|'REJECTED'} status
   * @returns {Promise<object>} ComplaintResponse
   */
  async updateComplaintStatus(id, status) {
    const body = { status };
    const response = await apiClient.patch(API_ENDPOINTS.COMPLAINTS.STATUS_UPDATE(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Marks a complaint as resolved with an explanatory resolution text (Admin & Manager).
   *
   * @param {number|string} id
   * @param {string} resolution
   * @returns {Promise<object>} ComplaintResponse
   */
  async resolveComplaint(id, resolution) {
    const body = { resolution: resolution.trim() };
    const response = await apiClient.patch(API_ENDPOINTS.COMPLAINTS.RESOLVE(id), body);
    return response.data?.data || response.data;
  },
};

export default complaintService;

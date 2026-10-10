import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Task Management operations.
 * Communicates with Spring Boot TaskController (/api/tasks).
 */
export const taskService = {
  /**
   * Retrieves tasks with optional filters.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE.
   * (Backend automatically scopes view based on user role and team).
   *
   * @param {{
   *   status?: 'TODO'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED',
   *   priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT',
   *   assignedToId?: number|string,
   *   search?: string,
   *   deadlineBefore?: string
   * }} [filters]
   * @returns {Promise<Array<object>>} List of TaskResponse objects
   */
  async getTasks(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.assignedToId) params.assignedToId = filters.assignedToId;
    if (filters.search && filters.search.trim()) params.search = filters.search.trim();
    if (filters.deadlineBefore) params.deadlineBefore = filters.deadlineBefore;

    const response = await apiClient.get(API_ENDPOINTS.TASKS.BASE, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves tasks assigned specifically to the authenticated employee.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE.
   *
   * @param {{
   *   status?: 'TODO'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED',
   *   priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT'
   * }} [filters]
   * @returns {Promise<Array<object>>} List of TaskResponse objects
   */
  async getMyTasks(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;

    const response = await apiClient.get(API_ENDPOINTS.TASKS.MY, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves a single task by its ID.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE (assigned assignee).
   *
   * @param {number|string} id
   * @returns {Promise<object>} TaskResponse
   */
  async getTaskById(id) {
    const response = await apiClient.get(API_ENDPOINTS.TASKS.BY_ID(id));
    return response.data?.data || response.data;
  },

  /**
   * Creates a new task.
   * Accessible by ADMIN and MANAGER.
   *
   * @param {{
   *   title: string,
   *   description?: string,
   *   assignedToId: number|string,
   *   assignedById?: number|string,
   *   priority: 'LOW'|'MEDIUM'|'HIGH'|'URGENT',
   *   deadline?: string,
   *   status?: 'TODO'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'
   * }} payload
   * @returns {Promise<object>} TaskResponse
   */
  async createTask(payload) {
    const body = {
      title: payload.title.trim(),
      description: payload.description ? payload.description.trim() : '',
      assignedToId: Number(payload.assignedToId),
      priority: payload.priority || 'MEDIUM',
      status: payload.status || 'TODO',
    };
    if (payload.assignedById) {
      body.assignedById = Number(payload.assignedById);
    }
    if (payload.deadline) {
      body.deadline = payload.deadline;
    }

    const response = await apiClient.post(API_ENDPOINTS.TASKS.BASE, body);
    return response.data?.data || response.data;
  },

  /**
   * Updates an existing task's details.
   * Accessible by ADMIN and MANAGER.
   *
   * @param {number|string} id
   * @param {{
   *   title?: string,
   *   description?: string,
   *   assignedToId?: number|string,
   *   priority?: 'LOW'|'MEDIUM'|'HIGH'|'URGENT',
   *   deadline?: string,
   *   status?: 'TODO'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'
   * }} payload
   * @returns {Promise<object>} TaskResponse
   */
  async updateTask(id, payload) {
    const body = {};
    if (payload.title !== undefined) body.title = payload.title.trim();
    if (payload.description !== undefined) body.description = payload.description.trim();
    if (payload.assignedToId !== undefined) body.assignedToId = Number(payload.assignedToId);
    if (payload.priority !== undefined) body.priority = payload.priority;
    if (payload.deadline !== undefined) body.deadline = payload.deadline;
    if (payload.status !== undefined) body.status = payload.status;

    const response = await apiClient.put(API_ENDPOINTS.TASKS.BY_ID(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Updates a task's status.
   * Accessible by ADMIN, MANAGER, and the assigned EMPLOYEE.
   *
   * @param {number|string} id
   * @param {'TODO'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED'} status
   * @returns {Promise<object>} TaskResponse
   */
  async updateTaskStatus(id, status) {
    const response = await apiClient.patch(API_ENDPOINTS.TASKS.STATUS_UPDATE(id), { status });
    return response.data?.data || response.data;
  },

  /**
   * Deletes a task by ID.
   * Accessible by ADMIN and MANAGER.
   *
   * @param {number|string} id
   * @returns {Promise<object>} ApiResponse
   */
  async deleteTask(id) {
    const response = await apiClient.delete(API_ENDPOINTS.TASKS.BY_ID(id));
    return response.data?.data || response.data;
  },
};

export default taskService;

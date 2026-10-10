import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Announcement Management operations.
 * Communicates with Spring Boot AnnouncementController (/api/announcements).
 */
export const announcementService = {
  /**
   * Retrieves all company announcements (Admin only).
   * Supports filtering by active state (published vs draft).
   *
   * @param {boolean} [active] - Optional active filter
   * @returns {Promise<Array<object>>} List of AnnouncementResponse objects
   */
  async listAnnouncements(active) {
    const params = {};
    if (typeof active === 'boolean') {
      params.active = active;
    }
    const response = await apiClient.get(API_ENDPOINTS.ANNOUNCEMENTS.BASE, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves live published & unexpired company announcements feed.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE.
   *
   * @returns {Promise<Array<object>>} List of AnnouncementResponse objects
   */
  async getPublishedAnnouncements() {
    const response = await apiClient.get(API_ENDPOINTS.ANNOUNCEMENTS.PUBLISHED);
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves a single announcement by ID.
   * Accessible by all authenticated users (non-admins must be active & unexpired).
   *
   * @param {number|string} id
   * @returns {Promise<object>} AnnouncementResponse
   */
  async getAnnouncementById(id) {
    const response = await apiClient.get(API_ENDPOINTS.ANNOUNCEMENTS.BY_ID(id));
    return response.data?.data || response.data;
  },

  /**
   * Creates and publishes a new announcement (Admin only).
   *
   * @param {{
   *   title: string,
   *   content: string,
   *   expiryDate?: string,
   *   active?: boolean
   * }} payload
   * @returns {Promise<object>} AnnouncementResponse
   */
  async createAnnouncement(payload) {
    const body = {
      title: payload.title.trim(),
      content: payload.content.trim(),
      active: payload.active !== undefined ? payload.active : true,
    };
    if (payload.expiryDate) {
      body.expiryDate = payload.expiryDate;
    }

    const response = await apiClient.post(API_ENDPOINTS.ANNOUNCEMENTS.BASE, body);
    return response.data?.data || response.data;
  },

  /**
   * Updates an existing announcement (Admin only).
   *
   * @param {number|string} id
   * @param {{
   *   title?: string,
   *   content?: string,
   *   expiryDate?: string,
   *   active?: boolean
   * }} payload
   * @returns {Promise<object>} AnnouncementResponse
   */
  async updateAnnouncement(id, payload) {
    const body = {};
    if (payload.title !== undefined) body.title = payload.title.trim();
    if (payload.content !== undefined) body.content = payload.content.trim();
    if (payload.expiryDate !== undefined) body.expiryDate = payload.expiryDate || null;
    if (payload.active !== undefined) body.active = payload.active;

    const response = await apiClient.put(API_ENDPOINTS.ANNOUNCEMENTS.BY_ID(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Toggles or updates the publication status of an announcement (Admin only).
   *
   * @param {number|string} id
   * @param {boolean} [active] - Optional explicit status
   * @returns {Promise<object>} AnnouncementResponse
   */
  async togglePublish(id, active) {
    const body = typeof active === 'boolean' ? { active } : {};
    const response = await apiClient.patch(API_ENDPOINTS.ANNOUNCEMENTS.PUBLISH(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Deletes an announcement permanently (Admin only).
   *
   * @param {number|string} id
   * @returns {Promise<object>} ApiResponse
   */
  async deleteAnnouncement(id) {
    const response = await apiClient.delete(API_ENDPOINTS.ANNOUNCEMENTS.BY_ID(id));
    return response.data?.data || response.data;
  },
};

export default announcementService;

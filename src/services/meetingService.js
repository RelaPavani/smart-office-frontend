import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Service for Meeting Management operations.
 * Communicates with Spring Boot MeetingController (/api/meetings).
 */
export const meetingService = {
  /**
   * Retrieves all accessible meetings with optional filters.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE.
   *
   * @param {{
   *   status?: 'SCHEDULED'|'ONGOING'|'COMPLETED'|'CANCELLED',
   *   organizerId?: number|string,
   *   from?: string,
   *   to?: string
   * }} [filters]
   * @returns {Promise<Array<object>>} List of MeetingResponse objects
   */
  async getMeetings(filters = {}) {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.organizerId) params.organizerId = filters.organizerId;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;

    const response = await apiClient.get(API_ENDPOINTS.MEETINGS.BASE, { params });
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves meetings where current employee is participant or organizer.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE.
   *
   * @returns {Promise<Array<object>>} List of MeetingResponse objects
   */
  async getMyMeetings() {
    const response = await apiClient.get(API_ENDPOINTS.MEETINGS.MY);
    return response.data?.data || response.data || [];
  },

  /**
   * Retrieves a single meeting by ID.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE (if authorized to view).
   *
   * @param {number|string} id
   * @returns {Promise<object>} MeetingResponse
   */
  async getMeetingById(id) {
    const response = await apiClient.get(API_ENDPOINTS.MEETINGS.BY_ID(id));
    return response.data?.data || response.data;
  },

  /**
   * Schedules a new meeting.
   * Accessible by ADMIN and MANAGER.
   *
   * @param {{
   *   title: string,
   *   startDateTime: string,
   *   endDateTime: string,
   *   agenda?: string,
   *   organizerId: number|string,
   *   status?: 'SCHEDULED'|'ONGOING'|'COMPLETED'|'CANCELLED'
   * }} payload
   * @returns {Promise<object>} MeetingResponse
   */
  async createMeeting(payload) {
    const body = {
      title: payload.title.trim(),
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      agenda: payload.agenda ? payload.agenda.trim() : '',
      organizerId: Number(payload.organizerId),
      status: payload.status || 'SCHEDULED',
    };

    const response = await apiClient.post(API_ENDPOINTS.MEETINGS.BASE, body);
    return response.data?.data || response.data;
  },

  /**
   * Updates meeting details.
   * Accessible by ADMIN and MANAGER (organizer/manager scope).
   *
   * @param {number|string} id
   * @param {{
   *   title?: string,
   *   startDateTime?: string,
   *   endDateTime?: string,
   *   agenda?: string,
   *   status?: 'SCHEDULED'|'ONGOING'|'COMPLETED'|'CANCELLED'
   * }} payload
   * @returns {Promise<object>} MeetingResponse
   */
  async updateMeeting(id, payload) {
    const body = {};
    if (payload.title !== undefined) body.title = payload.title.trim();
    if (payload.startDateTime !== undefined) body.startDateTime = payload.startDateTime;
    if (payload.endDateTime !== undefined) body.endDateTime = payload.endDateTime;
    if (payload.agenda !== undefined) body.agenda = payload.agenda.trim();
    if (payload.status !== undefined) body.status = payload.status;

    const response = await apiClient.put(API_ENDPOINTS.MEETINGS.BY_ID(id), body);
    return response.data?.data || response.data;
  },

  /**
   * Updates meeting status (e.g. CANCELLED, ONGOING, COMPLETED).
   * Accessible by ADMIN and MANAGER.
   *
   * @param {number|string} id
   * @param {'SCHEDULED'|'ONGOING'|'COMPLETED'|'CANCELLED'} status
   * @returns {Promise<object>} MeetingResponse
   */
  async updateMeetingStatus(id, status) {
    const response = await apiClient.patch(API_ENDPOINTS.MEETINGS.STATUS_UPDATE(id), { status });
    return response.data?.data || response.data;
  },

  /**
   * Retrieves participant roster for a meeting.
   * Accessible by ADMIN, MANAGER, and EMPLOYEE.
   *
   * @param {number|string} meetingId
   * @returns {Promise<Array<object>>} List of MeetingParticipantResponse objects
   */
  async getMeetingParticipants(meetingId) {
    const response = await apiClient.get(API_ENDPOINTS.MEETINGS.PARTICIPANTS(meetingId));
    return response.data?.data || response.data || [];
  },

  /**
   * Adds an employee as a participant to a meeting.
   * Accessible by ADMIN and MANAGER.
   *
   * @param {number|string} meetingId
   * @param {number|string} employeeId
   * @param {'INVITED'|'ACCEPTED'|'DECLINED'|'ATTENDED'} [attendanceStatus='INVITED']
   * @returns {Promise<object>} MeetingParticipantResponse
   */
  async addParticipant(meetingId, employeeId, attendanceStatus = 'INVITED') {
    const body = {
      meetingId: Number(meetingId),
      employeeId: Number(employeeId),
      attendanceStatus,
    };
    const response = await apiClient.post(API_ENDPOINTS.MEETINGS.PARTICIPANTS(meetingId), body);
    return response.data?.data || response.data;
  },

  /**
   * Removes an invited participant from a meeting.
   * Accessible by ADMIN and MANAGER.
   *
   * @param {number|string} meetingId
   * @param {number|string} employeeId
   * @returns {Promise<object>} ApiResponse
   */
  async removeParticipant(meetingId, employeeId) {
    const response = await apiClient.delete(API_ENDPOINTS.MEETINGS.PARTICIPANT_BY_ID(meetingId, employeeId));
    return response.data?.data || response.data;
  },

  /**
   * Updates a participant's attendance status (e.g., ACCEPTED, DECLINED, ATTENDED).
   * Accessible by self employee, meeting organizer, or ADMIN.
   *
   * @param {number|string} meetingId
   * @param {number|string} employeeId
   * @param {'INVITED'|'ACCEPTED'|'DECLINED'|'ATTENDED'} attendanceStatus
   * @returns {Promise<object>} MeetingParticipantResponse
   */
  async updateParticipantStatus(meetingId, employeeId, attendanceStatus) {
    const body = { attendanceStatus };
    const response = await apiClient.patch(
      API_ENDPOINTS.MEETINGS.PARTICIPANT_STATUS(meetingId, employeeId),
      body
    );
    return response.data?.data || response.data;
  },
};

export default meetingService;

import { apiClient } from './api';
import { API_ENDPOINTS } from './endpoints';

/**
 * Normalizes backend role representation
 * Spring Security uses ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE
 * @param {string} role
 * @returns {string}
 */
export function normalizeRole(role) {
  if (!role) return 'EMPLOYEE';
  return role.startsWith('ROLE_') ? role.substring(5) : role;
}

/**
 * Extracts a user-friendly error message from Axios errors
 * @param {any} error
 * @returns {string}
 */
export function getAuthErrorMessage(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Authentication request timed out. Please check your network and server status.';
    }
    return 'Unable to reach the Smart Office backend server. Ensure the Spring Boot service is running on port 8080.';
  }

  const { status, data } = error.response;

  // Spring validation errors (MethodArgumentNotValidException)
  if (status === 400 && data?.validationErrors) {
    const errorList = Object.values(data.validationErrors);
    if (errorList.length > 0) {
      return errorList.join('. ');
    }
  }

  // 401 Unauthorized (Bad credentials / disabled account)
  if (status === 401) {
    return data?.message || 'Invalid username or password. Please verify your credentials.';
  }

  // 403 Forbidden
  if (status === 403) {
    return data?.message || 'Access denied: You do not have permission to access this resource.';
  }

  // 500+ Server error
  if (status >= 500) {
    return data?.message || 'A server error occurred. Please contact your system administrator or try again later.';
  }

  return data?.message || 'An unexpected error occurred during authentication. Please try again.';
}

export const authService = {
  /**
   * Performs login request to Spring Boot backend
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{ token: string, tokenType: string, expiresIn: number, username: string, role: string }>}
   */
  async login(username, password) {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      username: username.trim(),
      password: password,
    });
    return response.data;
  },

  /**
   * Fetches the current authenticated user's profile from /api/auth/me
   * @returns {Promise<{ id: number, username: string, email: string, role: string, enabled: boolean }>}
   */
  async getCurrentUser() {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
    // Backend wraps response in ApiResponse<Map<String, Object>>
    return response.data?.data || response.data;
  },
};

export default authService;

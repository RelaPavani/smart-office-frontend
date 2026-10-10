import axios from 'axios';
import { authStorage } from '../utils/authStorage';

/**
 * Backend base URL resolved from Vite environment variables.
 * Configured to default to Spring Boot root: http://localhost:8080
 */
const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');

/**
 * Reusable Axios client instance configured for the Smart Office backend.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor: Attach JWT Bearer Token to outgoing requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      // Safe development logging without exposing payload secrets
      console.debug(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Handle status codes and authentication invalidation
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    // HTTP 401: Unauthorized session
    if (status === 401) {
      // Do not trigger global logout if the 401 came from the login endpoint itself
      const isLoginRequest = url.includes('/auth/login');

      if (!isLoginRequest && !originalRequest?._retry) {
        originalRequest._retry = true;
        authStorage.clearAuth();

        // Dispatch a custom window event for the AuthContext to synchronize state
        // without forcing an unmanaged full-page reload or redirect loop
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('smartoffice:unauthorized', {
            detail: { url, message: error.response?.data?.message || 'Session expired' }
          }));
        }
      }
    }

    // HTTP 403: Forbidden - User lacks role permissions
    // Note: Do NOT clear auth or logout on 403. The session is valid, but the user is not authorized for the specific endpoint.
    if (status === 403 && import.meta.env.DEV) {
      console.warn(`[Access Denied: 403] Insufficient permissions for ${url}`);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * Smart Office Auth Storage Utility
 *
 * Security Considerations:
 * -------------------------------------------------------------
 * 1. The backend uses stateless JWT Bearer token authentication via HTTP headers.
 * 2. In browser environments without backend-issued HttpOnly session cookies,
 *    tokens must be held in client storage (localStorage or sessionStorage).
 * 3. Trade-offs:
 *    - localStorage: Persists across browser restarts (used when "Remember Me" is enabled).
 *      Accessible to JavaScript, making it susceptible to XSS if untrusted scripts run.
 *    - sessionStorage: Scoped to the current browser tab and destroyed on tab close.
 *      More secure against persistent token theft, but ends when the tab is closed.
 * 4. To minimize attack surface:
 *    - Never log tokens or user credentials to console.
 *    - Store only the minimum required claims (token, username, role).
 *    - Sanitize all user-rendered content to prevent XSS.
 */

const TOKEN_KEY = 'smart_office_jwt_token';
const USER_KEY = 'smart_office_auth_user';
const REMEMBER_KEY = 'smart_office_remember_me';

export const authStorage = {
  /**
   * Retrieves the token from localStorage or sessionStorage
   * @returns {string|null}
   */
  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  },

  /**
   * Stores the JWT token based on the rememberMe preference
   * @param {string} token
   * @param {boolean} rememberMe
   */
  setToken(token, rememberMe = false) {
    if (!token) return;
    try {
      if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(REMEMBER_KEY, 'true');
        sessionStorage.removeItem(TOKEN_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (err) {
      console.warn('Storage access warning:', err.message);
    }
  },

  /**
   * Retrieves the cached user object
   * @returns {object|null}
   */
  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Stores minimal user details in sync with the token storage choice
   * @param {object} user
   * @param {boolean} rememberMe
   */
  setUser(user, rememberMe = false) {
    if (!user) return;
    try {
      const serialized = JSON.stringify(user);
      if (rememberMe || localStorage.getItem(REMEMBER_KEY) === 'true') {
        localStorage.setItem(USER_KEY, serialized);
        sessionStorage.removeItem(USER_KEY);
      } else {
        sessionStorage.setItem(USER_KEY, serialized);
        localStorage.removeItem(USER_KEY);
      }
    } catch (err) {
      console.warn('Storage access warning:', err.message);
    }
  },

  /**
   * Clears all authentication tokens and cached user data from both storages
   */
  clearAuth() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch (err) {
      console.warn('Storage cleanup warning:', err.message);
    }
  },

  /**
   * Checks if "Remember Me" was previously enabled
   * @returns {boolean}
   */
  isRemembered() {
    try {
      return localStorage.getItem(REMEMBER_KEY) === 'true';
    } catch {
      return false;
    }
  },
};

export default authStorage;

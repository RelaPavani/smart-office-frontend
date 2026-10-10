import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authStorage } from '../utils/authStorage';
import { authService, normalizeRole, getAuthErrorMessage } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authStorage.getToken());
  const [user, setUser] = useState(() => authStorage.getUser());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initializes session on application startup or page refresh
   */
  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      const storedToken = authStorage.getToken();

      if (!storedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        // Validate token against backend /api/auth/me
        const profile = await authService.getCurrentUser();
        if (isMounted) {
          const normalized = {
            ...profile,
            role: normalizeRole(profile?.role),
          };
          setUser(normalized);
          setToken(storedToken);
          authStorage.setUser(normalized, authStorage.isRemembered());
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          // Token is invalid, expired, or rejected
          console.warn('[Session Init] Stored token rejected or expired, clearing session.');
          authStorage.clearAuth();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeSession();

    // Listen for unauthorized 401 events dispatched by Axios interceptor
    const handleUnauthorizedEvent = () => {
      if (isMounted) {
        authStorage.clearAuth();
        setUser(null);
        setToken(null);
      }
    };

    window.addEventListener('smartoffice:unauthorized', handleUnauthorizedEvent);

    return () => {
      isMounted = false;
      window.removeEventListener('smartoffice:unauthorized', handleUnauthorizedEvent);
    };
  }, []);

  /**
   * Performs user login
   */
  const login = useCallback(async (username, password, rememberMe = false) => {
    setError(null);

    try {
      const data = await authService.login(username, password);

      // Validate response integrity
      if (!data || !data.token || typeof data.token !== 'string') {
        throw new Error('Authentication response was invalid: missing JWT token.');
      }

      const receivedToken = data.token;
      const initialUser = {
        username: data.username || username.trim(),
        role: normalizeRole(data.role),
      };

      // Store credentials using chosen storage strategy
      authStorage.setToken(receivedToken, rememberMe);
      authStorage.setUser(initialUser, rememberMe);

      setToken(receivedToken);
      setUser(initialUser);

      // Opportunistically fetch full profile details (id, email, enabled)
      try {
        const fullProfile = await authService.getCurrentUser();
        if (fullProfile) {
          const enrichedUser = {
            ...fullProfile,
            role: normalizeRole(fullProfile.role || data.role),
          };
          setUser(enrichedUser);
          authStorage.setUser(enrichedUser, rememberMe);
        }
      } catch (profileErr) {
        // Non-blocking: initialUser is already valid for navigation
        console.debug('Profile enrichment deferred:', profileErr.message);
      }

      return { success: true };
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  /**
   * Performs user logout
   */
  const logout = useCallback(() => {
    authStorage.clearAuth();
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  /**
   * Role evaluation helpers
   */
  const role = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const isAdmin = useMemo(() => role === 'ADMIN', [role]);
  const isManager = useMemo(() => role === 'MANAGER', [role]);
  const isEmployee = useMemo(() => role === 'EMPLOYEE', [role]);

  const hasRole = useCallback((requiredRoles) => {
    if (!requiredRoles) return true;
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const normalizedTargets = rolesArray.map(normalizeRole);
    return normalizedTargets.includes(role);
  }, [role]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      error,
      login,
      logout,
      role,
      isAdmin,
      isManager,
      isEmployee,
      hasRole,
    }),
    [user, token, isLoading, error, login, logout, role, isAdmin, isManager, isEmployee, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;

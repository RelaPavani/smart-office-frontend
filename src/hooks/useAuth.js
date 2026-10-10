import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to access authentication context
 * @returns {{
 *   user: object|null,
 *   token: string|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   error: string|null,
 *   login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean }>,
 *   logout: () => void,
 *   role: string,
 *   isAdmin: boolean,
 *   isManager: boolean,
 *   isEmployee: boolean,
 *   hasRole: (requiredRoles: string|string[]) => boolean
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;

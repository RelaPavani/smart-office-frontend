import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingState } from './LoadingState';

/**
 * Route wrapper for public-only pages like /login.
 * Redirects already authenticated users to the intended destination or /
 */
export function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState
          message="Checking authentication status..."
          fullHeight
        />
      </div>
    );
  }

  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || '/';
    return <Navigate to={destination} replace />;
  }

  return children ? children : <Outlet />;
}

export default PublicRoute;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAccess } from '../providers/AccessProvider';
import { canAccessRoute, resolveHomeRoute } from '@date-to-go/access-policy';

import { SplashScreen } from './SplashScreen';

export const RequireAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { access, isLoading } = useAccess();
  const location = useLocation();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!access) {
    // Unauthenticated -> redirect to login, preserving intent
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAllowed = canAccessRoute(location.pathname, access);
  
  if (!isAllowed) {
    const home = resolveHomeRoute(access);
    if (home === location.pathname) {
      // Prevent infinite redirect loop if policy maps back to current route
      return <>{children}</>;
    }
    // You could also trigger a toast here using a Toast context if needed
    console.warn(`Access denied to ${location.pathname}. Redirecting to ${home}`);
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

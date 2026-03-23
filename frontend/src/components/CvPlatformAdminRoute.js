import React from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredUser, isCvPlatformStaffUser } from '../utils/auth';

/**
 * Allows planner users with role Admin or platform_admin (CV site moderation lives in this SPA).
 */
const CvPlatformAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  try {
    const user = getStoredUser();
    if (!user || !isCvPlatformStaffUser(user)) {
      return <Navigate to="/daily" replace />;
    }
  } catch {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default CvPlatformAdminRoute;

import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute - Redirects to home if user is not authenticated
 * 
 * Note: This checks the token synchronously. Tokens are only cleared
 * on actual 401 authentication failures, not on API errors or redirects.
 */
const ProtectedRoute = ({ children }) => {
  // Check for token synchronously - this happens before any API calls
  const token = localStorage.getItem('token');
  
  // If no token, redirect to home
  if (!token) {
    return <Navigate to="/" replace />;
  }
  
  // Token exists, allow access
  // API failures will not clear tokens unless it's a real 401 response
  return children;
};

export default ProtectedRoute;


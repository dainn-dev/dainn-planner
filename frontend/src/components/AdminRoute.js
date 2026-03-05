import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * AdminRoute - Redirects to /daily if user is not an Admin
 */
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  
  // If not logged in, redirect to home
  if (!token) {
    return <Navigate to="/" replace />;
  }
  
  // Check user role
  try {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    // If user role is not Admin, redirect to /daily
    if (!user || user.role !== 'Admin') {
      return <Navigate to="/daily" replace />;
    }
  } catch (error) {
    // If error parsing user, redirect to home
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default AdminRoute;


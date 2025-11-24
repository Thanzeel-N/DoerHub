import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isAdmin, isUser , isProvider } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'admin' && !isAdmin()) {
    return <Navigate to="/" replace />;
  }
  if (requiredRole === 'user' && !isUser ()) {
    return <Navigate to="/" replace />;
  }
  if (requiredRole === 'provider' && !isProvider()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-dark" aria-label="Cargando..."></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirige al login guardando la ruta previa
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.rol !== requiredRole) {
    // Si no tiene el rol adecuado, redirige a su página correspondiente
    const targetRoute = user?.rol === 'profesional' ? '/profesional/dashboard' : '/';
    return <Navigate to={targetRoute} replace />;
  }

  return children;
}


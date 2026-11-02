import React, { createContext, useContext, useState, useMemo } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('salud_directa_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('salud_directa_token') || null;
  });

  const [isLoading, setIsLoading] = useState(false);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('salud_directa_user', JSON.stringify(userData));
    localStorage.setItem('salud_directa_token', jwtToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('salud_directa_user');
    localStorage.removeItem('salud_directa_token');
  };

  const isProfessional = user?.rol === 'profesional';
  const isPatient = user?.rol === 'paciente';
  const isAuthenticated = Boolean(token && user);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      setIsLoading,
      login,
      logout,
      isAuthenticated,
      isProfessional,
      isPatient,
    }),
    [user, token, isLoading, isAuthenticated, isProfessional, isPatient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  saveToken,
  getToken,
  deleteToken,
  getJsonItem,
  setJsonItem,
  removeItem,
} from '../utils/storage';
import { setUnauthorizedHandler } from '../api/apiClient';

const USER_KEY = 'salud_directa_user';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await deleteToken();
    await removeItem(USER_KEY);
  }, []);

  const login = useCallback(async (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    await setJsonItem(USER_KEY, userData);
    await saveToken(jwtToken);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setUnauthorizedHandler(() => {
      if (isMounted) {
        setUser(null);
        setToken(null);
      }
    });

    Promise.all([getToken(), getJsonItem(USER_KEY, null)])
      .then(([savedToken, savedUser]) => {
        if (isMounted && savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  }
  return context;
}

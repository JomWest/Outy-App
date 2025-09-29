import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [initialized, setInitialized] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('auth_token');
        const u = await AsyncStorage.getItem('auth_user');
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
        }
      } finally {
        setInitialized(true);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    const t = data.token;
    const u = data.user;
    setToken(t);
    setUser(u);
    await AsyncStorage.setItem('auth_token', t);
    await AsyncStorage.setItem('auth_user', JSON.stringify(u));
    return { token: t, user: u };
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
  };

  const value = useMemo(() => ({ initialized, token, user, isAuthenticated: !!token, login, logout }), [initialized, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
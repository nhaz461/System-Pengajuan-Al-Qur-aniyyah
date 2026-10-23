import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const defaultBendaharaUser: User = {
  id: 2,
  email: 'keuangan@alquraniyyah.sch.id',
  name: 'Nasrullah, S.Pd',
  role: 'KEUANGAN',
  unit: null,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(defaultBendaharaUser);
  const [token, setToken] = useState<string | null>('auto-authenticated-bendahara-token');
  const [isLoading, setIsLoading] = useState(false);

  // Load dari localStorage saat init jika ada custom user, jika tidak tetap default Bendahara
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(defaultBendaharaUser);
        setToken('auto-authenticated-bendahara-token');
      }
    } else {
      setUser(defaultBendaharaUser);
      setToken('auto-authenticated-bendahara-token');
      localStorage.setItem('auth_token', 'auto-authenticated-bendahara-token');
      localStorage.setItem('auth_user', JSON.stringify(defaultBendaharaUser));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    if (response.success && response.data) {
      const { token: newToken, user: newUser } = response.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    authService.logout();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem('auth_user', JSON.stringify(response.data));
      }
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
};

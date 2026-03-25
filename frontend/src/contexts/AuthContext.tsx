import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface User {
  id: number;
  nom: string;
  prenom?: string;
  email: string;
  role?: string;
  avatar_url?: string;
  telephone?: string;
  date_naissance?: string;
  sexe?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { nom: string; prenom?: string; email: string; password: string; password_confirmation: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('unguealhealth_token');
    const savedUser = localStorage.getItem('unguealhealth_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    const { token, user: u } = res.data || res;
    localStorage.setItem('unguealhealth_token', token);
    localStorage.setItem('unguealhealth_user', JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback(async (data: any) => {
    await api.register(data);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem('unguealhealth_token');
    localStorage.removeItem('unguealhealth_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem('unguealhealth_user', JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

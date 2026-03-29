import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export type UserRole = 'user' | 'student' | 'professional' | 'admin';

export interface User {
  id: number;
  nom: string;
  prenom?: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  telephone?: string;
  date_naissance?: string;
  sexe?: string;
  specialite?: string;
  etablissement?: string;
  numero_ordre?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { nom: string; prenom?: string; email: string; password: string; password_confirmation: string; role?: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  isAdmin: boolean;
  isProfessional: boolean;
  isStudent: boolean;
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
        const parsedUser = JSON.parse(savedUser);
        // Ensure role exists, default to 'user'
        if (!parsedUser.role) parsedUser.role = 'user';
        setUser(parsedUser);
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    const { token, user: u } = res.data || res;
    // Ensure role exists
    if (!u.role) u.role = 'user';
    localStorage.setItem('unguealhealth_token', token);
    localStorage.setItem('unguealhealth_user', JSON.stringify(u));
    setUser(u);
  }, []);

  const register = useCallback(async (data: { nom: string; prenom?: string; email: string; password: string; password_confirmation: string; role?: UserRole }) => {
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

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  const isAdmin = user?.role === 'admin';
  const isProfessional = user?.role === 'professional' || user?.role === 'admin';
  const isStudent = user?.role === 'student' || isProfessional;

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      register, 
      logout, 
      updateUser,
      hasRole,
      isAdmin,
      isProfessional,
      isStudent
    }}>
      {children}
    </AuthContext.Provider>
  );
};

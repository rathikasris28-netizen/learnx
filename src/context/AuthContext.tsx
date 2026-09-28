import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { apiRequest } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (formData: any, role: 'LEARNER' | 'MENTOR') => Promise<{ user_id: string; email_confirmed: boolean; role: string; welcome_bonus: number; balance: number; authenticated: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  verifyEmail: (userId?: string, email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('learnx_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const storedId = localStorage.getItem('learnx_user_id');
    const storedToken = localStorage.getItem('learnx_token');
    if (!storedId || !storedToken || storedToken.startsWith('local_session_')) {
      localStorage.removeItem('learnx_user_id');
      localStorage.removeItem('learnx_token');
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest('/auth/me');
      if (data?.user) {
        setUser(data.user);
      }
    } catch {
      // session expired or invalid
      localStorage.removeItem('learnx_user_id');
      localStorage.removeItem('learnx_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    // Listen to real-time server events for multi-device synchronization
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('session_created', () => refreshUser());
    eventSource.addEventListener('session_updated', () => refreshUser());
    eventSource.addEventListener('session_completed', () => refreshUser());
    eventSource.addEventListener('availability_updated', () => refreshUser());

    // Polling interval as backup
    const interval = setInterval(() => {
      const storedId = localStorage.getItem('learnx_user_id');
      if (storedId) {
        apiRequest('/sync/events').catch(() => {});
      }
    }, 15000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.user && typeof data.token === 'string' && data.token && !data.token.startsWith('local_session_')) {
      localStorage.setItem('learnx_user_id', data.user.id || data.user.user_id);
      localStorage.setItem('learnx_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } else {
      throw new Error('Authentication service did not return a valid access token.');
    }
  };

  const register = async (formData: any, role: 'LEARNER' | 'MENTOR') => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { ...formData, role }
    });
    if (!data.user) {
      throw new Error('Registration succeeded without returning the created account profile.');
    }
    const authenticated = typeof data.token === 'string' && data.token.length > 0 && !data.token.startsWith('local_session_');
    if (authenticated) {
      localStorage.setItem('learnx_user_id', data.user.id || data.user.user_id);
      localStorage.setItem('learnx_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } else {
      localStorage.removeItem('learnx_user_id');
      localStorage.removeItem('learnx_token');
      setToken(null);
      setUser(null);
    }
    return {
      user_id: data.user_id,
      email_confirmed: data.email_confirmed,
      role: data.role,
      welcome_bonus: data.welcome_bonus || 0,
      balance: data.user.wallet_balance ?? 0,
      authenticated
    };
  };

  const verifyEmail = async (userId?: string, email?: string) => {
    await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, email })
    });
    await refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('learnx_user_id');
    localStorage.removeItem('learnx_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, verifyEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

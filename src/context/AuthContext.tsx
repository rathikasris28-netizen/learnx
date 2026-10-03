
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { UserProfile } from '../types';
import { apiRequest } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    formData: any,
    role: 'LEARNER' | 'MENTOR'
  ) => Promise<{
    user_id: string;
    email_confirmed: boolean;
    role: string;
    welcome_bonus: number;
    balance: number;
  }>;

  logout: () => void;

  refreshUser: () => Promise<void>;
  updateUser: (user: UserProfile) => void;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [token, setToken] =
    useState<string | null>(
      localStorage.getItem('learnx_token')
    );

  const [loading, setLoading] =
    useState<boolean>(true);

  /**
   * Refresh the currently authenticated LearnX user.
   */
  const refreshUser = useCallback(async () => {
    const storedToken =
      localStorage.getItem('learnx_token');

    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/auth/me');

      if (!data?.user) {
        throw new Error(
          'Invalid authentication response.'
        );
      }

      setUser(data.user);
      setToken(storedToken);
    } catch {
      localStorage.removeItem('learnx_user_id');
      localStorage.removeItem('learnx_token');

      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Authentication initialization.
   */
  useEffect(() => {
    const storedToken =
      localStorage.getItem('learnx_token');

    if (storedToken) {
      void refreshUser();
    } else {
      setUser(null);
      setToken(null);
      setLoading(false);
    }
  }, [refreshUser]);

  /**
   * Real-time synchronization.
   */
  useEffect(() => {
    if (!user || !token) {
      return;
    }

    const eventSource = new EventSource(
      '/api/events'
    );

    eventSource.addEventListener(
      'session_created',
      () => {
        void refreshUser();
      }
    );

    eventSource.addEventListener(
      'session_updated',
      () => {
        void refreshUser();
      }
    );

    eventSource.addEventListener(
      'session_completed',
      () => {
        void refreshUser();
      }
    );

    eventSource.addEventListener(
      'availability_updated',
      () => {
        void refreshUser();
      }
    );

    const interval = setInterval(() => {
      const currentToken =
        localStorage.getItem('learnx_token');

      if (currentToken) {
        void apiRequest(
          '/sync/events'
        ).catch(() => {});
      }
    }, 15000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [user, token, refreshUser]);

  /**
   * Login.
   *
   * The backend authenticates the user using
   * Supabase email/password authentication.
   *
   * LearnX does not block login based on
   * email verification status.
   */
  const login = async (
    email: string,
    password: string
  ): Promise<void> => {
    const data = await apiRequest(
      '/auth/login',
      {
        method: 'POST',
        body: {
          email,
          password,
        },
      }
    );

    const accessToken =
      data?.session?.access_token;

    if (
      !data?.user ||
      typeof accessToken !== 'string' ||
      accessToken.length === 0
    ) {
      throw new Error(
        'Authentication service did not return a valid access token.'
      );
    }

    const userId =
      data.user.id ||
      data.user.user_id;

    if (!userId) {
      throw new Error(
        'Authentication service did not return a valid user ID.'
      );
    }

    localStorage.setItem(
      'learnx_user_id',
      userId
    );

    localStorage.setItem(
      'learnx_token',
      accessToken
    );

    setToken(accessToken);
    setUser(data.user);
    setLoading(false);
  };

  /**
   * Registration.
   *
   * Frontend:
   *   LEARNER
   *   MENTOR
   *
   * Backend:
   *   LEARNER
   *   KNOWLEDGE_SHARER
   */
  const register = async (
    formData: any,
    role: 'LEARNER' | 'MENTOR'
  ) => {
    const backendRole =
      role === 'MENTOR'
        ? 'KNOWLEDGE_SHARER'
        : 'LEARNER';

    const data = await apiRequest(
      '/auth/register',
      {
        method: 'POST',
        body: {
          ...formData,
          role: backendRole,
        },
      }
    );

    if (!data?.user?.id) {
      throw new Error(
        'Registration succeeded without returning the created account.'
      );
    }

    /**
     * Log the newly registered user in once.
     */
    await login(
      formData.email,
      formData.password
    );

    const registeredRole =
      data?.profile?.role ??
      backendRole;

    /**
     * LearnX Time Credit rule:
     *
     * LEARNER
     *   -> +5 Time Credits
     *
     * KNOWLEDGE_SHARER
     *   -> 0 Time Credits
     */
    const welcomeBonus =
      registeredRole === 'LEARNER'
        ? 5
        : 0;

    const balance =
      typeof data?.balance === 'number'
        ? data.balance
        : welcomeBonus;

    return {
      user_id: data.user.id,

      email_confirmed: true,

      role: registeredRole,

      welcome_bonus: welcomeBonus,

      balance,
    };
  };

  /**
   * Logout.
   */
  const logout = (): void => {
    localStorage.removeItem(
      'learnx_user_id'
    );

    localStorage.removeItem(
      'learnx_token'
    );

    setUser(null);
    setToken(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateUser: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    );
  }

  return context;
}

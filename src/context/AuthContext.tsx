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
    authenticated: boolean;
  }>;

  logout: () => void;

  refreshUser: () => Promise<void>;

  verifyEmail: (
    userId?: string,
    email?: string
  ) => Promise<void>;
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
   * Refresh authenticated user
   */
  const refreshUser = useCallback(async () => {
    const storedId =
      localStorage.getItem('learnx_user_id');

    const storedToken =
      localStorage.getItem('learnx_token');

    /*
     * IMPORTANT:
     * Public pages such as Register and Login
     * must NOT call /auth/me when there is
     * no authenticated session.
     */
    if (
      !storedId ||
      !storedToken ||
      storedToken.startsWith('local_session_')
    ) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/auth/me');

      if (data?.user) {
        setUser(data.user);
        setToken(storedToken);
      } else {
        throw new Error(
          'Invalid authentication response'
        );
      }
    } catch {
      localStorage.removeItem(
        'learnx_user_id'
      );

      localStorage.removeItem(
        'learnx_token'
      );

      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initial authentication check
   *
   * Only call /auth/me when a token exists.
   */
  useEffect(() => {
    const storedToken =
      localStorage.getItem('learnx_token');

    if (
      storedToken &&
      !storedToken.startsWith('local_session_')
    ) {
      refreshUser();
    } else {
      setUser(null);
      setToken(null);
      setLoading(false);
    }

    /*
     * Real-time server events
     */
    const eventSource = new EventSource(
      '/api/events'
    );

    eventSource.addEventListener(
      'session_created',
      () => {
        refreshUser();
      }
    );

    eventSource.addEventListener(
      'session_updated',
      () => {
        refreshUser();
      }
    );

    eventSource.addEventListener(
      'session_completed',
      () => {
        refreshUser();
      }
    );

    eventSource.addEventListener(
      'availability_updated',
      () => {
        refreshUser();
      }
    );

    /*
     * Polling backup
     */
    const interval = setInterval(() => {
      const currentUserId =
        localStorage.getItem(
          'learnx_user_id'
        );

      const currentToken =
        localStorage.getItem(
          'learnx_token'
        );

      if (
        currentUserId &&
        currentToken &&
        !currentToken.startsWith(
          'local_session_'
        )
      ) {
        apiRequest('/sync/events').catch(
          () => {}
        );
      }
    }, 15000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [refreshUser]);

  /**
   * Login
   */
  const login = async (
    email: string,
    password: string
  ): Promise<void> => {
    const data = await apiRequest(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    if (
      data?.user &&
      typeof data.token === 'string' &&
      data.token.length > 0 &&
      !data.token.startsWith(
        'local_session_'
      )
    ) {
      const userId =
        data.user.id ||
        data.user.user_id;

      localStorage.setItem(
        'learnx_user_id',
        userId
      );

      localStorage.setItem(
        'learnx_token',
        data.token
      );

      setToken(data.token);
      setUser(data.user);
    } else {
      throw new Error(
        'Authentication service did not return a valid access token.'
      );
    }
  };

  /**
   * Registration
   */
  const register = async (
    formData: any,
    role: 'LEARNER' | 'MENTOR'
  ) => {
    const data = await apiRequest(
      '/auth/register',
      {
        method: 'POST',
        body: {
          ...formData,
          role,
        },
      }
    );

    if (!data?.user) {
      throw new Error(
        'Registration succeeded without returning the created account profile.'
      );
    }

    const authenticated =
      typeof data.token === 'string' &&
      data.token.length > 0 &&
      !data.token.startsWith(
        'local_session_'
      );

    if (authenticated) {
      const userId =
        data.user.id ||
        data.user.user_id;

      localStorage.setItem(
        'learnx_user_id',
        userId
      );

      localStorage.setItem(
        'learnx_token',
        data.token
      );

      setToken(data.token);
      setUser(data.user);
    } else {
      /*
       * Registration succeeded but no
       * authenticated session was returned.
       */
      localStorage.removeItem(
        'learnx_user_id'
      );

      localStorage.removeItem(
        'learnx_token'
      );

      setToken(null);
      setUser(null);
    }

    return {
      user_id: data.user_id,
      email_confirmed:
        data.email_confirmed,
      role: data.role,
      welcome_bonus:
        data.welcome_bonus || 0,
      balance:
        data.user.wallet_balance ?? 0,
      authenticated,
    };
  };

  /**
   * Verify email
   */
  const verifyEmail = async (
    userId?: string,
    email?: string
  ): Promise<void> => {
    await apiRequest(
      '/auth/verify-email',
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          email,
        }),
      }
    );

    await refreshUser();
  };

  /**
   * Logout
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
        verifyEmail,
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

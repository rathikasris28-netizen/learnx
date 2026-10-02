
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
   *
   * The backend validates the Supabase access token
   * through /auth/me.
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
   * Authentication initialization.
   *
   * If a real Supabase access token exists,
   * validate it through the backend.
   *
   * Otherwise, the application starts as
   * an unauthenticated user.
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
   *
   * Refresh authenticated user information when
   * LearnX session-related events are received.
   *
   * A polling backup is also maintained.
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
        localStorage.getItem(
          'learnx_token'
        );

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
   * Backend:
   *   POST /auth/login
   *
   * Supabase:
   *   Authenticates the user's email/password.
   *
   * Email verification remains controlled by
   * the backend/Supabase authentication flow.
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

    /**
     * Store the real Supabase access token.
     */
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
   * Frontend roles:
   *   LEARNER
   *   MENTOR
   *
   * Backend roles:
   *   LEARNER
   *   KNOWLEDGE_SHARER
   *
   * MENTOR is therefore converted to
   * KNOWLEDGE_SHARER before being sent.
   */
   const register =async (
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

await login(
  formData.email,
  formData.password
);

    
    const registeredRole =
      data?.profile?.role ??
      backendRole;

    /**
     * LearnX welcome credit rule:
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
   * Verify email.
   *
   * The verification token is sent to the
   * backend, which completes the Supabase
   * email-verification process.
   *
   * userId and email remain in the signature
   * for compatibility with existing callers.
   */
  

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

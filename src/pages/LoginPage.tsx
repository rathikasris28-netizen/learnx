import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

export function LoginPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { login } = useAuth();

  const registrationComplete =
    new URLSearchParams(window.location.search).get(
      'registered'
    ) === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(
        err?.message ||
          'Failed to sign in. Please verify your email and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12 bg-[#0B0F14]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#4169E1] to-[#123A8C] text-white font-extrabold text-lg shadow-lg shadow-[#4169E1]/25 border border-[#4169E1]/40 mb-4">
            LX
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Space_Grotesk']">
            Welcome back to LearnX
          </h2>

          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Sign in to access your sessions, Time Wallet, and peer exchanges
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl shadow-black/60">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-[#2F3338] bg-[#0B0F14] text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/forgot-password')
                  }
                  className="text-[11px] text-[#4169E1] hover:text-blue-300 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-[#2F3338] bg-[#0B0F14] text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white text-xs font-semibold shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <span>
                {loading
                  ? 'Authenticating...'
                  : 'Sign In'}
              </span>

              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {registrationComplete && (
          <div
            role="status"
            className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 backdrop-blur-sm"
          >
            Your LearnX account was created. Please check your email, verify your account, and then sign in to continue.
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-[#4169E1] font-semibold hover:text-blue-300 hover:underline"
          >
            Register as a Learner & Sharer
          </button>
        </p>
      </div>
    </div>
  );
}
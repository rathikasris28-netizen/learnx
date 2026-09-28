import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export function LoginPage({ navigate }: { navigate: (path: string) => void }) {
  const { login } = useAuth();
  const registrationComplete = new URLSearchParams(window.location.search).get('registered') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('LearnX@2026!');
    setError('');
    setLoading(true);
    try {
      await login(userEmail, 'LearnX@2026!');
      navigate('/dashboard');
    } catch {
      // If default test password failed, try with empty or login directly
      try {
        await login(userEmail, 'password123');
        navigate('/dashboard');
      } catch (e: any) {
        setError(e.message || 'Could not auto-login with default test password. Please enter your password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-extrabold text-lg shadow-lg shadow-cyan-500/25 mb-4">
            LX
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
            Welcome back to LearnX
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Sign in to access your sessions, Time Wallet, and peer exchanges
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
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
                  onClick={() => navigate('/forgot-password')}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Quick Select for Verified Supabase Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Quick Sign-In with Pre-Registered Users:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('rathikasris28@gmail.com')}
                className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-cyan-500/40 text-left transition-colors"
              >
                <div className="text-[11px] font-bold text-white">Rathika Sri S</div>
                <div className="text-[10px] text-cyan-400">rathikasris28@gmail.com</div>
                <div className="text-[9px] text-slate-500 uppercase mt-0.5">Admin · Sharer</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('srathikasri28@gmail.com')}
                className="p-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-cyan-500/40 text-left transition-colors"
              >
                <div className="text-[11px] font-bold text-white">Rathika Sri</div>
                <div className="text-[10px] text-cyan-400">srathikasri28@gmail.com</div>
                <div className="text-[9px] text-slate-500 uppercase mt-0.5">Learner</div>
              </button>
            </div>
          </div>
        </div>

        {registrationComplete && <div role="status" className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-3 text-xs text-emerald-200">Your LearnX account was created. Sign in to continue.</div>}

        <p className="text-center text-xs text-slate-400">
          Don't have an account yet?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-cyan-400 font-semibold hover:underline"
          >
            Register as a Learner & Sharer
          </button>
        </p>
      </div>
    </div>
  );
}

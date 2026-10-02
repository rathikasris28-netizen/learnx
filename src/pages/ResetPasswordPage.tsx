import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');

    if (password.length < 8) {
      setError(
        'Password must be at least 8 characters.'
      );
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError(
        'Password must contain at least one uppercase letter.'
      );
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError(
        'Password must contain at least one lowercase letter.'
      );
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError(
        'Password must contain at least one number.'
      );
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError(
        'Password must contain at least one special character.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData.session) {
        throw new Error(
          'Your password reset link is invalid or has expired. Please request a new reset link.'
        );
      }

      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.message ||
          'Could not update your password. Please request a new reset link.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">
            Password Updated
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-slate-300">
            Your LearnX password has been successfully changed.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] px-4 py-3 text-xs font-semibold text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div className="rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123A8C]/25 border border-[#4169E1]/30">
              <Lock className="h-7 w-7 text-[#4169E1]" />
            </div>

            <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">
              Reset Your Password
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Create a new password for your LearnX account.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-rose-800/60 bg-rose-950/40 px-4 py-3 text-xs text-rose-300 backdrop-blur-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4.5"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                New Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] px-4 py-2.5 pr-12 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                Confirm Password
              </label>

              <div className="relative">
                <input
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] px-4 py-2.5 pr-12 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#2F3338] bg-[#0B0F14] px-4 py-3 text-xs text-slate-400">
              Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] px-4 py-3 text-xs font-semibold text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Updating Password...'
                : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

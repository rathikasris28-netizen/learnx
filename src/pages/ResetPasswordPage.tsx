
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

      /*
       * End the password-recovery session after the
       * password has been successfully changed.
       * The user can then sign in normally with the
       * new password.
       */
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Password Updated
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Your LearnX password has been successfully
            changed.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mb-6 flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
              <Lock className="h-7 w-7 text-blue-400" />
            </div>

            <h1 className="text-2xl font-bold text-white">
              Reset Your Password
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Create a new password for your LearnX
              account.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-800/50 px-4 py-3 text-xs text-slate-400">
              Password must contain at least 8
              characters, including uppercase, lowercase,
              number, and special character.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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


import React, { useState } from 'react';
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ForgotPasswordPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      /*
       * Password recovery is handled by Supabase Auth.
       *
       * Use the current application origin instead of
       * hard-coding the production Vercel URL. This allows
       * the same code to work in local and deployed builds.
       */
      const redirectTo =
        `${window.location.origin}/reset-password`;

      const {
        error: resetError,
      } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo,
        }
      );

      if (resetError) {
        throw resetError;
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(
        err?.message ||
          'Could not send password reset instructions.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Check Your Email
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            If an account exists with this email address,
            password reset instructions have been sent.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Check your inbox and spam folder for the
            password reset email.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
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
              <Mail className="h-7 w-7 text-blue-400" />
            </div>

            <h1 className="text-2xl font-bold text-white">
              Forgot Password?
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Enter your email address and we'll send you
              a password reset link.
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
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
                autoComplete="email"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={
                loading || !email.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Sending...'
                : 'Send Reset Link'}

              {!loading && (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

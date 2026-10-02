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
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">
            Check Your Email
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
            If an account exists with this email address, password reset instructions have been sent.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Check your inbox and spam folder for the password reset email.
          </p>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] px-4 py-3 text-xs font-semibold text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
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
              <Mail className="h-7 w-7 text-[#4169E1]" />
            </div>

            <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">
              Forgot Password?
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Enter your email address and we'll send you a password reset link.
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
                className="w-full rounded-xl border border-[#2F3338] bg-[#0B0F14] px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={
                loading || !email.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] px-4 py-3 text-xs font-semibold text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all disabled:cursor-not-allowed disabled:opacity-50"
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

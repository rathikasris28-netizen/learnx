import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

export function VerifyEmailPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user, verifyEmail } = useAuth();

  const searchParams = new URLSearchParams(window.location.search);

  const emailParam =
    searchParams.get('email') ||
    user?.email ||
    'your-email@example.com';

  const userIdParam =
    searchParams.get('user_id') ||
    user?.user_id;

  const tokenParam =
    searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    setError('');
    setResendStatus('');

    try {
      setResendStatus('Resending verification email...');

      await apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: {
          email: emailParam,
        },
      });

      setResendStatus(
        `Verification email sent to ${emailParam}`
      );
    } catch (err: any) {
      setResendStatus('');
      setError(
        err?.message ||
          'Failed to resend verification email.'
      );
    }
  };

  const handleConfirmVerification = async () => {
    setLoading(true);
    setError('');

    try {
      if (!tokenParam) {
        throw new Error(
          'Verification token is missing. Please open the verification link from your email or request a new verification email.'
        );
      }

      await verifyEmail(
        userIdParam,
        emailParam,
        tokenParam
      );

      setVerified(true);

      setTimeout(() => {
        navigate('/onboarding');
      }, 1500);
    } catch (err: any) {
      setError(
        err?.message ||
          'Verification confirmation failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 bg-[#0B0F14]">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#123A8C]/25 border border-[#4169E1]/30 text-[#4169E1] mx-auto shadow-inner">
          <Mail className="h-8 w-8" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Space_Grotesk']">
            Verify Your Email Address
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            We sent a verification link to{' '}
            <strong className="text-white font-semibold">
              {emailParam}
            </strong>
            . Please verify your email to unlock peer learning sessions and knowledge exchange.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs text-left backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {resendStatus && (
          <div className="p-3.5 rounded-xl border border-[#4169E1]/30 bg-[#123A8C]/20 text-blue-200 text-xs backdrop-blur-sm">
            {resendStatus}
          </div>
        )}

        {verified ? (
          <div className="p-4 rounded-xl border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 text-xs flex items-center justify-center gap-2 font-medium backdrop-blur-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              Email verified! Redirecting to onboarding...
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:p-7 space-y-4 backdrop-blur-md shadow-2xl">
            <button
              onClick={handleConfirmVerification}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white text-xs font-semibold shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {loading
                  ? 'Verifying...'
                  : 'I have verified my email / Confirm Now'}
              </span>

              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleResend}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl border border-[#2F3338] bg-[#0B0F14] text-slate-300 hover:text-white hover:border-slate-500 text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#4169E1]" />
              <span>Resend Verification Email</span>
            </button>
          </div>
        )}

        <button
          onClick={() => navigate('/login')}
          className="text-xs text-slate-400 hover:text-[#4169E1] transition-colors"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
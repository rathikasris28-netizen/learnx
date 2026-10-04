import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Mail, RefreshCw, LogOut, CheckCircle, Loader2 } from 'lucide-react';

export const VerifyEmail: React.FC = () => {
  const { user, isVerified, signOut } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      if (error) throw error;
      setMessage('Verification email sent successfully. Please check your inbox.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email_confirmed_at || session?.user?.confirmed_at) {
      window.location.href = '/onboarding';
    } else {
      setMessage('Email is not verified yet. Please check your email inbox and click the verification link.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6 text-center">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
          <Mail className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Check Your Email</h1>
          <p className="text-sm text-slate-600">
            We've sent a verification link to <span className="font-semibold text-slate-900">{user?.email}</span>. Please verify your email address to continue to LearnX.
          </p>
        </div>

        {message && (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm rounded-xl font-medium">
            {message}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            onClick={handleCheckStatus}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>I've Verified, Continue</span>
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
          >
            {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Resend Verification Email</span>
          </button>

          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="w-full py-2 text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center justify-center space-x-1 pt-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

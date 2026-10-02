import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type VerificationState =
  | 'loading'
  | 'success'
  | 'error';

export function VerifyEmailPage() {
  const [state, setState] =
    useState<VerificationState>('loading');

  const [message, setMessage] = useState(
    'Verifying your LearnX email...'
  );

  useEffect(() => {
    let active = true;

    async function verifyEmail() {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        /*
         * Supabase PKCE email verification:
         * /verify-email?code=...
         */
        const code = params.get('code');

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (error) {
            throw new Error(
              error.message ||
                'Email verification failed.'
            );
          }

          if (!active) return;

          setState('success');
          setMessage(
            'Your email has been verified successfully. You are now signed in.'
          );

          window.history.replaceState(
            {},
            document.title,
            '/verify-email'
          );

          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1200);

          return;
        }

        /*
         * Fallback for token_hash links.
         */
        const tokenHash =
          params.get('token_hash') ??
          params.get('token');

        const tokenType =
          params.get('type') ?? 'email';

        if (tokenHash) {
          const { data, error } =
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'email',
            });

          if (error || !data.session) {
            throw new Error(
              error?.message ??
                'Email verification failed.'
            );
          }

          if (!active) return;

          setState('success');
          setMessage(
            'Your email has been verified successfully. You are now signed in.'
          );

          window.history.replaceState(
            {},
            document.title,
            '/verify-email'
          );

          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1200);

          return;
        }

        throw new Error(
          'Verification link is missing or has expired. Please use the latest verification email.'
        );
      } catch (error) {
        if (!active) return;

        setState('error');

        setMessage(
          error instanceof Error
            ? error.message
            : 'Email verification failed.'
        );
      }
    }

    void verifyEmail();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl border border-[#2F3338] bg-[#0B0F14] p-8 text-center shadow-2xl">

          {state === 'loading' && (
            <>
              <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-[#2F3338] border-t-[#4169E1]" />

              <h1 className="text-2xl font-bold">
                Verifying Your Email
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {message}
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#123A8C] text-3xl font-bold text-white">
                ✓
              </div>

              <h1 className="text-2xl font-bold">
                Email Verified
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {message}
              </p>

              <p className="mt-4 text-sm text-gray-500">
                Redirecting you to your LearnX dashboard...
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#2F3338] text-3xl font-bold text-white">
                !
              </div>

              <h1 className="text-2xl font-bold">
                Verification Failed
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {message}
              </p>

              <div className="mt-7">
                <button
                  type="button"
                  onClick={() =>
                    window.location.href = '/login'
                  }
                  className="rounded-xl bg-[#4169E1] px-6 py-3 font-semibold text-white transition hover:bg-[#123A8C]"
                >
                  Go to Login
                </button>
              </div>
            </>
          )}

        </section>
      </div>
    </main>
  );
}
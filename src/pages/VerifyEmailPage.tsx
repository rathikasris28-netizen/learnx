import { useEffect, useState } from 'react';

type VerificationState =
  | 'loading'
  | 'success'
  | 'error';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/api'
).replace(/\/+$/, '');

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
        const params =
          new URLSearchParams(
            window.location.search
          );

        /*
         * New Supabase custom-template flow:
         * ?token_hash=...&type=email
         *
         * token is kept as a fallback for the
         * existing LearnX verification flow.
         */
        const tokenHash =
          params.get('token_hash') ??
          params.get('token');

        const tokenType =
          params.get('type') ?? 'email';

        if (!tokenHash) {
          if (active) {
            setState('error');
            setMessage(
              'Verification token is missing. Please use the latest verification email.'
            );
          }
          return;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/auth/verify-email?token_hash=${encodeURIComponent(
              tokenHash
            )}&type=${encodeURIComponent(
              tokenType
            )}`,
            {
              method: 'GET',
              headers: {
                Accept:
                  'application/json',
              },
            }
          );

        const result =
          await response
            .json()
            .catch(() => null);

        if (
          !response.ok ||
          !result?.verified
        ) {
          throw new Error(
            result?.error ??
              result?.message ??
              'Email verification failed.'
          );
        }

        if (!active) return;

        setState('success');
        setMessage(
          'Your email has been verified successfully.'
        );

        /*
         * The verification endpoint intentionally does
         * not log the user into LearnX. Send the user to
         * the normal login flow after verification.
         */
        window.history.replaceState(
          {},
          document.title,
          '/verify-email'
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

  function goToLogin() {
    window.location.href =
      '/login?verified=1';
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl border border-[#2F3338] bg-[#0B0F14] p-8 text-center shadow-2xl">
          {state === 'loading' && (
            <>
              <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-[#2F3338] border-t-[#4169E1]" />

              <h1 className="text-2xl font-bold">
                Verifying Email
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

              <button
                type="button"
                onClick={goToLogin}
                className="mt-7 inline-flex items-center justify-center rounded-xl bg-[#4169E1] px-6 py-3 font-semibold text-white transition hover:bg-[#123A8C] focus:outline-none focus:ring-2 focus:ring-[#4169E1] focus:ring-offset-2 focus:ring-offset-[#0B0F14]"
              >
                Go to Login
              </button>
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

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-xl border border-[#2F3338] px-5 py-3 font-semibold text-white transition hover:border-[#4169E1]"
                >
                  Try Again
                </button>

                <button
                  type="button"
                  onClick={goToLogin}
                  className="rounded-xl bg-[#4169E1] px-5 py-3 font-semibold text-white transition hover:bg-[#123A8C]"
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
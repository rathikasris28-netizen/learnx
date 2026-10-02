import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function TermsPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [accepted, setAccepted] = useState(false);

  const sections = [
    [
      'Platform purpose',
      'LearnX is a peer-to-peer learning and knowledge-sharing platform. Users are responsible for the accuracy of information they provide and for behaving respectfully during sessions.',
    ],
    [
      'Time Credits',
      'New Learners receive a one-time 5 Time Credit welcome bonus. Knowledge Sharers start with 0 Time Credits and earn credits through verified knowledge-sharing sessions. Both participants must confirm completion where required.',
    ],
    [
      'No monetary value',
      'Time Credits are internal learning participation units. They are not money, have no cash value, cannot be withdrawn, sold, or converted to any currency.',
    ],
    [
      'Honest participation',
      'Users must not create fake accounts or manipulate sessions, ratings, progress, identity, or Time Credits. Sessions must be attended and completed honestly. LearnX may suspend accounts for abuse, fraudulent activity, fake activity, or policy violations.',
    ],
    [
      'Privacy and security',
      'Keep account credentials private, provide accurate registration information, and do not share another person’s private information without permission. Users should only access information that they are authorized to access through the platform.',
    ],
    [
      'Recommendations and skill claims',
      'AI recommendations are suggestions and should be reviewed by the user. Skill verification on LearnX does not automatically constitute a professional license, academic award, or external certification.',
    ],
    [
      'User responsibilities',
      'Users are responsible for their conduct, content, and safety during peer-to-peer sessions. Do not request or share unlawful, harmful, confidential, or unauthorized information.',
    ],
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 bg-[#0B0F14]">
      <button
        onClick={() => navigate('/')}
        className="mb-5 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </button>

      <article className="space-y-7 rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <header className="border-b border-[#2F3338] pb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123A8C]/25 text-[#4169E1] border border-[#4169E1]/30 mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
            LearnX Terms & Conditions
          </h1>

          <p className="mt-2 text-xs text-slate-400">
            Effective September 29, 2026
          </p>
        </header>

        {sections.map(([title, text]) => (
          <section key={title} className="space-y-2">
            <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
              {title}
            </h2>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              {text}
            </p>
          </section>
        ))}

        <section className="border-t border-[#2F3338] pt-6">
          <label className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) =>
                setAccepted(event.target.checked)
              }
              className="mt-0.5 h-4 w-4 accent-[#4169E1]"
            />

            <span>
              I agree to the LearnX Terms & Conditions and Privacy Policy.
            </span>
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/register')}
              disabled={!accepted}
              className="rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue to Registration
            </button>

            <button
              onClick={() => navigate('/privacy')}
              className="text-xs font-semibold text-[#4169E1] hover:text-blue-300 underline"
            >
              Privacy Policy
            </button>
          </div>
        </section>
      </article>
    </main>
  );
}

export function PrivacyPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 bg-[#0B0F14]">
      <button
        onClick={() => navigate('/')}
        className="mb-5 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </button>

      <article className="space-y-6 rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
        <header className="border-b border-[#2F3338] pb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
            LearnX Privacy Policy
          </h1>

          <p className="mt-2 text-xs text-slate-400">
            Effective September 29, 2026
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
            Information used by LearnX
          </h2>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            LearnX uses registration details to create and secure your
            account, operate learning and knowledge-sharing features, and
            display your profile to other members where needed for matching
            and sessions. Password authentication is handled through the
            configured authentication system and passwords are not stored as
            plaintext by LearnX.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
            Learning and session data
          </h2>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            Skill selections, availability, course and bootcamp
            enrollments, session status, and verified Time Credit records
            may be stored to provide platform features. Access to session
            information is controlled by authenticated platform access and
            applicable session permissions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
            Security and access
          </h2>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            Protected features use your authenticated account. Do not share
            your password or access token. LearnX uses configured service
            providers such as Supabase for authentication and LiveKit for
            supported live learning sessions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
            Your choices
          </h2>

          <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
            Keep your profile information accurate and contact the LearnX
            administrator through the platform if you need help reviewing or
            correcting account information.
          </p>
        </section>

        <button
          onClick={() => navigate('/terms')}
          className="text-xs font-semibold text-[#4169E1] hover:text-blue-300 underline"
        >
          Read Terms & Conditions
        </button>
      </article>
    </main>
  );
}
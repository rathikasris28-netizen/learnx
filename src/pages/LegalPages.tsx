import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function TermsPage({ navigate }: { navigate: (path: string) => void }) {
  const [accepted, setAccepted] = useState(false);
  const sections = [
    ['Platform purpose', 'LearnX is a peer-to-peer learning and knowledge-sharing platform. Users are responsible for the accuracy of information they provide and for behaving respectfully during sessions.'],
    ['Time Credits', 'New Learners receive a one-time 5 Time Credit welcome bonus. Mentors start with 0 Time Credits and earn credits only through verified knowledge-sharing sessions. Both participants must confirm completion where required.'],
    ['No monetary value', 'Time Credits are internal learning participation units. They are not money, have no cash value, cannot be withdrawn, sold, transferred for money, or converted to any currency.'],
    ['Honest participation', 'Users must not create fake accounts or manipulate sessions, ratings, progress, identity, or Time Credits. Sessions must be attended and completed honestly. LearnX may suspend accounts for abuse, fraud, fake activity, or policy violations.'],
    ['Privacy and security', 'Keep account credentials private, provide accurate registration information, and do not share another person’s private information without permission. Session notes are private to their author; session chat is limited to the participants.'],
    ['Recommendations and skill claims', 'AI recommendations are suggestions and should be reviewed by the user. Skill verification on LearnX does not automatically constitute a professional license, academic award, or external certification.'],
    ['User responsibilities', 'Users are responsible for their conduct, content, and safety during peer-to-peer sessions. Do not request or share unlawful, harmful, or confidential information.']
  ];
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <button onClick={() => navigate('/')} className="mb-5 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Home</button>
      <article className="space-y-7 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-8">
        <header className="border-b border-slate-800 pb-5"><ShieldCheck className="mb-3 h-6 w-6 text-cyan-300" /><h1 className="text-2xl font-bold text-white">LearnX Terms & Conditions</h1><p className="mt-2 text-xs text-slate-400">Effective September 29, 2026</p></header>
        {sections.map(([title, text]) => <section key={title} className="space-y-2"><h2 className="text-sm font-bold text-white">{title}</h2><p className="text-sm leading-relaxed text-slate-300">{text}</p></section>)}
        <section className="border-t border-slate-800 pt-5"><label className="flex items-start gap-2.5 text-sm text-slate-300"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 accent-cyan-500" /><span>I agree to the LearnX Terms & Conditions and Privacy Policy.</span></label><button onClick={() => navigate('/register')} disabled={!accepted} className="mt-4 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Continue to Registration</button><button onClick={() => navigate('/privacy')} className="ml-3 text-xs font-semibold text-cyan-300 underline">Privacy Policy</button></section>
      </article>
    </main>
  );
}

export function PrivacyPage({ navigate }: { navigate: (path: string) => void }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <button onClick={() => navigate('/')} className="mb-5 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Home</button>
      <article className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-8">
        <header className="border-b border-slate-800 pb-5"><h1 className="text-2xl font-bold text-white">LearnX Privacy Policy</h1><p className="mt-2 text-xs text-slate-400">Effective September 29, 2026</p></header>
        <section className="space-y-2"><h2 className="text-sm font-bold text-white">Information used by LearnX</h2><p className="text-sm leading-relaxed text-slate-300">LearnX uses registration details to create and secure your account, operate learning and mentoring features, and display your profile to other members where needed for matching and sessions. Passwords are managed by Supabase Auth and are not stored as plaintext by LearnX.</p></section>
        <section className="space-y-2"><h2 className="text-sm font-bold text-white">Learning and session data</h2><p className="text-sm leading-relaxed text-slate-300">Skill selections, availability, course and bootcamp enrollments, session status, and verified Time Credit ledger records are stored to provide platform features. Session chat is accessible only to the two session participants. Session notes are private to the authenticated author.</p></section>
        <section className="space-y-2"><h2 className="text-sm font-bold text-white">Security and access</h2><p className="text-sm leading-relaxed text-slate-300">Protected features use your authenticated account. Do not share your password or access token. LearnX uses service providers such as Supabase Auth and LiveKit to provide authentication and live sessions.</p></section>
        <section className="space-y-2"><h2 className="text-sm font-bold text-white">Your choices</h2><p className="text-sm leading-relaxed text-slate-300">Keep your profile information accurate and contact the LearnX administrator through the platform if you need help reviewing or correcting account information.</p></section>
        <button onClick={() => navigate('/terms')} className="text-xs font-semibold text-cyan-300 underline">Read Terms & Conditions</button>
      </article>
    </main>
  );
}
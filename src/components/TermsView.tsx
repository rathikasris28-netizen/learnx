import React from 'react';
import { BookOpen, Shield, ArrowLeft } from 'lucide-react';

interface TermsViewProps {
  onBack?: () => void;
}

export default function TermsView({ onBack }: TermsViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-slate-100">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-6 bg-slate-900 border border-slate-800 hover:border-emerald-500 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white">LearnX Terms & Conditions</h1>
          <p className="text-emerald-400 font-medium text-sm mt-1">Learn. Share. Grow. Responsibly.</p>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="bg-slate-950 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" /> 1. Purpose of LearnX
            </h2>
            <p>
              LearnX is strictly an educational peer-to-peer knowledge exchange platform designed to help people learn new skills, share their existing knowledge, and improve themselves through structured learning interactions.
            </p>
            <p className="mt-2 text-slate-400 font-semibold">
              Learn → Share Knowledge → Earn Time Credits → Learn Again → Grow
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">2. Educational Purpose Only</h2>
            <p>
              LearnX is intended primarily for education, learning, knowledge sharing, and personal skill development. Information shared by users should be treated as educational knowledge and personal experience. LearnX does not guarantee that any information provided by another user is completely accurate, professional, certified, or suitable for a particular purpose.
            </p>
          </section>

          <section className="bg-red-950/20 border border-red-900/40 p-5 rounded-xl">
            <h2 className="text-base font-bold text-red-300 mb-2">3. LearnX Is Not Freelancing or Job Marketplace</h2>
            <p className="text-slate-300 mb-2">
              LearnX is <strong>strictly not</strong> a freelancing platform, job platform, employment platform, gig platform, paid tutoring platform, marketing platform, advertising platform, business promotion platform, service-selling platform, marketplace, investment platform, money-making platform, social-media platform, or cryptocurrency platform.
            </p>
            <p className="text-slate-300">
              LearnX does not provide jobs, guarantee employment, act as an employer, or provide a marketplace to sell freelance services, hire freelancers, find clients, advertise services, negotiate project prices, or accept paid commercial contracts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">4. No Marketing, Advertising, or Commercial Promotion</h2>
            <p>
              Users must not use LearnX for advertising products, promoting businesses, marketing services, lead generation, spam, unsolicited promotions, affiliate marketing, or commercial solicitation. Learning sessions must remain focused on the selected educational topic.
            </p>
          </section>

          <section className="bg-emerald-950/20 border border-emerald-900/40 p-5 rounded-xl">
            <h2 className="text-base font-bold text-emerald-300 mb-2">5. No Payment for Knowledge-Sharing & Time Credit Rules</h2>
            <p className="text-slate-300 mb-2">
              LearnX uses an internal <strong>Time Credit</strong> system. Time Credits are internal platform credits that have <strong>no cash value, cannot be converted to money, cannot be withdrawn, cannot be sold, cannot be purchased from another user, and cannot be transferred for financial gain</strong>.
            </p>
            <p className="text-slate-300">
              Time Credits must be earned through legitimate participation (e.g., verified knowledge-sharing sessions). Users must not create fake sessions, falsely confirm sessions, manipulate credit balances, trade credits outside LearnX, or exchange credits for money.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">6. User Responsibilities & Prohibited Content</h2>
            <p className="mb-2">
              Users must provide truthful information, use their own account, respect other learners and knowledge sharers, attend sessions responsibly, and keep sessions educational.
            </p>
            <p>
              Users must not share or request illegal activities, harmful instructions, scams, fraud, harassment, hate speech, threats, sexual exploitation, malicious software, credential theft, sensitive personal credentials (passwords, OTPs, banking info), or illegal financial schemes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">7. Respectful Learning Environment & Privacy</h2>
            <p>
              LearnX provides a safe and respectful educational environment. Users must not harass, bully, threaten, or discriminate against other users. Users must never request another person's passwords, OTPs, banking credentials, authentication tokens, or sensitive personal documents.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">8. Courses, Bootcamps, Quizzes & Knowledge Sharer Disclaimer</h2>
            <p>
              Courses, bootcamps, and quizzes are provided for learning and skill-development purposes. Quiz scores and course completion do not automatically represent professional certification or guarantee employment, income, or career advancement. Being listed as a Knowledge Sharer does not mean LearnX guarantees that the user is a certified professional.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">9. Account Security & Suspension</h2>
            <p>
              Users are responsible for keeping account credentials secure. LearnX may suspend or restrict accounts when users violate these Terms, abuse Time Credits, create fake accounts, manipulate sessions, harass other users, or use the platform for prohibited commercial activities.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

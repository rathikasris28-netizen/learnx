import React from 'react';
import { ShieldCheck, HeartHandshake, Sparkles, BookOpen } from 'lucide-react';

export function Footer({ navigate }: { navigate: (path: string) => void }) {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-12 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                LX
              </div>
              <span className="font-bold text-base text-slate-900 font-['Space_Grotesk']">LearnX</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Give what you know. Learn what you need. Grow together. A peer-to-peer knowledge exchange platform powered by AI matching and LiveKit video rooms.
            </p>
            <div className="text-[11px] text-blue-600 font-semibold">
              1 Hour Sharing = 1 Verified Time Credit
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Learning Hub</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('/discover')} className="hover:text-blue-600 transition-colors">
                  Skill Catalog (22 Skills)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/recommendations')} className="hover:text-blue-600 transition-colors">
                  AI Matching Engine
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/quizzes')} className="hover:text-blue-600 transition-colors">
                  Assessments & Quizzes
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/assistant')} className="hover:text-blue-600 transition-colors">
                  AI Learning Mentor
                </button>
              </li>
            </ul>
          </div>

          {/* Verification & Safety */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Trust & Security</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('/time-wallet')} className="hover:text-blue-600 transition-colors">
                  Time Credit Ledger
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/ratings')} className="hover:text-blue-600 transition-colors">
                  Peer Ratings & Reviews
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/achievements')} className="hover:text-blue-600 transition-colors">
                  Platform Achievements
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/courses')} className="hover:text-blue-600 transition-colors">
                  Partner Courses
                </button>
              </li>
            </ul>
          </div>

          {/* Philosophy Card */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-2">
              <HeartHandshake className="h-4 w-4 text-blue-600" />
              <span>Strict Non-Monetary Policy</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              Time Credits have strictly no cash value, cannot be withdrawn, and cannot be converted to money. LearnX is an authentic knowledge exchange ecosystem, not a commercial service.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} LearnX Platform. Built for authentic peer learning.</p>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 text-[11px]">
            <span>PostgreSQL · Supabase · LiveKit Cloud · Realtime</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

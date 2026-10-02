import React from 'react';
import { HeartHandshake } from 'lucide-react';

export function Footer({ navigate }: { navigate: (path: string) => void }) {
  return (
    <footer className="mt-auto border-t border-[#2F3338] bg-[#0B0F14] py-12 text-slate-400 shadow-2xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#4169E1] to-[#123A8C] text-white font-bold text-xs shadow-sm shadow-[#4169E1]/20 border border-[#4169E1]/40">
                LX
              </div>
              <span className="font-bold text-base text-white font-['Space_Grotesk'] tracking-tight">LearnX</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Give what you know. Learn what you need. Grow together. A peer-to-peer knowledge exchange platform powered by AI matching and LiveKit video rooms.
            </p>
            <div className="text-[11px] text-[#4169E1] font-semibold flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4169E1] shadow-[0_0_6px_#4169E1]" />
              1 Hour Sharing = 1 Verified Time Credit
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 font-['Space_Grotesk']">Learning Hub</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('/discover')} className="text-slate-400 hover:text-[#4169E1] transition-colors text-left">
                  Skill Catalog (22 Skills)
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/recommendations')} className="text-slate-400 hover:text-[#4169E1] transition-colors text-left">
                  AI Matching Engine
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/quizzes')} className="text-slate-400 hover:text-[#4169E1] transition-colors text-left">
                  Assessments & Quizzes
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/assistant')} className="text-slate-400 hover:text-[#4169E1] transition-colors text-left">
                  AI Learning Mentor
                </button>
              </li>
            </ul>
          </div>

          {/* Verification & Safety */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 font-['Space_Grotesk']">Trust & Security</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigate('/time-wallet')} className="text-slate-400 hover:text-[#4169E1] transition-colors text-left">
                  Time Credit Ledger
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/ratings')} className="text-slate-400 hover:text-[#4169E1] transition-colors text-left">
                  Peer Ratings & Reviews
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/achievements')} className="text-slate-400 hover:text-[#4169E1] transition-colors text-left">
                  Platform Achievements
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/courses')} className="text-slate-400 hover:text-[#4169E1] transition-colors text-left">
                  Partner Courses
                </button>
              </li>
            </ul>
          </div>

          {/* Philosophy Card */}
          <div className="rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-4.5 backdrop-blur-sm shadow-md">
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
              <HeartHandshake className="h-4 w-4 text-[#4169E1]" />
              <span>Strict Non-Monetary Policy</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Time Credits have strictly no cash value, cannot be withdrawn, and cannot be converted to money. LearnX is an authentic knowledge exchange ecosystem, not a commercial service.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#2F3338] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} LearnX Platform. Built for authentic peer learning.</p>
          <div className="flex items-center gap-4 mt-2 sm:mt-0 text-[11px] text-slate-400 font-mono">
            <span>PostgreSQL · Supabase · LiveKit Cloud · Realtime</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

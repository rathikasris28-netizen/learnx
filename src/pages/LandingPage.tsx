import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Coins, 
  Video, 
  ShieldCheck, 
  Compass, 
  CheckCircle2, 
  Users, 
  Laptop, 
  Smartphone,
  Star
} from 'lucide-react';
import { apiRequest } from '../lib/api';

export function LandingPage({ navigate }: { navigate: (path: string) => void }) {
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    apiRequest('/skills?category=All').then((res) => {
      setSkills((res.skills || []).slice(0, 8));
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800/60 bg-gradient-to-b from-[#0b0f17] via-[#0d1424] to-[#0b0f17]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Exchange · Learn · Grow · 1 Hour = 1 Time Credit</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-['Space_Grotesk'] max-w-4xl mx-auto leading-tight">
            Give What You Know. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
              Learn What You Need.
            </span> <br />
            Grow Together.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            The authentic peer-to-peer knowledge exchange platform. No monetary payments. Share an hour of what you excel at to earn 1 Time Credit, then use it to learn any skill from a verified peer.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/discover')}
              className="w-full sm:w-auto px-7 py-3 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-200 font-semibold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Compass className="h-4 w-4 text-cyan-400" />
              <span>Explore 22 Skills</span>
            </button>
          </div>

          {/* Real Multi-Device Exchange Demo Callout */}
          <div className="mt-14 max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm text-left shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Laptop className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Real Multi-Device Knowledge Exchange</h3>
                  <p className="text-xs text-slate-400">Synchronized via Supabase, LiveKit Cloud & Server-authoritative ledger</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/40">
                ACTIVE CLOUD INTEGRATION
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5" /> Device A (Learner)
                  </span>
                  <span className="text-[10px] text-slate-400">Chennai, TN</span>
                </div>
                <p className="text-xs text-slate-300">Searches for <strong className="text-white">Python (Beginner)</strong> with availability around <strong className="text-cyan-400">6:00 PM</strong> in <strong className="text-slate-200">Tamil + English</strong>.</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>AI Matching returns verified sharers in real-time</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5" /> Device B (Knowledge Sharer)
                  </span>
                  <span className="text-[10px] text-slate-400">Sathyamangalam, TN</span>
                </div>
                <p className="text-xs text-slate-300">Shares <strong className="text-white">Python</strong>, receives instant request notification, accepts session, and both join <strong className="text-cyan-400">LiveKit Room</strong>.</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>Upon verification: +1 Time Credit awarded to Sharer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles Section */}
      <section className="py-16 bg-[#0b0f17] border-b border-slate-800/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
              Engineered for Authentic Peer Growth
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              LearnX rejects commercial gig marketplaces. Every feature is structured around reciprocal knowledge sharing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-4">
                <Coins className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Time Credit System</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                1 Hour of verified knowledge sharing = 1 Time Credit. Credits have no cash value, cannot be bought or sold, and exist purely to empower mutual growth.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">AI-Assisted Matching</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Matches based on target skills, complementary levels, language alignment, schedule availability, and reliability ratings calculated from real sessions.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">LiveKit Video Rooms</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                High-definition WebRTC video, crystal audio, screen sharing, integrated timer, and two-way session completion verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Skills Catalog Preview */}
      <section className="py-16 bg-[#090d15] border-b border-slate-800/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                Comprehensive Skill Catalog
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                From core technical stacks to essential leadership and communication.
              </p>
            </div>
            <button
              onClick={() => navigate('/discover')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View all 22 skills <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {skills.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/discover?search=${encodeURIComponent(s.name)}`)}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/40 hover:bg-slate-900/80 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {s.category}
                  </span>
                  <span className="text-[10px] text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {s.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#0b0f17] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white font-['Space_Grotesk']">
            Ready to exchange knowledge and grow?
          </h2>
          <p className="text-sm text-slate-300 mt-3 max-w-xl mx-auto">
            Join the community today. Register your learning and sharing interests to find your first peer match.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              Create Free Account
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-200 font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Coins,
  Video,
  Compass,
  CheckCircle2,
  Laptop,
  Smartphone,
} from 'lucide-react';
import { apiRequest } from '../lib/api';

interface Skill {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
}

interface SkillsResponse {
  skills?: Skill[];
}

export function LandingPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      setSkillsLoading(true);

      try {
        const response = await apiRequest<Skill[] | SkillsResponse>(
          '/skills?category=All'
        );

        const skillList = Array.isArray(response)
          ? response
          : Array.isArray(response?.skills)
            ? response.skills
            : [];

        if (!cancelled) {
          setSkills(skillList.slice(0, 8));
        }
      } catch {
        if (!cancelled) {
          setSkills([]);
        }
      } finally {
        if (!cancelled) {
          setSkillsLoading(false);
        }
      }
    };

    loadSkills();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F14] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-14 pb-20 lg:pt-24 lg:pb-32 border-b border-[#2F3338] bg-gradient-to-b from-[#0B0F14] via-[#111722] to-[#0B0F14]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(65,105,225,0.18),rgba(18,58,140,0.05)_50%,transparent)] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4169E1]/30 bg-[#123A8C]/20 text-blue-200 text-xs font-semibold mb-6 shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#4169E1]" />
            <span>
              Exchange · Learn · Grow · 1 Hour = 1 Time Credit
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white font-['Space_Grotesk'] max-w-5xl mx-auto leading-[1.12]">
            Give What You Know.{' '}
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#4169E1] via-[#6F8FF0] to-[#123A8C] bg-clip-text text-transparent">
              Learn What You Need.
            </span>{' '}
            <br />
            Grow Together.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            LearnX is a peer-to-peer knowledge exchange platform where people
            can share what they know and learn what they need. There are no
            monetary payments. One verified hour of knowledge sharing earns
            one Time Credit that can be used for learning.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white font-semibold text-sm shadow-lg shadow-[#4169E1]/25 hover:from-[#5278ef] hover:to-[#1746a2] transition-all flex items-center justify-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => navigate('/discover')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-[#2F3338] bg-[#121720]/80 text-slate-200 font-semibold text-sm hover:bg-[#2F3338] hover:border-slate-500 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
              <Compass className="h-4 w-4 text-[#4169E1]" />
              <span>Explore Skills</span>
            </button>
          </div>

          {/* Knowledge Exchange Flow Card */}
          <div className="mt-16 max-w-4xl mx-auto rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:p-8 backdrop-blur-md text-left shadow-2xl shadow-black/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#2F3338]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#123A8C]/25 border border-[#4169E1]/30 text-[#4169E1]">
                  <Laptop className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    One-to-One Knowledge Exchange
                  </h3>
                  <p className="text-xs text-slate-400">
                    Discover a peer, schedule a session, learn together, and
                    verify completion.
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono text-blue-300 bg-[#123A8C]/30 px-3 py-1 rounded-md border border-[#4169E1]/40 font-semibold tracking-wider">
                LEARNX FLOW
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
              <div className="p-5 rounded-xl bg-[#0B0F14]/70 border border-[#2F3338]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                    <Laptop className="h-4 w-4 text-[#4169E1]" />
                    Learner
                  </span>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Find a peer
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Choose a skill you want to learn, select your preferred
                  level and language, and find suitable knowledge sharers.
                </p>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Matching considers skill, level, language,
                    availability and reliability.
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0F14]/70 border border-[#2F3338]">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-[#4169E1]" />
                    Knowledge Sharer
                  </span>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Share a skill
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Register the skills you can share, accept a learning
                  request, and meet your peer in a scheduled session.
                </p>

                <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                  <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    After verified completion, the sharer earns Time Credits.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Principles Section */}
      <section className="py-20 bg-[#0B0F14] border-b border-[#2F3338]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
              Built for Knowledge Exchange
            </h2>

            <p className="text-sm text-slate-400 mt-2.5">
              LearnX is designed around peer learning, knowledge sharing and
              verified one-to-one sessions rather than paid services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-[#2F3338] bg-[#121720]/60 hover:border-[#4169E1]/40 transition-all hover:shadow-[0_4px_24px_rgba(18,58,140,0.2)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123A8C]/25 text-[#4169E1] border border-[#4169E1]/30 mb-5">
                <Coins className="h-5 w-5" />
              </div>

              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Time Credit System
              </h3>

              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                One verified hour of knowledge sharing equals one Time
                Credit. Credits are an internal participation unit with no
                cash value and cannot be bought or sold.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#2F3338] bg-[#121720]/60 hover:border-[#4169E1]/40 transition-all hover:shadow-[0_4px_24px_rgba(18,58,140,0.2)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123A8C]/25 text-[#4169E1] border border-[#4169E1]/30 mb-5">
                <Sparkles className="h-5 w-5" />
              </div>

              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                AI-Assisted Matching
              </h3>

              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                Matching can use learning needs, shareable skills, levels,
                language, availability and session reliability to help users
                discover suitable peers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[#2F3338] bg-[#121720]/60 hover:border-[#4169E1]/40 transition-all hover:shadow-[0_4px_24px_rgba(18,58,140,0.2)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123A8C]/25 text-[#4169E1] border border-[#4169E1]/30 mb-5">
                <Video className="h-5 w-5" />
              </div>

              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Live Learning Sessions
              </h3>

              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                Scheduled one-to-one sessions can use LiveKit for real-time
                video, audio and collaborative learning, followed by
                completion verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Skills Catalog Preview */}
      <section className="py-20 bg-[#0E131A] border-b border-[#2F3338]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
                Explore Skills
              </h2>

              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Discover technical and non-technical skills available through
                the LearnX knowledge exchange.
              </p>
            </div>

            <button
              onClick={() => navigate('/discover')}
              className="text-xs font-semibold text-[#4169E1] hover:text-blue-300 flex items-center gap-1.5 transition-colors"
            >
              <span>View all skills</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {skillsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-xl border border-[#2F3338] bg-[#121720]/40 animate-pulse"
                />
              ))}
            </div>
          ) : skills.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  onClick={() =>
                    navigate(
                      `/discover?search=${encodeURIComponent(skill.name)}`
                    )
                  }
                  className="p-5 rounded-xl border border-[#2F3338] bg-[#121720]/60 hover:border-[#4169E1]/50 hover:bg-[#121720] cursor-pointer transition-all group shadow-sm hover:shadow-[0_4px_18px_rgba(18,58,140,0.2)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {skill.category || 'Skill'}
                    </span>

                    <span className="text-[11px] text-[#4169E1] group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    {skill.name}
                  </h4>

                  {skill.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {skill.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#2F3338] bg-[#121720]/40 p-8 text-center">
              <p className="text-sm text-slate-400">
                Skills are currently unavailable. Please try again later.
              </p>

              <button
                onClick={() => navigate('/discover')}
                className="mt-4 text-xs font-semibold text-[#4169E1] hover:text-blue-300 hover:underline"
              >
                Open Discover
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0B0F14] text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(65,105,225,0.08),transparent)] pointer-events-none" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white font-['Space_Grotesk']">
            Ready to exchange knowledge and grow?
          </h2>

          <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-xl mx-auto leading-relaxed">
            Create your LearnX account, choose what you want to learn or
            share, and start building meaningful peer-to-peer learning
            connections.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white font-semibold text-sm shadow-lg shadow-[#4169E1]/25 hover:from-[#5278ef] hover:to-[#1746a2] transition-all"
            >
              Create Free Account
            </button>

            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 rounded-xl border border-[#2F3338] bg-[#121720]/80 text-slate-200 font-semibold text-sm hover:bg-[#2F3338] hover:border-slate-500 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
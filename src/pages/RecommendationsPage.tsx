import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Star, ShieldCheck, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { MatchCandidate } from '../types';

export function RecommendationsPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/matching').then((res) => {
      setMatches(res.matches || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs font-semibold mb-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Algorithmic Compatibility Breakdown</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
          AI-Assisted Peer Matching
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Recommendations calculated by matching your target skills with verified peer sharers, complementary skill proficiency, schedule overlap, language compatibility, and platform trust metrics.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Calculating match percentages across verified knowledge sharers...
        </div>
      ) : matches.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 space-y-3">
          <p className="text-xs text-slate-400">
            No matching knowledge sharers found for your current profile.
          </p>
          <button
            onClick={() => navigate('/discover')}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-semibold text-xs hover:bg-cyan-400 transition-colors"
          >
            Browse Full Skill Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((c, idx) => (
            <div
              key={`${c.user_id}-${c.skill_id || ''}-${idx}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-md"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-white uppercase">
                      {c.full_name?.slice(0, 2) || 'LX'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{c.full_name}</h3>
                      <p className="text-xs text-slate-400">
                        {c.city ? `${c.city}, ` : ''}{c.preferred_language}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-extrabold text-sm">
                      {c.match_percentage}%
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Match Score</span>
                  </div>
                </div>

                {/* Skill Details */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sharing Skill:</span>
                    <span className="font-semibold text-white">{c.skill_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Skill Level:</span>
                    <span className="text-cyan-400 font-medium">{c.skill_level}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Availability:</span>
                    <span className="text-emerald-400 font-medium">{c.availability_status} ({c.available_from?.slice(0, 5)} - {c.available_until?.slice(0, 5)})</span>
                  </div>
                </div>

                {/* AI Rationale */}
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Why Recommended:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    {c.why_recommended}
                  </p>
                </div>

                {/* Trust & Reliability Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Rating</div>
                    <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 fill-current" />
                      <span>{Number(c.rating_avg).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Reliability</div>
                    <div className="text-xs font-bold text-white mt-0.5">{c.reliability_score}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400">Trust</div>
                    <div className="text-xs font-bold text-purple-400 mt-0.5">{c.trust_score}%</div>
                  </div>
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={() => navigate(`/discover?book=${c.user_id}&skill=${c.skill_id}`)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2"
              >
                <span>Select Slot & Book Session</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

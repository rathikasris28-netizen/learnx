import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Coins, 
  Calendar, 
  BookOpen, 
  Share2, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  AlertCircle,
  Video,
  UserCheck
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { SessionRecord, MatchCandidate } from '../types';

export function DashboardPage({ navigate }: { navigate: (path: string) => void }) {
  const { user, refreshUser } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [recommended, setRecommended] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<string>(user?.availability || 'ACTIVE');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessRes, matchRes] = await Promise.all([
        apiRequest('/sessions'),
        apiRequest('/matching')
      ]);
      setSessions(sessRes.sessions || []);
      setRecommended((matchRes.matches || []).slice(0, 3));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleAvailability = async (newStatus: string) => {
    setAvailabilityStatus(newStatus);
    try {
      await apiRequest('/availability', {
        method: 'POST',
        body: JSON.stringify({ status: newStatus })
      });
      await refreshUser();
    } catch (err: any) {
      alert(err.message || 'Failed to update availability');
    }
  };

  const upcomingSessions = sessions.filter(s => ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(s.status));
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-[#0b1329] backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
              Hello, {user?.full_name || 'Learner'}
            </h1>
            <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
              Verified Peer
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {user?.city ? `${user.city}, ${user.state || ''} · ` : ''}Preferred: {user?.preferred_language || 'English'}
          </p>
        </div>

        {/* Sharer Availability Toggle */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 p-2 rounded-xl">
          <span className="text-xs text-slate-400 font-medium pl-1">Availability:</span>
          <div className="flex items-center gap-1">
            {(['ACTIVE', 'INACTIVE', 'IN_CLASS'] as const).map((st) => (
              <button
                key={st}
                onClick={() => handleToggleAvailability(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  availabilityStatus === st
                    ? st === 'ACTIVE'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : st === 'IN_CLASS'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Time Credits Wallet */}
        <div 
          onClick={() => navigate('/time-wallet')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/40 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Time Wallet</span>
            <Coins className="h-4 w-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
            {user?.wallet_balance ?? 0} <span className="text-xs text-cyan-400 font-normal">TC</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {user?.total_earned_credits ?? 0} earned · 1 Hour Sharing = 1 TC
          </p>
        </div>

        {/* Upcoming Sessions */}
        <div 
          onClick={() => navigate('/sessions')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/40 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Sessions</span>
            <Calendar className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
            {upcomingSessions.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {completedSessions.length} completed sessions
          </p>
        </div>

        {/* Learning Goals */}
        <div 
          onClick={() => navigate('/my-learning')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/40 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Skills Learning</span>
            <BookOpen className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
            {user?.learn_skills?.length ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {user?.learn_skills?.map(s => s.name).slice(0, 2).join(', ') || 'No skills added yet'}
          </p>
        </div>

        {/* Trust & Reliability Score */}
        <div 
          onClick={() => navigate('/profile')}
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/40 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Trust Score</span>
            <ShieldCheck className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white font-['Space_Grotesk']">
            {user?.trust_score ?? 85}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Reliability: {user?.reliability_score ?? 90}%
          </p>
        </div>
      </div>

      {/* Main Grid: Upcoming Sessions & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Sessions & Learning Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Sessions Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                  Scheduled Learning & Sharing Sessions
                </h3>
              </div>
              <button 
                onClick={() => navigate('/sessions')}
                className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {upcomingSessions.length === 0 ? (
              <div className="py-10 text-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 space-y-3">
                <BookOpen className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  No learning sessions yet. Find a skill to start learning.
                </p>
                <button
                  onClick={() => navigate('/discover')}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white font-semibold text-xs hover:bg-cyan-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Discover Skills</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((s) => {
                  const isSharer = s.knowledge_sharer_id === user?.user_id;
                  const otherName = isSharer ? s.learner_name : s.sharer_name;
                  return (
                    <div 
                      key={s.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{s.skill_name}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            s.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' :
                            s.status === 'IN_PROGRESS' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40' :
                            'bg-amber-950 text-amber-300 border border-amber-800/40'
                          }`}>
                            {s.status}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isSharer ? '(You are Sharing)' : '(You are Learning)'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          With <strong className="text-white">{otherName}</strong> · Goal: {s.learning_goal}
                        </p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{s.session_date} at {s.start_time} (60 min)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS' ? (
                          <button
                            onClick={() => navigate(`/session-room/${s.id}`)}
                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-1.5"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Join LiveKit Room</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('/sessions')}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800"
                          >
                            Manage
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Learning Progress Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                Active Learning Paths
              </h3>
              <button 
                onClick={() => navigate('/learning-path')}
                className="text-xs font-semibold text-cyan-400 hover:underline"
              >
                View 4-Week Blueprint
              </button>
            </div>

            {(!user?.learn_skills || user.learn_skills.length === 0) ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                You haven't selected any learning skills yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user.learn_skills.map((s, idx) => (
                  <div key={s.id || s.name || `learn-${idx}`} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{s.name}</span>
                      <span className="text-[10px] text-cyan-400 font-semibold">{s.skill_level}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full" style={{ width: '35%' }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                      <span>Foundations</span>
                      <button 
                        onClick={() => navigate(`/quizzes`)}
                        className="text-cyan-400 hover:underline"
                      >
                        Take Assessment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): AI Match Recommendations & Sharing Skills */}
        <div className="space-y-6">
          {/* AI Recommended Peer Sharers */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                AI Match Recommendations
              </h3>
              <button 
                onClick={() => navigate('/recommendations')}
                className="text-xs font-semibold text-cyan-400 hover:underline"
              >
                All Matches
              </button>
            </div>

            {recommended.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No peer sharers currently available for your exact skill filters.
              </div>
            ) : (
              <div className="space-y-3">
                {recommended.map((c, idx) => (
                  <div 
                    key={`${c.user_id}-${c.skill_id || ''}-${idx}`}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-cyan-500/40 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          {c.full_name?.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{c.full_name}</div>
                          <div className="text-[10px] text-slate-400">{c.skill_name} ({c.skill_level})</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-cyan-400">
                        {c.match_percentage}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {c.why_recommended}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {c.available_from?.slice(0, 5)} - {c.available_until?.slice(0, 5)}
                      </span>
                      <button
                        onClick={() => navigate(`/discover?book=${c.user_id}&skill=${c.skill_id}`)}
                        className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-[10px] font-semibold transition-colors"
                      >
                        Book Session
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* What You Share Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <Share2 className="h-4 w-4 text-emerald-400" />
                Skills You Share
              </h3>
              <button 
                onClick={() => navigate('/my-sharing')}
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                Manage
              </button>
            </div>

            {(!user?.share_skills || user.share_skills.length === 0) ? (
              <p className="text-xs text-slate-500 py-2">
                No sharing skills configured. Add skills to start earning Time Credits.
              </p>
            ) : (
              <div className="space-y-2">
                {user.share_skills.map((s, idx) => (
                  <div key={s.id || s.name || `share-${idx}`} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{s.name}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                      {s.skill_level}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

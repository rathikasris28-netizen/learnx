import React, { useState } from 'react';
import { Sparkles, Coins, Award, Video, CheckCircle, XCircle, Calendar, Star, Users } from 'lucide-react';

interface MentorDashboardProps {
  user: any;
  sessions: any[];
  credits: number;
  setActiveTab: (tab: string) => void;
  onJoinSession: (session: any) => void;
  onRefreshSessions: () => void;
}

export default function MentorDashboard({
  user,
  sessions,
  credits,
  setActiveTab,
  onJoinSession,
  onRefreshSessions
}: MentorDashboardProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const incomingRequests = sessions.filter(s => s.mentor_id === user.id && s.status === 'PENDING');
  const acceptedSessions = sessions.filter(s => s.mentor_id === user.id && (s.status === 'ACCEPTED' || s.status === 'COMPLETED'));

  const handleAccept = async (sessionId: number) => {
    setLoadingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
      });
      if (res.ok) {
        onRefreshSessions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (sessionId: number) => {
    setLoadingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
      });
      if (res.ok) {
        onRefreshSessions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900/65 via-indigo-900/50 to-slate-900 border border-purple-800/60 rounded-3xl p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-purple-500/30">
            <Award className="w-3.5 h-3.5" /> Knowledge Sharer / Mentor Dashboard
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Welcome, {user.name}! 🌟
          </h1>
          <p className="text-slate-300 mt-2 text-base">
            You are sharing your expertise in <span className="text-purple-400 font-semibold">Drawing, Video Editing, and Painting</span>. You have earned <span className="text-amber-400 font-bold">{credits} Time Credits</span> through verified sessions.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="bg-slate-950/80 border border-slate-800 px-5 py-3 rounded-xl flex items-center gap-3">
              <Coins className="w-6 h-6 text-amber-400" />
              <div>
                <span className="text-xs text-slate-400 block">Total Earnings</span>
                <span className="text-lg font-bold text-white">{credits} Time Credits</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 px-5 py-3 rounded-xl flex items-center gap-3">
              <Star className="w-6 h-6 text-amber-400" />
              <div>
                <span className="text-xs text-slate-400 block">Mentor Rating</span>
                <span className="text-lg font-bold text-white">4.8 ⭐ (14 Reviews)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incoming Requests Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-purple-400" /> Incoming Session Requests ({incomingRequests.length})
        </h2>

        {incomingRequests.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-400 text-sm">No pending session requests at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incomingRequests.map((req) => (
              <div key={req.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 font-semibold">
                      {req.skill_name}
                    </span>
                    <span className="text-xs text-slate-400">Requested by <strong className="text-white">{req.learner_name}</strong></span>
                  </div>
                  <p className="text-slate-200 text-sm mt-1">"{req.message || 'I would love to learn from your expertise!'}"</p>
                  <p className="text-xs text-slate-500 mt-1">Scheduled for: {new Date(req.scheduled_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAccept(req.id)}
                    disabled={loadingId === req.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Accept
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={loadingId === req.id}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Accepted Sessions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-purple-400" /> Accepted & Upcoming Sessions
        </h2>

        {acceptedSessions.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-400 text-sm">No accepted sessions yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {acceptedSessions.map((session) => (
              <div key={session.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${session.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-purple-950 text-purple-400 border border-purple-800'}`}>
                      {session.status}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(session.scheduled_at).toLocaleString()}</span>
                  </div>
                  <h3 className="text-white font-semibold">{session.skill_name} Session with {session.learner_name}</h3>
                </div>
                {session.status !== 'COMPLETED' && (
                  <button
                    onClick={() => onJoinSession(session)}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Join Live Room
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

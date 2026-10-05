import React from 'react';
import { Video, Calendar, CheckCircle, Clock } from 'lucide-react';

interface SessionsViewProps {
  sessions: any[];
  user: any;
  onJoinSession: (session: any) => void;
  setActiveTab: (tab: string) => void;
}

export default function SessionsView({ sessions, user, onJoinSession, setActiveTab }: SessionsViewProps) {
  const isMentor = user.role === 'KNOWLEDGE_SHARER';

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-indigo-500/30">
            <Video className="w-3.5 h-3.5" /> Peer Learning Sessions
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Learning & Mentoring Sessions</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Review scheduled, active, and completed live peer-to-peer sessions. Join rooms or confirm completion to transfer Time Credits.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No sessions recorded yet.</p>
            {!isMentor && (
              <button
                onClick={() => setActiveTab('explore')}
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
              >
                Find a Mentor
              </button>
            )}
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${session.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : session.status === 'COMPLETED' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                    {session.status}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {new Date(session.scheduled_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {session.skill_name} Session with {isMentor ? session.learner_name : session.mentor_name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Message: "{session.message || 'Peer learning session'}"</p>
              </div>

              {session.status === 'ACCEPTED' && (
                <button
                  onClick={() => onJoinSession(session)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" /> Join Live Room
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

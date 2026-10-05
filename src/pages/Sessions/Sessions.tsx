import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnxApi } from '../../services/learnx';
import { Video, Calendar, Clock, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';

export const Sessions: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    learnxApi.getMySessions()
      .then((data) => setSessions(data))
      .catch((err) => {
        console.error('Error fetching sessions:', err);
        setError('Failed to load sessions.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading your sessions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Learning Sessions</h1>
        <p className="text-sm text-slate-500">Manage your scheduled, in-progress, and completed peer sessions.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-4 border border-slate-200">
          <Video className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-700 font-bold">No sessions scheduled yet.</p>
          <button
            onClick={() => navigate('/matches')}
            className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm"
          >
            Find Matches & Book Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="font-extrabold text-slate-900 text-lg">{session.skills?.name || 'Learning Session'}</span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      session.status === 'SCHEDULED'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : session.status === 'IN_PROGRESS'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                        : session.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">Goal: {session.session_goal || 'Exchange knowledge and grow.'}</p>
                <div className="flex items-center space-x-4 text-xs text-slate-500 font-medium">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>{new Date(session.scheduled_start).toLocaleDateString()}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>
                      {new Date(session.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(session.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate(`/sessions/${session.id}`)}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center space-x-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Open Session Room</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

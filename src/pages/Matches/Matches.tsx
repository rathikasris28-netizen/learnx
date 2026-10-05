import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnxApi } from '../../services/learnx';
import { Users, Star, CheckCircle2, Loader2, ArrowRight, Calendar } from 'lucide-react';

export const Matches: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    learnxApi.getMyLearningRequests()
      .then((reqs) => {
        setRequests(reqs);
        if (reqs.length > 0) {
          setSelectedRequestId(reqs[0].id);
          fetchMatches(reqs[0].id);
        }
      })
      .catch((err) => console.error('Error loading requests:', err))
      .finally(() => setLoadingReqs(false));
  }, []);

  const fetchMatches = async (reqId: string) => {
    setLoadingMatches(true);
    setError(null);
    try {
      const data = await learnxApi.findMatches(reqId);
      setMatches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to find AI matches.');
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    setAcceptingId(matchId);
    setError(null);
    setSuccessMessage(null);

    try {
      const now = new Date();
      const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
      const endTime = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString(); // 1 hour session

      await learnxApi.acceptMatch(matchId, startTime, endTime);
      setSuccessMessage('Match accepted and session booked successfully! Redirecting to sessions...');
      setTimeout(() => navigate('/sessions'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to accept match.');
    } finally {
      setAcceptingId(null);
    }
  };

  if (loadingReqs) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading learning requests...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI Skill Matches</h1>
          <p className="text-sm text-slate-500">Connect with verified knowledge sharers based on your learning goals.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center space-y-4 border border-slate-200">
          <p className="text-slate-600 font-medium">You have no active learning requests.</p>
          <button
            onClick={() => navigate('/learn')}
            className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl text-sm"
          >
            Create Learning Request
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Request Selector */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto flex-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Learning Request
              </label>
              <select
                value={selectedRequestId}
                onChange={(e) => {
                  setSelectedRequestId(e.target.value);
                  fetchMatches(e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {requests.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.skills?.name || 'Skill'} ({req.skill_level}) - {req.learning_goal.substring(0, 40)}...
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => fetchMatches(selectedRequestId)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all self-end sm:self-center"
            >
              Refresh Matches
            </button>
          </div>

          {/* Matches List */}
          {loadingMatches ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-600 font-medium">Finding AI matches from Supabase...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center space-y-3 border border-slate-200">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-slate-700 font-bold">No suitable knowledge sharers found right now.</p>
              <p className="text-xs text-slate-500">Check back later or try requesting another skill.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {matches.map((match) => (
                <div key={match.match_id || match.knowledge_sharer_id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-lg">
                          {match.sharer_name?.charAt(0) || 'K'}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{match.sharer_name || 'Knowledge Sharer'}</h3>
                          <div className="flex items-center space-x-1 text-xs text-amber-600 font-semibold">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{match.rating ?? '5.0'} Rating</span>
                          </div>
                        </div>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                        {Math.round((match.match_score ?? 0.95) * 100)}% Match
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>Skill: <span className="font-semibold text-slate-800">{match.skill_name || 'Skill'}</span></p>
                      <p>Level: <span className="font-semibold text-slate-800">{match.skill_level || 'Advanced'}</span></p>
                      <p>Language: <span className="font-semibold text-slate-800">{match.preferred_language || 'English'}</span></p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptMatch(match.match_id)}
                    disabled={acceptingId === match.match_id}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {acceptingId === match.match_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>Accept Match & Book Session</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

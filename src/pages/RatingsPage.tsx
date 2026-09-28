import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Star, MessageSquare, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

export function RatingsPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [received, setReceived] = useState<any[]>([]);
  const [given, setGiven] = useState<any[]>([]);
  const [unratedSessions, setUnratedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active rating modal form state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [targetSession, setTargetSession] = useState<any>(null);
  const [scores, setScores] = useState({ r1: 5, r2: 5, r3: 5, r4: 5, r5: 5 });
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRatingsData = async () => {
    try {
      setLoading(true);
      const [ratingsData, sessionsData] = await Promise.all([
        apiRequest('/ratings'),
        apiRequest('/sessions')
      ]);

      setReceived(ratingsData.received || []);
      setGiven(ratingsData.given || []);

      // Find completed sessions that haven't been rated by this user yet
      const ratedSessionIds = new Set((ratingsData.given || []).map((r: any) => r.session_id));
      const unrated = (sessionsData.sessions || []).filter(
        (s: any) => s.status === 'COMPLETED' && !ratedSessionIds.has(s.id)
      );
      setUnratedSessions(unrated);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatingsData();
  }, []);

  const openRatingForm = (s: any) => {
    setTargetSession(s);
    setScores({ r1: 5, r2: 5, r3: 5, r4: 5, r5: 5 });
    setFeedback('');
    setRatingModalOpen(true);
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSession) return;
    setSubmitting(true);

    try {
      await apiRequest('/ratings', {
        method: 'POST',
        body: JSON.stringify({
          session_id: targetSession.id,
          rating_1: scores.r1,
          rating_2: scores.r2,
          rating_3: scores.r3,
          rating_4: scores.r4,
          rating_5: scores.r5,
          feedback
        })
      });
      setRatingModalOpen(false);
      fetchRatingsData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-400 fill-current" />
          Peer Ratings & Verified Reviews
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Every completed session is evaluated across 5 key peer engagement metrics to maintain platform trust.
        </p>
      </div>

      {/* Pending Ratings Alert */}
      {unratedSessions.length > 0 && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <span>You have {unratedSessions.length} completed session(s) awaiting your peer review:</span>
          </div>
          <div className="space-y-2">
            {unratedSessions.map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white">{s.skill_name}</span> with {s.knowledge_sharer_id === user?.user_id ? s.learner_name : s.sharer_name} on {s.session_date}
                </div>
                <button
                  onClick={() => openRatingForm(s)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  Rate Session
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ratings Received */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
        <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
          Feedback Received from Peers ({received.length})
        </h2>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading feedback...</div>
        ) : received.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            No feedback received yet. Complete sessions to build your peer reputation.
          </p>
        ) : (
          <div className="space-y-3">
            {received.map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white">
                    {r.other_party_name} · <span className="text-slate-400 font-normal">{r.skill_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>{Number(r.overall_score).toFixed(1)}/5.0</span>
                  </div>
                </div>
                {r.feedback && (
                  <p className="text-slate-300 italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                    "{r.feedback}"
                  </p>
                )}
                <div className="flex items-center gap-4 text-[10px] text-slate-500">
                  <span>Punctuality: {r.rating_punctuality}/5</span>
                  <span>Communication: {r.rating_communication}/5</span>
                  <span>Respect: {r.rating_respect}/5</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {ratingModalOpen && targetSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl space-y-5">
            <h3 className="text-sm font-bold text-white">
              Rate Session with {targetSession.knowledge_sharer_id === user?.user_id ? targetSession.learner_name : targetSession.sharer_name}
            </h3>

            <form onSubmit={handleSubmitRating} className="space-y-4 text-xs">
              <div className="space-y-3">
                {[
                  { key: 'r1', label: targetSession.knowledge_sharer_id === user?.user_id ? 'Learner Participation' : 'Knowledge Sharing Quality' },
                  { key: 'r2', label: 'Clear Communication' },
                  { key: 'r3', label: 'Punctuality & Timeliness' },
                  { key: 'r4', label: targetSession.knowledge_sharer_id === user?.user_id ? 'Effort & Preparedness' : 'Helpfulness & Guidance' },
                  { key: 'r5', label: 'Mutual Respect & Courtesy' }
                ].map((crit) => (
                  <div key={crit.key} className="flex items-center justify-between">
                    <span className="text-slate-300">{crit.label}:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setScores({ ...scores, [crit.key]: num })}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                            (scores as any)[crit.key] >= num
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Written Feedback / Testimonial:
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share details on how the session went..."
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRatingModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-md hover:from-cyan-400 hover:to-blue-500"
                >
                  {submitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

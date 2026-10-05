import React, { useState, useEffect } from 'react';
import { Compass, Search, Star, Award, MapPin, Globe, Calendar, CheckCircle } from 'lucide-react';

interface ExploreSharersProps {
  onRefreshSessions: () => void;
  setActiveTab: (tab: string) => void;
}

export default function ExploreSharers({ onRefreshSessions, setActiveTab }: ExploreSharersProps) {
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<any | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/matching', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMentors(data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleRequestSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor || !selectedSkillId) return;

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('learnx_token')}`
        },
        body: JSON.stringify({
          mentor_id: selectedMentor.id,
          skill_id: selectedSkillId,
          scheduled_at: scheduledAt || new Date().toISOString(),
          message
        })
      });
      if (res.ok) {
        setRequestSuccess(true);
        onRefreshSessions();
        setTimeout(() => {
          setRequestSuccess(false);
          setSelectedMentor(null);
          setActiveTab('sessions');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-indigo-500/30">
            <Compass className="w-3.5 h-3.5" /> Smart Mentor Matching
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Explore Knowledge Sharers</h1>
          <p className="text-slate-300 mt-2 text-sm">
            AI-matched mentors based on your learning interests, preferred language, and skill level. Request a live peer-to-peer learning session.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Finding best matching mentors...</div>
      ) : mentors.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <p className="text-slate-400">No mentors found matching your selected learning skills yet. Try adding more skills to your profile!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 shadow-lg transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {mentor.name.charAt(0)}
                  </div>
                  <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full">
                    {mentor.matchScore}% Match
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">{mentor.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {mentor.city}, {mentor.state} • <Globe className="w-3.5 h-3.5 ml-1 text-purple-400" /> {mentor.language}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <span className="flex items-center text-amber-400 text-xs font-semibold gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {mentor.rating}
                  </span>
                  <span className="text-xs text-slate-400">{mentor.sessionsCompleted} Sessions Completed</span>
                </div>

                <div className="mt-4">
                  <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">Skills Shared:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {mentor.skills?.filter((s: any) => s.type === 'SHARE').map((s: any) => (
                      <span key={s.id} className="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700">
                        {s.name} ({s.level})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setSelectedMentor(mentor)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Request Session
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Request Modal */}
      {selectedMentor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-2">Request Session with {selectedMentor.name}</h2>
            <p className="text-xs text-slate-400 mb-6">Choose a skill to learn and schedule your peer session.</p>

            {requestSuccess ? (
              <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-center font-medium">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
                Session request sent successfully! Redirecting...
              </div>
            ) : (
              <form onSubmit={handleRequestSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Select Skill to Learn</label>
                  <select
                    required
                    value={selectedSkillId || ''}
                    onChange={(e) => setSelectedSkillId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Skill --</option>
                    {selectedMentor.skills?.filter((s: any) => s.type === 'SHARE').map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Message / Learning Goal</label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Hi! I would love to learn..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMentor(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition text-sm shadow-md"
                  >
                    Send Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

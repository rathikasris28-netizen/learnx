import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  Video, 
  Check, 
  X, 
  AlertCircle, 
  User, 
  ArrowRight, 
  Coins, 
  Star,
  CheckCircle2,
  ExternalLink,
  Plus,
  Copy,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { SessionRecord, Skill, MatchCandidate } from '../types';

export function SessionsPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Google Meet schedule modal
  const [isMeetModalOpen, setIsMeetModalOpen] = useState(false);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');

  const [meetForm, setMeetForm] = useState({
    sharer_id: '',
    skill_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00:00',
    goal: '1-on-1 practical peer coding session and concept review',
    custom_meet_link: ''
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ sessions: SessionRecord[] }>('/sessions');
      setSessions(data.sessions || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('session_created', () => fetchSessions());
    eventSource.addEventListener('session_updated', () => fetchSessions());
    eventSource.addEventListener('session_completed', () => fetchSessions());

    return () => eventSource.close();
  }, []);

  const openScheduleModal = async () => {
    setIsMeetModalOpen(true);
    setScheduleError('');
    setScheduleSuccess('');
    try {
      const [matchRes, skillsRes] = await Promise.all([
        apiRequest<{ matches: MatchCandidate[] }>('/matching'),
        apiRequest<{ skills: Skill[] }>('/skills')
      ]);
      setCandidates(matchRes.matches || []);
      setSkills(skillsRes.skills || []);

      if (matchRes.matches && matchRes.matches.length > 0) {
        setMeetForm(prev => ({
          ...prev,
          sharer_id: matchRes.matches[0].user_id,
          skill_id: matchRes.matches[0].skill_id
        }));
      } else if (skillsRes.skills && skillsRes.skills.length > 0) {
        setMeetForm(prev => ({
          ...prev,
          skill_id: skillsRes.skills[0].id
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMeetSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetForm.sharer_id || !meetForm.skill_id) {
      setScheduleError('Please select a knowledge sharer and skill topic.');
      return;
    }

    setModalLoading(true);
    setScheduleError('');

    try {
      const [h, m] = meetForm.time.split(':');
      const endHour = (parseInt(h, 10) + 1).toString().padStart(2, '0');
      const endTime = `${endHour}:${m}:00`;

      await apiRequest('/sessions/request', {
        method: 'POST',
        body: JSON.stringify({
          knowledge_sharer_id: meetForm.sharer_id,
          skill_id: meetForm.skill_id,
          session_date: meetForm.date,
          start_time: meetForm.time,
          end_time: endTime,
          learning_goal: meetForm.goal,
          meeting_provider: 'GOOGLE_MEET',
          meet_link: meetForm.custom_meet_link.trim()
        })
      });

      setScheduleSuccess('Google Meet session scheduled successfully!');
      setTimeout(() => {
        setIsMeetModalOpen(false);
        setScheduleSuccess('');
        fetchSessions();
      }, 1200);
    } catch (err: any) {
      setScheduleError(err.message || 'Failed to schedule Google Meet session');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAttachGoogleMeet = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await apiRequest(`/sessions/${sessionId}/google-meet`, {
        method: 'POST',
        body: {}
      });
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to configure Google Meet for session');
    } finally {
      setActionLoading(null);
    }
  };

  const copyMeetLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAccept = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await apiRequest(`/sessions/${sessionId}/accept`, { method: 'POST' });
      fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to accept session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (sessionId: string) => {
    setActionLoading(sessionId);
    try {
      await apiRequest(`/sessions/${sessionId}/reject`, { method: 'POST' });
      fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to reject session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return;
    setActionLoading(sessionId);
    try {
      await apiRequest(`/sessions/${sessionId}/cancel`, { method: 'POST' });
      fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel session');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'requested') return s.status === 'REQUESTED';
    if (filter === 'active') return s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS';
    if (filter === 'completed') return s.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
            My Learning & Sharing Sessions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time peer learning sessions with Google Meet and LiveKit video rooms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openScheduleModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-cyan-500 transition-all flex items-center gap-2"
          >
            <Video className="h-4 w-4" />
            <span>+ Add Google Meet Session</span>
          </button>

          {/* Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-xl">
            {[
              { id: 'all', label: 'All' },
              { id: 'requested', label: 'Requested' },
              { id: 'active', label: 'Active' },
              { id: 'completed', label: 'Completed' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filter === tab.id
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading sessions from cloud database...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 space-y-4">
          <Calendar className="h-10 w-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Sessions in this View</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Schedule a 1-on-1 peer learning session using Google Meet or discovery matching.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={openScheduleModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs flex items-center gap-1.5"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Schedule Google Meet</span>
            </button>
            <button
              onClick={() => navigate('/discover')}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-semibold text-xs hover:bg-slate-700 flex items-center gap-1.5"
            >
              <span>Explore Sharers</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((s) => {
            const isSharer = s.knowledge_sharer_id === user?.user_id;
            const otherName = isSharer ? s.learner_name : s.sharer_name;
            const otherEmail = isSharer ? s.learner_email : s.sharer_email;
            const isMeet = s.meeting_provider === 'GOOGLE_MEET' || !!s.meet_link;

            return (
              <div
                key={s.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="space-y-3 max-w-2xl">
                  {/* Top Status, Role & Meeting Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">{s.skill_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'ACCEPTED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' :
                      s.status === 'IN_PROGRESS' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/40' :
                      s.status === 'COMPLETED' ? 'bg-blue-950 text-blue-300 border border-blue-800/40' :
                      s.status === 'REJECTED' || s.status === 'CANCELLED' ? 'bg-rose-950 text-rose-300 border border-rose-800/40' :
                      'bg-amber-950 text-amber-300 border border-amber-800/40'
                    }`}>
                      {s.status}
                    </span>

                    {isMeet ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 flex items-center gap-1 shadow-sm">
                        <Video className="h-3 w-3 text-emerald-400" />
                        <span>Google Meet</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                        <Video className="h-3 w-3 text-cyan-400" />
                        <span>LiveKit Room</span>
                      </span>
                    )}

                    <span className="text-[11px] font-medium text-slate-400">
                      {isSharer ? '(You are the Knowledge Sharer)' : '(You are the Learner)'}
                    </span>
                  </div>

                  {/* Goal */}
                  <p className="text-xs text-slate-200">
                    <strong className="text-white">Goal:</strong> {s.learning_goal}
                  </p>

                  {/* Metadata & Meet Link Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                        <span>With <strong className="text-white">{otherName}</strong> {otherEmail ? `(${otherEmail})` : ''}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>{s.session_date} at {s.start_time} (60 min)</span>
                      </span>
                      {s.credit_awarded === 1 && (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Coins className="h-3.5 w-3.5" />
                          <span>+1 Time Credit Awarded</span>
                        </span>
                      )}
                    </div>

                    {isMeet && s.meet_link && (
                      <div className="flex items-center gap-2 text-xs bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 w-fit">
                        <span className="text-slate-400">Google Meet URL:</span>
                        <a
                          href={s.meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          {s.meet_link}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          onClick={() => copyMeetLink(s.meet_link!, s.id)}
                          className="ml-1 p-1 rounded text-slate-400 hover:text-white"
                          title="Copy meeting link"
                        >
                          {copiedId === s.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* If requested and I am the knowledge sharer: Accept or Reject */}
                  {s.status === 'REQUESTED' && isSharer && (
                    <>
                      <button
                        onClick={() => handleAccept(s.id)}
                        disabled={actionLoading === s.id}
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold text-xs hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept Session</span>
                      </button>
                      <button
                        onClick={() => handleReject(s.id)}
                        disabled={actionLoading === s.id}
                        className="px-3.5 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors text-xs"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {/* If accepted or in progress */}
                  {(s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS') && (
                    <div className="flex flex-wrap items-center gap-2">
                      {isMeet ? (
                        <>
                          <a
                            href={s.meet_link || 'https://meet.google.com/new'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center gap-1.5"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Launch Google Meet</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            onClick={() => navigate(`/session-room/${s.id}`)}
                            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-200 font-semibold text-xs hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                          >
                            <span>Session Room & Verification</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => navigate(`/session-room/${s.id}`)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-2"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>Join LiveKit Room</span>
                          </button>
                          <button
                            onClick={() => handleAttachGoogleMeet(s.id)}
                            disabled={actionLoading === s.id}
                            className="px-3 py-2 rounded-xl border border-emerald-800/60 bg-emerald-950/40 text-emerald-300 font-semibold text-xs hover:bg-emerald-950/70 transition-colors flex items-center gap-1.5"
                            title="Switch this session to Google Meet"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Google Meet</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* If completed: Rate Session */}
                  {s.status === 'COMPLETED' && (
                    <button
                      onClick={() => navigate('/ratings')}
                      className="px-4 py-2 rounded-xl border border-amber-500/40 bg-amber-950/20 text-amber-300 font-semibold text-xs hover:bg-amber-950/40 transition-colors flex items-center gap-1.5"
                    >
                      <Star className="h-3.5 w-3.5" />
                      <span>Review / Rate Session</span>
                    </button>
                  )}

                  {/* Cancel Button */}
                  {['REQUESTED', 'ACCEPTED'].includes(s.status) && (
                    <button
                      onClick={() => handleCancel(s.id)}
                      disabled={actionLoading === s.id}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors text-xs"
                      title="Cancel session"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Google Meet Session Modal */}
      {isMeetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                    Add Google Meet Session
                  </h3>
                  <p className="text-xs text-slate-400">
                    Schedule a 1-on-1 peer exchange using Google Meet video conferencing
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMeetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {scheduleError && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{scheduleError}</span>
              </div>
            )}

            {scheduleSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Google Meet Scheduled!</h4>
                <p className="text-xs text-slate-300">{scheduleSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleCreateMeetSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Peer Knowledge Sharer *
                  </label>
                  {candidates.length > 0 ? (
                    <select
                      value={meetForm.sharer_id}
                      onChange={(e) => {
                        const cand = candidates.find(c => c.user_id === e.target.value);
                        setMeetForm({
                          ...meetForm,
                          sharer_id: e.target.value,
                          skill_id: cand?.skill_id || meetForm.skill_id
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {candidates.map((c) => (
                        <option key={`${c.user_id}-${c.skill_id}`} value={c.user_id}>
                          {c.full_name} — {c.skill_name} ({c.skill_level})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-400">Loading verified trainers...</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Skill Topic *
                  </label>
                  <select
                    value={meetForm.skill_id}
                    onChange={(e) => setMeetForm({ ...meetForm, skill_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Session Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={meetForm.date}
                      onChange={(e) => setMeetForm({ ...meetForm, date: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={meetForm.time.slice(0, 5)}
                      onChange={(e) => setMeetForm({ ...meetForm, time: e.target.value + ':00' })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Specific Learning Goal *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Master React hooks, state lifting, and practical async API flows..."
                    value={meetForm.goal}
                    onChange={(e) => setMeetForm({ ...meetForm, goal: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Custom Google Meet URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://meet.google.com/xyz-abcd-efg (Leave empty to auto-generate)"
                    value={meetForm.custom_meet_link}
                    onChange={(e) => setMeetForm({ ...meetForm, custom_meet_link: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Video className="h-3.5 w-3.5" />
                    <span>Google Meet Integration Active</span>
                  </div>
                  <p>A secure Google Meet space is created and synced. Duration: 60 minutes = 1 Time Credit upon completion.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsMeetModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all"
                  >
                    {modalLoading ? 'Scheduling...' : 'Schedule Google Meet Session'}
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

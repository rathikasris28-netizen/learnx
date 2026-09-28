import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Sparkles, 
  Filter, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Star, 
  User, 
  ArrowRight, 
  X, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Skill, MatchCandidate } from '../types';

export function DiscoverPage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchCandidate | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('18:00:00');
  const [meetingProvider, setMeetingProvider] = useState<'GOOGLE_MEET' | 'BUILTIN'>('GOOGLE_MEET');
  const [customMeetLink, setCustomMeetLink] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Fetch Skills Catalog
  useEffect(() => {
    let url = `/skills?category=${category}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    apiRequest(url).then((res) => {
      setSkills(res.skills || []);
    }).catch(() => {});
  }, [category, searchQuery]);

  // Fetch initial candidates
  useEffect(() => {
    setLoadingCandidates(true);
    apiRequest('/matching').then((res) => {
      setCandidates(res.matches || []);
    }).catch(() => {}).finally(() => setLoadingCandidates(false));
  }, []);

  // Handle Natural Language AI Search
  const handleNlSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;

    setNlLoading(true);
    try {
      const data = await apiRequest('/search/nl', {
        method: 'POST',
        body: JSON.stringify({ query: nlQuery })
      });
      setCandidates(data.results || []);
    } catch (err: any) {
      alert(err.message || 'AI search failed');
    } finally {
      setNlLoading(false);
    }
  };

  const openBookingModal = (candidate: MatchCandidate) => {
    setSelectedCandidate(candidate);
    setBookingTime(candidate.available_from || '18:00:00');
    setLearningGoal(`Learn ${candidate.skill_name} fundamentals and solve practical exercises.`);
    setBookingSuccess('');
    setBookingError('');
    setBookingModalOpen(true);
  };

  const handleSendBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedCandidate) return;

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');

    try {
      // Calculate 1 hour duration
      const [h, m] = bookingTime.split(':');
      const endHour = (parseInt(h, 10) + 1).toString().padStart(2, '0');
      const endTime = `${endHour}:${m}:00`;

      const res = await apiRequest('/sessions/request', {
        method: 'POST',
        body: JSON.stringify({
          knowledge_sharer_id: selectedCandidate.user_id,
          skill_id: selectedCandidate.skill_id,
          session_date: bookingDate,
          start_time: bookingTime,
          end_time: endTime,
          learning_goal: learningGoal,
          meeting_provider: meetingProvider,
          meet_link: customMeetLink.trim()
        })
      });

      setBookingSuccess(res.message || 'Session request sent successfully!');
      setTimeout(() => {
        setBookingModalOpen(false);
        navigate('/sessions');
      }, 1500);
    } catch (err: any) {
      setBookingError(err.message || 'Failed to send session request.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk']">
          Discover Skills & AI Peer Matching
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Search the catalog or type in natural language to find verified knowledge sharers.
        </p>
      </div>

      {/* Natural Language AI Search Bar */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 p-5 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 mb-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span>Natural Language AI Search</span>
        </div>
        <form onSubmit={handleNlSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="e.g. 'I want to learn Python from a beginner-friendly trainer' or 'Find an English trainer available at 6 PM'"
              className="w-full pl-10 pr-4 py-3 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={nlLoading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{nlLoading ? 'Parsing with AI...' : 'AI Search'}</span>
          </button>
        </form>
      </div>

      {/* Category Tabs & Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
          {(['All', 'Technical', 'Non-Technical'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                category === cat
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Text Filter */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter catalog..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Section 1: Skill Catalog Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
          Skill Catalog ({skills.length} available)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {skills.map((s) => (
            <div
              key={s.id}
              onClick={() => {
                setSearchQuery(s.name);
                apiRequest(`/matching?skill_id=${s.id}`).then(res => setCandidates(res.matches || []));
              }}
              className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-cyan-500/40 cursor-pointer transition-all hover:bg-slate-900/80 group"
            >
              <div className="text-[10px] text-slate-500 font-semibold uppercase">{s.category}</div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 mt-1">{s.name}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                {s.sharers_count ?? 0} active sharers
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: AI Matched Knowledge Sharers */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Verified Knowledge Sharers
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Matched from real platform availability, skill overlap, and reliability scores.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {candidates.length} sharers found
          </span>
        </div>

        {loadingCandidates ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Querying real database and calculating AI matching scores...
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-6 space-y-2">
            <User className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">
              No knowledge sharers currently match the selected criteria.
            </p>
            <p className="text-[11px] text-slate-500">
              Try adjusting your search query or exploring other skills in the catalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((c, idx) => (
              <div
                key={`${c.user_id}-${c.skill_id || ''}-${idx}`}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  {/* Top user header & Match % */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white uppercase">
                        {c.full_name?.slice(0, 2) || 'LX'}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white">{c.full_name}</h3>
                        <p className="text-[10px] text-slate-400">
                          {c.city ? `${c.city}, ` : ''}{c.preferred_language}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-bold text-xs">
                        {c.match_percentage}% Match
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5">Trust: {c.trust_score}%</span>
                    </div>
                  </div>

                  {/* Skill Badge & Availability */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-semibold text-[11px]">
                      {c.skill_name} · {c.skill_level}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      c.availability_status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {c.availability_status} ({c.available_from?.slice(0, 5)} - {c.available_until?.slice(0, 5)})
                    </span>
                  </div>

                  {/* Why Recommended Explanation */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    {c.why_recommended}
                  </p>
                </div>

                {/* Bottom Action */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{Number(c.rating_avg).toFixed(1)}</span>
                    <span className="text-slate-500 font-normal">({c.rating_count} reviews)</span>
                  </div>
                  <button
                    onClick={() => openBookingModal(c)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-sm hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center gap-1.5"
                  >
                    <span>Request Session</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {bookingModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                  Schedule Session with {selectedCandidate.full_name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Topic: {selectedCandidate.skill_name} ({selectedCandidate.skill_level})
                </p>
              </div>
              <button
                onClick={() => setBookingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {bookingError && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Session Requested!</h4>
                <p className="text-xs text-slate-300">
                  {bookingSuccess}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendBookingRequest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Session Date *
                    </label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Start Time (Sharer Active from {selectedCandidate.available_from?.slice(0, 5)}) *
                    </label>
                    <input
                      type="time"
                      value={bookingTime.slice(0, 5)}
                      onChange={(e) => setBookingTime(e.target.value + ':00')}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Meeting Room Format Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Session Video Platform *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMeetingProvider('GOOGLE_MEET')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        meetingProvider === 'GOOGLE_MEET'
                          ? 'border-cyan-500 bg-cyan-950/40 text-white shadow-sm ring-1 ring-cyan-500'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-white">Google Meet</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Auto-generates Google Meet space & syncs with Google Calendar.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMeetingProvider('BUILTIN')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        meetingProvider === 'BUILTIN'
                          ? 'border-cyan-500 bg-cyan-950/40 text-white shadow-sm ring-1 ring-cyan-500'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        <span className="text-white">LearnX LiveKit Room</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Built-in WebRTC video room with integrated peer screen share.
                      </p>
                    </button>
                  </div>
                </div>

                {meetingProvider === 'GOOGLE_MEET' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Custom Google Meet Link (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://meet.google.com/abc-defg-hij (Leave blank to auto-generate)"
                      value={customMeetLink}
                      onChange={(e) => setCustomMeetLink(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    What is your specific learning goal for this 1-hour session? *
                  </label>
                  <textarea
                    rows={3}
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    required
                    placeholder="e.g. Master loops and list comprehensions with practical exercises..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Duration: 60 Minutes (Standard 1 Session = 1 Time Credit)</span>
                  </div>
                  <p>Upon two-way completion confirmation, 1 Time Credit will be minted and awarded to the sharer.</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all"
                  >
                    {bookingLoading ? 'Submitting...' : 'Send Session Request'}
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

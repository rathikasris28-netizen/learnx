import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Sparkles,
  Clock,
  Star,
  User,
  ArrowRight,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Skill, MatchCandidate } from '../types';

export function DiscoverPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
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
  const [selectedCandidate, setSelectedCandidate] =
    useState<MatchCandidate | null>(null);

  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [bookingTime, setBookingTime] = useState('18:00:00');
  const [learningGoal, setLearningGoal] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');

  // Fetch Skills Catalog
  useEffect(() => {
    let cancelled = false;

    const fetchSkills = async () => {
      try {
        let url = `/skills?category=${encodeURIComponent(category)}`;

        if (searchQuery.trim()) {
          url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        }

        const response = await apiRequest<Skill[] | { skills?: Skill[] }>(
          url
        );

        const skillList = Array.isArray(response)
          ? response
          : Array.isArray(response?.skills)
            ? response.skills
            : [];

        if (!cancelled) {
          setSkills(skillList);
        }
      } catch {
        if (!cancelled) {
          setSkills([]);
        }
      }
    };

    fetchSkills();

    return () => {
      cancelled = true;
    };
  }, [category, searchQuery]);

  // Fetch initial candidates
  useEffect(() => {
    let cancelled = false;

    const fetchCandidates = async () => {
      setLoadingCandidates(true);

      try {
        const response = await apiRequest<{
          matches?: MatchCandidate[];
        }>('/matching');

        if (!cancelled) {
          setCandidates(
            Array.isArray(response?.matches) ? response.matches : []
          );
        }
      } catch {
        if (!cancelled) {
          setCandidates([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    fetchCandidates();

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle Natural Language AI Search
  const handleNlSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nlQuery.trim()) return;

    setNlLoading(true);

    try {
      const data = await apiRequest<{
        results?: MatchCandidate[];
      }>('/search/nl', {
        method: 'POST',
        body: {
          query: nlQuery.trim(),
        },
      });

      setCandidates(
        Array.isArray(data?.results) ? data.results : []
      );
    } catch (err: any) {
      alert(err.message || 'AI search failed');
    } finally {
      setNlLoading(false);
    }
  };

  const handleSkillSelect = async (skillId: string, skillName: string) => {
    setSearchQuery(skillName);
    setLoadingCandidates(true);

    try {
      const response = await apiRequest<{
        matches?: MatchCandidate[];
      }>(`/matching?skill_id=${encodeURIComponent(skillId)}`);

      setCandidates(
        Array.isArray(response?.matches) ? response.matches : []
      );
    } catch {
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const openBookingModal = (candidate: MatchCandidate) => {
    setSelectedCandidate(candidate);

    setBookingTime(
      candidate.available_from || '18:00:00'
    );

    setLearningGoal(
      `Learn ${candidate.skill_name} fundamentals and solve practical exercises.`
    );

    setBookingSuccess('');
    setBookingError('');
    setBookingModalOpen(true);
  };

  const calculateEndTime = (startTime: string): string => {
    const [hours, minutes] = startTime
      .split(':')
      .map(Number);

    const startMinutes =
      (Number.isFinite(hours) ? hours : 0) * 60 +
      (Number.isFinite(minutes) ? minutes : 0);

    const endMinutes = (startMinutes + 60) % (24 * 60);

    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    return `${String(endHours).padStart(2, '0')}:${String(
      endMins
    ).padStart(2, '0')}:00`;
  };

  const handleSendBookingRequest = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedCandidate) return;

    if (!selectedCandidate.user_id) {
      setBookingError(
        'This knowledge sharer is not available for session requests.'
      );
      return;
    }

    if (!selectedCandidate.skill_id) {
      setBookingError(
        'The selected skill is not available for this session request.'
      );
      return;
    }

    if (!learningGoal.trim()) {
      setBookingError(
        'Please enter your learning goal.'
      );
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');

    try {
      const endTime = calculateEndTime(bookingTime);

      const response = await apiRequest<{
        message?: string;
      }>('/sessions/request', {
        method: 'POST',
        body: {
          knowledge_sharer_id: selectedCandidate.user_id,
          skill_id: selectedCandidate.skill_id,
          session_date: bookingDate,
          start_time: bookingTime,
          end_time: endTime,
          learning_goal: learningGoal.trim(),
        },
      });

      setBookingSuccess(
        response.message ||
          'Session request sent successfully!'
      );

      setTimeout(() => {
        setBookingModalOpen(false);
        navigate('/sessions');
      }, 1500);
    } catch (err: any) {
      setBookingError(
        err.message ||
          'Failed to send session request.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] tracking-tight">
          Discover Skills & AI Peer Matching
        </h1>

        <p className="text-xs text-slate-400 mt-1">
          Search the catalog or type in natural language to find verified knowledge sharers.
        </p>
      </div>

      {/* Natural Language AI Search Bar */}
      <div className="rounded-2xl border border-[#2F3338] bg-[#0B0F14]/90 p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-48 bg-[#4169E1]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 text-xs font-semibold text-[#4169E1] mb-2.5">
          <Sparkles className="h-4 w-4 text-[#4169E1]" />
          <span className="tracking-wide">Natural Language AI Search</span>
        </div>

        <form
          onSubmit={handleNlSearch}
          className="flex flex-col sm:flex-row gap-3 relative z-10"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />

            <input
              type="text"
              value={nlQuery}
              onChange={(e) =>
                setNlQuery(e.target.value)
              }
              placeholder="e.g. 'I want to learn Python from a beginner-friendly trainer' or 'Find an English trainer available at 6 PM'"
              className="w-full pl-10 pr-4 py-3 text-xs rounded-xl border border-[#2F3338] bg-[#0B0F14] text-white placeholder-slate-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={nlLoading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white font-semibold text-xs shadow-lg shadow-[#4169E1]/20 hover:from-[#5278f2] hover:to-[#1746a2] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="h-3.5 w-3.5" />

            <span>
              {nlLoading
                ? 'Parsing with AI...'
                : 'AI Search'}
            </span>
          </button>
        </form>
      </div>

      {/* Category Tabs & Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0F14] border border-[#2F3338]">
          {(
            ['All', 'Technical', 'Non-Technical'] as const
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                category === cat
                  ? 'bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white shadow-md shadow-[#4169E1]/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#2F3338]/30'
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
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            placeholder="Filter catalog..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#2F3338] bg-[#0B0F14] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
          />
        </div>
      </div>

      {/* Section 1: Skill Catalog Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white font-['Space_Grotesk'] tracking-tight">
          Skill Catalog ({skills.length} available)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {skills.map((skill) => (
            <div
              key={skill.id}
              onClick={() =>
                handleSkillSelect(
                  skill.id,
                  skill.name
                )
              }
              className="p-3 rounded-xl border border-[#2F3338] bg-[#0B0F14]/70 hover:border-[#4169E1]/60 cursor-pointer transition-all hover:bg-[#2F3338]/20 group shadow-sm"
            >
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {skill.category}
              </div>

              <div className="text-xs font-bold text-white group-hover:text-[#4169E1] transition-colors mt-1">
                {skill.name}
              </div>

              <div className="text-[10px] text-slate-400 mt-1">
                {skill.sharers_count ?? 0} active sharers
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: AI Matched Knowledge Sharers */}
      <div className="space-y-4 pt-4 border-t border-[#2F3338]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#4169E1]" />
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
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="inline-block h-6 w-6 rounded-full border-2 border-[#2F3338] border-t-[#4169E1] animate-spin mb-2" />
            <p>Querying real database and calculating AI matching scores...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-[#2F3338] bg-[#0B0F14]/50 p-6 space-y-2">
            <User className="h-8 w-8 text-slate-500 mx-auto" />

            <p className="text-xs text-slate-300 font-medium">
              No knowledge sharers currently match the selected criteria.
            </p>

            <p className="text-[11px] text-slate-500">
              Try adjusting your search query or exploring other skills in the catalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((candidate, index) => (
              <div
                key={`${candidate.user_id}-${candidate.skill_id || ''}-${index}`}
                className="p-5 rounded-2xl border border-[#2F3338] bg-[#0B0F14]/80 hover:border-[#123A8C] transition-all flex flex-col justify-between space-y-4 shadow-md backdrop-blur-sm"
              >
                <div className="space-y-3">
                  {/* Top user header & Match % */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#123A8C] to-[#0B0F14] border border-[#2F3338] flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm">
                        {candidate.full_name?.slice(0, 2) || 'LX'}
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-white">
                          {candidate.full_name}
                        </h3>

                        <p className="text-[10px] text-slate-400">
                          {candidate.city ? `${candidate.city}, ` : ''}
                          {candidate.preferred_language}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#123A8C]/30 border border-[#4169E1]/40 text-[#4169E1] font-bold text-xs">
                        {candidate.match_percentage}% Match
                      </span>

                      <span className="text-[9px] text-slate-400 mt-0.5">
                        Trust: {candidate.trust_score}%
                      </span>
                    </div>
                  </div>

                  {/* Skill Badge & Availability */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-[#2F3338]/60 text-white font-semibold text-[11px] border border-[#2F3338]">
                      {candidate.skill_name} · {candidate.skill_level}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        candidate.availability_status === 'ACTIVE'
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40'
                          : 'bg-[#2F3338]/40 text-slate-400 border border-[#2F3338]'
                      }`}
                    >
                      {candidate.availability_status}{' '}
                      (
                      {candidate.available_from?.slice(0, 5)}{' '}
                      -{' '}
                      {candidate.available_until?.slice(0, 5)}
                      )
                    </span>
                  </div>

                  {/* Why Recommended Explanation */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0F14] p-3 rounded-xl border border-[#2F3338]">
                    {candidate.why_recommended}
                  </p>
                </div>

                {/* Bottom Action */}
                <div className="pt-2 flex items-center justify-between border-t border-[#2F3338] text-xs">
                  <div className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                    <Star className="h-3 w-3 fill-current" />

                    <span>
                      {Number(candidate.rating_avg).toFixed(1)}
                    </span>

                    <span className="text-slate-400 font-normal">
                      ({candidate.rating_count} reviews)
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      openBookingModal(candidate)
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white font-semibold text-xs shadow-sm hover:from-[#5278f2] hover:to-[#1746a2] transition-all flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#2F3338] bg-[#0B0F14] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2F3338] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-['Space_Grotesk']">
                  Schedule Session with {selectedCandidate.full_name}
                </h3>

                <p className="text-[11px] text-slate-400">
                  Topic: {selectedCandidate.skill_name} ({selectedCandidate.skill_level})
                </p>
              </div>

              <button
                onClick={() =>
                  setBookingModalOpen(false)
                }
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#2F3338] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {bookingError && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{bookingError}</span>
              </div>
            )}

            {bookingSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />

                <h4 className="text-sm font-bold text-white">
                  Session Requested!
                </h4>

                <p className="text-xs text-slate-300">
                  {bookingSuccess}
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSendBookingRequest}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Session Date *
                    </label>

                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) =>
                        setBookingDate(e.target.value)
                      }
                      required
                      min={
                        new Date()
                          .toISOString()
                          .split('T')[0]
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#2F3338] bg-[#0B0F14] text-slate-200 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Start Time (Sharer Active from{' '}
                      {selectedCandidate.available_from?.slice(0, 5)}) *
                    </label>

                    <input
                      type="time"
                      value={bookingTime.slice(0, 5)}
                      onChange={(e) =>
                        setBookingTime(
                          `${e.target.value}:00`
                        )
                      }
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#2F3338] bg-[#0B0F14] text-slate-200 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    What is your specific learning goal for this session? *
                  </label>

                  <textarea
                    rows={3}
                    value={learningGoal}
                    onChange={(e) =>
                      setLearningGoal(e.target.value)
                    }
                    required
                    placeholder="e.g. Master loops and list comprehensions with practical exercises..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#2F3338] bg-[#0B0F14] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-all"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#0B0F14] border border-[#2F3338] text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#4169E1] font-semibold">
                    <Clock className="h-3.5 w-3.5" />

                    <span>
                      LearnX private video room · verified session time
                    </span>
                  </div>

                  <p>
                    Both participants confirm completion. Any Time Credits are calculated from verified sharing time.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setBookingModalOpen(false)
                    }
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] text-white font-semibold text-xs shadow-md shadow-[#4169E1]/20 hover:from-[#5278f2] hover:to-[#1746a2] disabled:opacity-50 transition-all"
                  >
                    {bookingLoading
                      ? 'Submitting...'
                      : 'Send Session Request'}
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

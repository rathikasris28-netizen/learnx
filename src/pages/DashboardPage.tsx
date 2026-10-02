import React, { useEffect, useState } from 'react';
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
  Video,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import {
  SessionRecord,
  MatchCandidate,
} from '../types';

export function DashboardPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user, refreshUser } = useAuth();

  const [sessions, setSessions] = useState<
    SessionRecord[]
  >([]);

  const [recommended, setRecommended] = useState<
    MatchCandidate[]
  >([]);

  const [transactions, setTransactions] =
    useState<any[]>([]);

  const [learningProgress, setLearningProgress] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [availabilityStatus, setAvailabilityStatus] =
    useState<string>(
      user?.availability || 'ACTIVE'
    );

  /* =====================================================
     SYNC AVAILABILITY WITH USER
  ===================================================== */

  useEffect(() => {
    if (user?.availability) {
      setAvailabilityStatus(
        user.availability
      );
    }
  }, [user?.availability]);

  /* =====================================================
     LOAD DASHBOARD DATA
  ===================================================== */

  const fetchData = async () => {
    try {
      setLoading(true);

      const [
        sessRes,
        matchRes,
        walletRes,
        progressRes,
      ] = await Promise.all([
        apiRequest('/sessions'),
        apiRequest('/matching'),
        apiRequest('/time-wallet'),
        apiRequest('/progress'),
      ]);

      setSessions(
        Array.isArray(sessRes?.sessions)
          ? sessRes.sessions
          : []
      );

      setRecommended(
        Array.isArray(matchRes?.matches)
          ? matchRes.matches.slice(0, 3)
          : []
      );

      setTransactions(
        Array.isArray(
          walletRes?.transactions
        )
          ? walletRes.transactions
          : []
      );

      setLearningProgress(
        Array.isArray(
          progressRes?.progress
        )
          ? progressRes.progress
          : []
      );
    } catch (error) {
      console.error(
        'Failed to load dashboard data:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* =====================================================
     AVAILABILITY
  ===================================================== */

  const handleToggleAvailability = async (
    newStatus: string
  ) => {
    const previousStatus =
      availabilityStatus;

    setAvailabilityStatus(newStatus);

    try {
      await apiRequest('/availability', {
        method: 'POST',
        body: {
          status: newStatus,
        },
      });

      await refreshUser();
    } catch (error: any) {
      setAvailabilityStatus(
        previousStatus
      );

      alert(
        error?.message ||
          'Failed to update availability'
      );
    }
  };

  /* =====================================================
     SESSION FILTERS
  ===================================================== */

  const upcomingSessions =
    sessions.filter((session) =>
      [
        'REQUESTED',
        'ACCEPTED',
        'IN_PROGRESS',
      ].includes(session.status)
    );

  const completedSessions =
    sessions.filter(
      (session) =>
        session.status === 'COMPLETED'
    );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8 sm:px-6 lg:px-8 bg-[#0B0F14] text-white min-h-screen">
      {/* =================================================
          WELCOME BANNER
      ================================================= */}

      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#2F3338] bg-gradient-to-r from-[#121720] via-[#121720]/80 to-[#123A8C]/20 p-6 sm:p-7 shadow-xl backdrop-blur-md md:flex-row md:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-['Space_Grotesk'] text-xl font-bold text-white sm:text-2xl">
              Hello,{' '}
              {user?.full_name ||
                'Learner'}
            </h1>

            <span className="rounded-full border border-[#4169E1]/30 bg-[#123A8C]/30 px-2.5 py-0.5 text-xs font-semibold text-blue-200">
              {user?.role ===
              'KNOWLEDGE_SHARER'
                ? 'Mentor / Knowledge Sharer'
                : user?.role === 'ADMIN'
                ? 'Admin'
                : 'Learner'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {user?.city
              ? `${user.city}, ${
                  user.state || ''
                } · `
              : ''}
            Preferred:{' '}
            <span className="text-slate-300 font-medium">
              {user?.preferred_language ||
                'English'}
            </span>
          </p>
        </div>

        {/* Sharer Availability Toggle */}
        <div className="flex items-center gap-3 rounded-xl border border-[#2F3338] bg-[#0B0F14] p-2">
          <span className="pl-1 text-xs font-medium text-slate-400">
            Availability:
          </span>

          <div className="flex items-center gap-1">
            {(
              [
                'ACTIVE',
                'INACTIVE',
                'IN_CLASS',
              ] as const
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() =>
                  handleToggleAvailability(
                    status
                  )
                }
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                  availabilityStatus ===
                  status
                    ? status ===
                      'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : status ===
                        'IN_CLASS'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-[#2F3338] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =================================================
          METRICS
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Time Credits */}
        <div
          onClick={() =>
            navigate('/time-wallet')
          }
          className="group cursor-pointer rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-5 shadow-sm transition-all hover:border-[#4169E1]/50 hover:shadow-[0_4px_20px_rgba(18,58,140,0.2)] backdrop-blur-sm"
        >
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Time Wallet
            </span>

            <Coins className="h-4 w-4 text-[#4169E1] transition-transform group-hover:rotate-12" />
          </div>

          <div className="font-['Space_Grotesk'] text-2xl font-bold text-white">
            {user?.wallet_balance ??
              0}{' '}
            <span className="text-xs font-normal text-[#4169E1]">
              TC
            </span>
          </div>

          <p className="mt-1 text-[11px] text-slate-400">
            {user?.total_earned_credits ??
              0}{' '}
            earned · 1 Hour Sharing = 1 TC
          </p>
        </div>

        {/* Total Spent */}
        <div
          onClick={() =>
            navigate('/time-wallet')
          }
          className="cursor-pointer rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-5 shadow-sm transition-all hover:border-amber-500/40 hover:shadow-[0_4px_20px_rgba(245,158,11,0.1)] backdrop-blur-sm"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Spent
          </div>

          <div className="mt-2 font-['Space_Grotesk'] text-2xl font-bold text-white">
            {user?.total_spent_credits ??
              0}{' '}
            <span className="text-xs font-normal text-amber-400">
              TC
            </span>
          </div>

          <p className="mt-1 text-[11px] text-slate-400">
            Used for learning
          </p>
        </div>

        {/* Active Sessions */}
        <div
          onClick={() =>
            navigate('/sessions')
          }
          className="group cursor-pointer rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-5 shadow-sm transition-all hover:border-[#4169E1]/50 hover:shadow-[0_4px_20px_rgba(18,58,140,0.2)] backdrop-blur-sm"
        >
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Sessions
            </span>

            <Calendar className="h-4 w-4 text-[#4169E1] transition-transform group-hover:scale-110" />
          </div>

          <div className="font-['Space_Grotesk'] text-2xl font-bold text-white">
            {upcomingSessions.length}
          </div>

          <p className="mt-1 text-[11px] text-slate-400">
            {completedSessions.length}{' '}
            completed sessions
          </p>
        </div>

        {/* Learning Goals */}
        <div
          onClick={() =>
            navigate('/learning-path')
          }
          className="group cursor-pointer rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)] backdrop-blur-sm"
        >
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Skills Learning
            </span>

            <BookOpen className="h-4 w-4 text-emerald-400 transition-transform group-hover:scale-110" />
          </div>

          <div className="font-['Space_Grotesk'] text-2xl font-bold text-white">
            {user?.learn_skills
              ?.length ?? 0}
          </div>

          <p className="mt-1 text-[11px] text-slate-400 truncate">
            {user?.learn_skills
              ?.map(
                (skill) => skill.name
              )
              .slice(0, 2)
              .join(', ') ||
              'No skills added yet'}
          </p>
        </div>

        {/* Trust Score */}
        <div
          onClick={() =>
            navigate('/profile')
          }
          className="group cursor-pointer rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-5 shadow-sm transition-all hover:border-[#4169E1]/50 hover:shadow-[0_4px_20px_rgba(18,58,140,0.2)] backdrop-blur-sm"
        >
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Trust Score
            </span>

            <ShieldCheck className="h-4 w-4 text-[#4169E1] transition-transform group-hover:scale-110" />
          </div>

          <div className="font-['Space_Grotesk'] text-2xl font-bold text-white">
            {user?.trust_score !=
            null
              ? `${user.trust_score}%`
              : 'Not calculated'}
          </div>

          <p className="mt-1 text-[11px] text-slate-400">
            Reliability:{' '}
            {user?.reliability_score !=
            null
              ? `${user.reliability_score}%`
              : 'Not calculated'}
          </p>
        </div>
      </div>

      {/* =================================================
          RECENT TIME CREDIT TRANSACTIONS
      ================================================= */}

      <section className="rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-5 sm:p-6 shadow-md backdrop-blur-md">
        <div className="mb-3.5 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white font-['Space_Grotesk']">
            Recent Time Credit Transactions
          </h2>

          <button
            type="button"
            onClick={() =>
              navigate('/time-wallet')
            }
            className="text-xs font-semibold text-[#4169E1] hover:text-blue-300 transition-colors"
          >
            View wallet
          </button>
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions
              .slice(0, 3)
              .map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2F3338] bg-[#0B0F14] px-3.5 py-2.5 text-xs"
                >
                  <span className="font-semibold text-slate-200">
                    {transaction.transaction_type}{' '}
                    ·{' '}
                    <span className="text-slate-400 font-normal">{transaction.description}</span>
                  </span>

                  <span
                    className={
                      transaction.amount >
                      0
                        ? 'font-bold text-emerald-400'
                        : 'font-bold text-amber-400'
                    }
                  >
                    {transaction.amount >
                    0
                      ? '+'
                      : ''}
                    {transaction.amount}{' '}
                    TC
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            No transactions yet.
          </p>
        )}
      </section>

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="space-y-6 lg:col-span-2">
          {/* Upcoming Sessions */}
          <div className="rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:p-7 shadow-lg backdrop-blur-md">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4.5 w-4.5 text-[#4169E1]" />

                <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white">
                  Scheduled Learning & Sharing Sessions
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate('/sessions')
                }
                className="flex items-center gap-1 text-xs font-semibold text-[#4169E1] hover:text-blue-300 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-xs text-slate-500 animate-pulse">
                Loading sessions...
              </div>
            ) : upcomingSessions.length ===
              0 ? (
              <div className="space-y-3.5 rounded-2xl border border-dashed border-[#2F3338] bg-[#0B0F14]/50 p-6 py-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-600" />

                <p className="text-xs text-slate-400">
                  No learning sessions yet. Find a skill to start learning.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/discover')
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    Discover Skills
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(
                  (session) => {
                    const isSharer =
                      session.knowledge_sharer_id ===
                      user?.user_id;

                    const otherName =
                      isSharer
                        ? session.learner_name
                        : session.sharer_name;

                    return (
                      <div
                        key={session.id}
                        className="flex flex-col justify-between gap-3.5 rounded-xl border border-[#2F3338] bg-[#0B0F14] p-4 transition-all hover:border-[#4169E1]/40 sm:flex-row sm:items-center shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {
                                session.skill_name
                              }
                            </span>

                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                                session.status ===
                                'ACCEPTED'
                                  ? 'border-emerald-800/40 bg-emerald-950/60 text-emerald-300'
                                  : session.status ===
                                    'IN_PROGRESS'
                                  ? 'border-[#4169E1]/40 bg-[#123A8C]/30 text-blue-200'
                                  : 'border-amber-800/40 bg-amber-950/60 text-amber-300'
                              }`}
                            >
                              {
                                session.status
                              }
                            </span>

                            <span className="text-[10px] text-slate-400">
                              {isSharer
                                ? '(You are Sharing)'
                                : '(You are Learning)'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">
                            With{' '}
                            <strong className="text-white">
                              {otherName}
                            </strong>{' '}
                            · Goal:{' '}
                            <span className="text-slate-400">{session.learning_goal}</span>
                          </p>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3 text-[#4169E1]" />

                            <span>
                              {
                                session.session_date
                              }{' '}
                              at{' '}
                              {
                                session.start_time
                              }{' '}
                              (60 min)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {session.status ===
                            'ACCEPTED' ||
                          session.status ===
                            'IN_PROGRESS' ? (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/session-room/${session.id}`
                                )
                              }
                              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4169E1] to-[#123A8C] px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-[#4169E1]/20 hover:from-[#5278ef] hover:to-[#1746a2] transition-all"
                            >
                              <Video className="h-3.5 w-3.5" />
                              <span>
                                Join LiveKit Room
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  '/sessions'
                                )
                              }
                              className="rounded-xl border border-[#2F3338] bg-[#121720] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-all"
                            >
                              Manage
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* Learning Progress */}
          <div className="space-y-4 rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 sm:p-7 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-['Space_Grotesk'] text-sm font-bold text-white">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                Active Learning Paths
              </h3>

              <button
                type="button"
                onClick={() =>
                  navigate('/learning-path')
                }
                className="text-xs font-semibold text-[#4169E1] hover:text-blue-300 transition-colors"
              >
                View 4-Week Blueprint
              </button>
            </div>

            {!user?.learn_skills ||
            user.learn_skills.length ===
              0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                You haven't selected any learning skills yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {user.learn_skills.map(
                  (skill, index) => {
                    const progress =
                      learningProgress.find(
                        (item) =>
                          item.skill_id ===
                          skill.id
                      );

                    const percentage =
                      Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            progress?.progress_percentage
                          ) || 0
                        )
                      );

                    return (
                      <div
                        key={
                          skill.id ||
                          skill.name ||
                          `learn-${index}`
                        }
                        className="rounded-xl border border-[#2F3338] bg-[#0B0F14] p-4 shadow-xs"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {
                              skill.name
                            }
                          </span>

                          <span className="text-[10px] font-semibold text-[#4169E1] uppercase tracking-wider">
                            {
                              skill.skill_level
                            }
                          </span>
                        </div>

                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#2F3338]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#4169E1] to-[#123A8C]"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                          <span>
                            {percentage >
                            0
                              ? `${percentage}% complete`
                              : 'Not started'}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                '/quizzes'
                              )
                            }
                            className="text-[#4169E1] hover:text-blue-300 hover:underline font-semibold"
                          >
                            Take Assessment
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* AI Recommendations */}
          <div className="space-y-4 rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-['Space_Grotesk'] text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-[#4169E1]" />
                AI Match Recommendations
              </h3>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/recommendations'
                  )
                }
                className="text-xs font-semibold text-[#4169E1] hover:text-blue-300 transition-colors"
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
                {recommended.map(
                  (candidate, index) => (
                    <div
                      key={`${candidate.user_id}-${candidate.skill_id || ''}-${index}`}
                      className="space-y-2 rounded-xl border border-[#2F3338] bg-[#0B0F14] p-3.5 transition-all hover:border-[#4169E1]/50 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#123A8C] to-[#4169E1] text-[10px] font-bold uppercase text-white shadow-xs">
                            {candidate.full_name?.slice(
                              0,
                              2
                            ) || 'LX'}
                          </div>

                          <div>
                            <div className="text-xs font-bold text-white">
                              {
                                candidate.full_name
                              }
                            </div>

                            <div className="text-[10px] text-slate-400">
                              {
                                candidate.skill_name
                              }{' '}
                              (
                              {
                                candidate.skill_level
                              }
                              )
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold text-[#4169E1] bg-[#123A8C]/25 border border-[#4169E1]/30 px-2 py-0.5 rounded-full">
                          {
                            candidate.match_percentage
                          }
                          %
                        </span>
                      </div>

                      <p className="line-clamp-1 text-[11px] text-slate-400 leading-normal">
                        {
                          candidate.why_recommended
                        }
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500">
                          {candidate.available_from?.slice(
                            0,
                            5
                          )}{' '}
                          -{' '}
                          {candidate.available_until?.slice(
                            0,
                            5
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/discover?book=${candidate.user_id}&skill=${candidate.skill_id}`
                            )
                          }
                          className="rounded-lg bg-[#123A8C]/30 border border-[#4169E1]/40 px-2.5 py-1 text-[10px] font-semibold text-blue-200 transition-colors hover:bg-[#123A8C]/50"
                        >
                          Book Session
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Skills You Share */}
          <div className="space-y-3 rounded-2xl border border-[#2F3338] bg-[#121720]/80 p-6 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-['Space_Grotesk'] text-sm font-bold text-white">
                <Share2 className="h-4 w-4 text-[#4169E1]" />
                Skills You Share
              </h3>

              <button
                type="button"
                onClick={() =>
                  navigate('/profile')
                }
                className="text-xs font-semibold text-[#4169E1] hover:text-blue-300 transition-colors"
              >
                Manage
              </button>
            </div>

            {!user?.share_skills ||
            user.share_skills.length ===
              0 ? (
              <p className="py-2 text-xs text-slate-500">
                No sharing skills configured. Add skills to start earning Time Credits.
              </p>
            ) : (
              <div className="space-y-2">
                {user.share_skills.map(
                  (skill, index) => (
                    <div
                      key={
                        skill.id ||
                        skill.name ||
                        `share-${index}`
                      }
                      className="flex items-center justify-between rounded-xl border border-[#2F3338] bg-[#0B0F14] p-3 text-xs"
                    >
                      <span className="font-semibold text-white">
                        {skill.name}
                      </span>

                      <span className="rounded-md border border-[#4169E1]/30 bg-[#123A8C]/30 px-2 py-0.5 text-[10px] text-blue-200 font-semibold">
                        {
                          skill.skill_level
                        }
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
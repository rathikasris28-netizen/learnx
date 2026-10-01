
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
      /*
       * apiRequest() already converts object
       * bodies to JSON.
       *
       * Do NOT use JSON.stringify() here.
       */
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
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8 sm:px-6 lg:px-8">
      {/* =================================================
          WELCOME BANNER
      ================================================= */}

      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-[#0b1329] p-6 shadow-xl backdrop-blur-md md:flex-row md:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-['Space_Grotesk'] text-xl font-bold text-white sm:text-2xl">
              Hello,{' '}
              {user?.full_name ||
                'Learner'}
            </h1>

            <span className="rounded border border-cyan-800/40 bg-cyan-950/60 px-2 py-0.5 text-[11px] font-semibold text-cyan-400">
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
            {user?.preferred_language ||
              'English'}
          </p>
        </div>

        {/* Sharer Availability Toggle */}

        <div className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/80 p-2">
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
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : status ===
                        'IN_CLASS'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-700 text-white shadow-sm'
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
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm transition-all hover:border-cyan-500/40"
        >
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Time Wallet
            </span>

            <Coins className="h-4 w-4 text-cyan-400 transition-transform group-hover:rotate-12" />
          </div>

          <div className="font-['Space_Grotesk'] text-2xl font-bold text-white">
            {user?.wallet_balance ??
              0}{' '}
            <span className="text-xs font-normal text-cyan-400">
              TC
            </span>
          </div>

          <p className="mt-1 text-[11px] text-slate-400">
            {user?.total_earned_credits ??
              0}{' '}
            earned · 1 Hour Sharing = 1
            TC
          </p>
        </div>

        {/* Total Spent */}

        <div
          onClick={() =>
            navigate('/time-wallet')
          }
          className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm transition-all hover:border-amber-500/40"
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
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm transition-all hover:border-cyan-500/40"
        >
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Sessions
            </span>

            <Calendar className="h-4 w-4 text-blue-400 transition-transform group-hover:scale-110" />
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
            navigate('/my-learning')
          }
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm transition-all hover:border-cyan-500/40"
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

          <p className="mt-1 text-[11px] text-slate-400">
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
          className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm transition-all hover:border-cyan-500/40"
        >
          <div className="mb-2 flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Trust Score
            </span>

            <ShieldCheck className="h-4 w-4 text-purple-400 transition-transform group-hover:scale-110" />
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

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white">
            Recent Time Credit
            Transactions
          </h2>

          <button
            type="button"
            onClick={() =>
              navigate('/time-wallet')
            }
            className="text-xs font-semibold text-cyan-300 hover:text-white"
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-slate-200">
                    {transaction.transaction_type}{' '}
                    ·{' '}
                    {transaction.description}
                  </span>

                  <span
                    className={
                      transaction.amount >
                      0
                        ? 'font-bold text-emerald-300'
                        : 'font-bold text-amber-300'
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

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-cyan-400" />

                <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white">
                  Scheduled Learning &
                  Sharing Sessions
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate('/sessions')
                }
                className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:underline"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Loading sessions...
              </div>
            ) : upcomingSessions.length ===
              0 ? (
              <div className="space-y-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 py-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-600" />

                <p className="text-xs text-slate-400">
                  No learning sessions
                  yet. Find a skill to
                  start learning.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/discover')
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-400"
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
                        className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-slate-700 sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {
                                session.skill_name
                              }
                            </span>

                            <span
                              className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                                session.status ===
                                'ACCEPTED'
                                  ? 'border-emerald-800/40 bg-emerald-950 text-emerald-300'
                                  : session.status ===
                                    'IN_PROGRESS'
                                  ? 'border-cyan-800/40 bg-cyan-950 text-cyan-300'
                                  : 'border-amber-800/40 bg-amber-950 text-amber-300'
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
                            {
                              session.learning_goal
                            }
                          </p>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" />

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
                              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-cyan-400 hover:to-blue-500"
                            >
                              <Video className="h-3.5 w-3.5" />
                              <span>
                                Join LiveKit
                                Room
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
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
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

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-['Space_Grotesk'] text-sm font-bold text-white">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                Active Learning
                Paths
              </h3>

              <button
                type="button"
                onClick={() =>
                  navigate('/learning-path')
                }
                className="text-xs font-semibold text-cyan-400 hover:underline"
              >
                View 4-Week Blueprint
              </button>
            </div>

            {!user?.learn_skills ||
            user.learn_skills.length ===
              0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                You haven't selected
                any learning skills
                yet.
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
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            {
                              skill.name
                            }
                          </span>

                          <span className="text-[10px] font-semibold text-cyan-400">
                            {
                              skill.skill_level
                            }
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
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
                            className="text-cyan-400 hover:underline"
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

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-['Space_Grotesk'] text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                AI Match
                Recommendations
              </h3>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/recommendations'
                  )
                }
                className="text-xs font-semibold text-cyan-400 hover:underline"
              >
                All Matches
              </button>
            </div>

            {recommended.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No peer sharers
                currently available
                for your exact skill
                filters.
              </div>
            ) : (
              <div className="space-y-3">
                {recommended.map(
                  (candidate, index) => (
                    <div
                      key={`${candidate.user_id}-${candidate.skill_id || ''}-${index}`}
                      className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 transition-colors hover:border-cyan-500/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold uppercase text-white">
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

                        <span className="text-[11px] font-bold text-cyan-400">
                          {
                            candidate.match_percentage
                          }
                          %
                        </span>
                      </div>

                      <p className="line-clamp-1 text-[11px] text-slate-400">
                        {
                          candidate.why_recommended
                        }
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
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
                          className="rounded bg-cyan-500/20 px-2.5 py-1 text-[10px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/30"
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

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-['Space_Grotesk'] text-sm font-bold text-white">
                <Share2 className="h-4 w-4 text-emerald-400" />
                Skills You Share
              </h3>

              <button
                type="button"
                onClick={() =>
                  navigate('/my-sharing')
                }
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                Manage
              </button>
            </div>

            {!user?.share_skills ||
            user.share_skills.length ===
              0 ? (
              <p className="py-2 text-xs text-slate-500">
                No sharing skills
                configured. Add skills
                to start earning Time
                Credits.
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
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs"
                    >
                      <span className="font-semibold text-white">
                        {skill.name}
                      </span>

                      <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400">
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
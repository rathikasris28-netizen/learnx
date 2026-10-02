
import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import {
  SessionRecord,
  Skill,
  MatchCandidate,
} from '../types';

export function SessionsPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const [sessions, setSessions] =
    useState<SessionRecord[]>([]);

  const [filter, setFilter] =
    useState<string>('all');

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] =
    useState(false);

  const [candidates, setCandidates] =
    useState<MatchCandidate[]>([]);

  const [skills, setSkills] =
    useState<Skill[]>([]);

  const [modalLoading, setModalLoading] =
    useState(false);

  const [scheduleError, setScheduleError] =
    useState('');

  const [scheduleSuccess, setScheduleSuccess] =
    useState('');

  const [sessionForm, setSessionForm] =
    useState({
      sharer_id: '',
      skill_id: '',
      date: new Date()
        .toISOString()
        .split('T')[0],
      time: '18:00:00',
      goal:
        '1-on-1 practical peer coding session and concept review',
    });

  /* =====================================================
     LOAD SESSIONS
  ===================================================== */

  const fetchSessions = async () => {
    try {
      setLoading(true);

      const data =
        await apiRequest<{
          sessions?: SessionRecord[];
        }>('/sessions');

      setSessions(
        Array.isArray(data?.sessions)
          ? data.sessions
          : []
      );
    } catch (error) {
      console.error(
        'Failed to load sessions:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     INITIAL LOAD + REAL-TIME EVENTS
  ===================================================== */

  useEffect(() => {
    fetchSessions();

    /*
     * EventSource is only used when the current
     * frontend is served from the same origin as
     * the backend/API proxy.
     *
     * If the backend is unavailable, the dashboard
     * still works through normal API requests.
     */
    let eventSource: EventSource | null =
      null;

    try {
      eventSource = new EventSource(
        '/api/events'
      );

      const refresh = () => {
        fetchSessions();
      };

      eventSource.addEventListener(
        'session_created',
        refresh
      );

      eventSource.addEventListener(
        'session_updated',
        refresh
      );

      eventSource.addEventListener(
        'session_completed',
        refresh
      );

      eventSource.onerror = () => {
        /*
         * Do not show an error to the user.
         * Normal API loading remains available.
         */
        eventSource?.close();
      };
    } catch (error) {
      console.warn(
        'Real-time session events unavailable:',
        error
      );
    }

    return () => {
      eventSource?.close();
    };
  }, []);

  /* =====================================================
     OPEN REQUEST SESSION MODAL
  ===================================================== */

  const openScheduleModal = async () => {
    setIsScheduleModalOpen(true);
    setScheduleError('');
    setScheduleSuccess('');
    setModalLoading(true);

    try {
      const [
        matchRes,
        skillsRes,
      ] = await Promise.all([
        apiRequest<{
          matches?: MatchCandidate[];
        }>('/matching'),

        apiRequest<
          Skill[] | { skills?: Skill[] }
        >('/skills'),
      ]);

      const availableCandidates =
        Array.isArray(
          matchRes?.matches
        )
          ? matchRes.matches
          : [];

      /*
       * Backend /skills currently returns the
       * skills array directly.
       *
       * This also supports { skills: [...] }
       * in case the response shape changes later.
       */
      const availableSkills =
        Array.isArray(skillsRes)
          ? skillsRes
          : Array.isArray(
              skillsRes?.skills
            )
          ? skillsRes.skills
          : [];

      setCandidates(
        availableCandidates
      );

      setSkills(availableSkills);

      if (
        availableCandidates.length >
        0
      ) {
        const firstCandidate =
          availableCandidates[0];

        setSessionForm((previous) => ({
          ...previous,
          sharer_id:
            firstCandidate.user_id,
          skill_id:
            firstCandidate.skill_id ||
            previous.skill_id,
        }));
      } else if (
        availableSkills.length > 0
      ) {
        setSessionForm((previous) => ({
          ...previous,
          skill_id:
            previous.skill_id ||
            availableSkills[0].id,
        }));
      }
    } catch (error: any) {
      console.error(
        'Failed to load session request data:',
        error
      );

      setScheduleError(
        error?.message ||
          'Failed to load available skills and knowledge sharers.'
      );
    } finally {
      setModalLoading(false);
    }
  };

  /* =====================================================
     CREATE SESSION REQUEST
  ===================================================== */

  const handleCreateSession = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !sessionForm.sharer_id ||
      !sessionForm.skill_id
    ) {
      setScheduleError(
        'Please select a knowledge sharer and skill topic.'
      );
      return;
    }

    if (!sessionForm.date) {
      setScheduleError(
        'Please select a session date.'
      );
      return;
    }

    if (!sessionForm.time) {
      setScheduleError(
        'Please select a session start time.'
      );
      return;
    }

    if (
      !sessionForm.goal.trim()
    ) {
      setScheduleError(
        'Please enter your learning goal.'
      );
      return;
    }

    setModalLoading(true);
    setScheduleError('');
    setScheduleSuccess('');

    try {
      const [
        hours,
        minutes,
      ] = sessionForm.time
        .split(':')
        .map(Number);

      /*
       * Session duration is 60 minutes.
       * This correctly handles midnight:
       *
       * 23:30 -> 00:30
       */
      const startMinutes =
        hours * 60 + minutes;

      const endMinutes =
        (startMinutes + 60) %
        (24 * 60);

      const endHour = Math.floor(
        endMinutes / 60
      )
        .toString()
        .padStart(2, '0');

      const endMinute = (
        endMinutes % 60
      )
        .toString()
        .padStart(2, '0');

      const endTime = `${endHour}:${endMinute}:00`;

      /*
       * apiRequest() already JSON-stringifies
       * object request bodies.
       */
      await apiRequest(
        '/sessions/request',
        {
          method: 'POST',
          body: {
            knowledge_sharer_id:
              sessionForm.sharer_id,

            skill_id:
              sessionForm.skill_id,

            session_date:
              sessionForm.date,

            start_time:
              sessionForm.time,

            end_time: endTime,

            learning_goal:
              sessionForm.goal.trim(),
          },
        }
      );

      setScheduleSuccess(
        'Your LearnX session request was sent.'
      );

      setTimeout(() => {
        setIsScheduleModalOpen(false);
        setScheduleSuccess('');
        fetchSessions();
      }, 1200);
    } catch (error: any) {
      setScheduleError(
        error?.message ||
          'Failed to request the session.'
      );
    } finally {
      setModalLoading(false);
    }
  };

  /* =====================================================
     ACCEPT SESSION
  ===================================================== */

  const handleAccept = async (
    sessionId: string
  ) => {
    setActionLoading(sessionId);

    try {
      await apiRequest(
        `/sessions/${sessionId}/accept`,
        {
          method: 'POST',
        }
      );

      await fetchSessions();
    } catch (error: any) {
      alert(
        error?.message ||
          'Failed to accept session.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =====================================================
     REJECT SESSION
  ===================================================== */

  const handleReject = async (
    sessionId: string
  ) => {
    setActionLoading(sessionId);

    try {
      await apiRequest(
        `/sessions/${sessionId}/reject`,
        {
          method: 'POST',
        }
      );

      await fetchSessions();
    } catch (error: any) {
      alert(
        error?.message ||
          'Failed to reject session.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =====================================================
     CANCEL SESSION
  ===================================================== */

  const handleCancel = async (
    sessionId: string
  ) => {
    if (
      !window.confirm(
        'Are you sure you want to cancel this session?'
      )
    ) {
      return;
    }

    setActionLoading(sessionId);

    try {
      await apiRequest(
        `/sessions/${sessionId}/cancel`,
        {
          method: 'POST',
        }
      );

      await fetchSessions();
    } catch (error: any) {
      alert(
        error?.message ||
          'Failed to cancel session.'
      );
    } finally {
      setActionLoading(null);
    }
  };
    /* =====================================================
     START SESSION
  ===================================================== */

  const handleStart = async (
    sessionId: string
  ) => {
    setActionLoading(sessionId);

    try {
      await apiRequest(
        `/sessions/${sessionId}/start`,
        {
          method: 'POST',
        }
      );

      await fetchSessions();
    } catch (error: any) {
      alert(
        error?.message ||
          'Failed to start session.'
      );
    } finally {
      setActionLoading(null);
    }
  };
    /* =====================================================
     END SESSION
  ===================================================== */

  const handleEnd = async (
    sessionId: string
  ) => {
    if (
      !window.confirm(
        'Are you sure you want to end this session?'
      )
    ) {
      return;
    }

    setActionLoading(sessionId);

    try {
      await apiRequest(
        `/sessions/${sessionId}/end`,
        {
          method: 'POST',
        }
      );

      await fetchSessions();
    } catch (error: any) {
      alert(
        error?.message ||
          'Failed to end session.'
      );
    } finally {
      setActionLoading(null);
    }
  };
    /* =====================================================
     CONFIRM SESSION COMPLETION
  ===================================================== */

  const handleConfirmCompletion = async (
    sessionId: string
  ) => {
    setActionLoading(sessionId);

    try {
      await apiRequest(
        `/sessions/${sessionId}/confirm-completion`,
        {
          method: 'POST',
        }
      );

      await fetchSessions();
    } catch (error: any) {
      alert(
        error?.message ||
          'Failed to confirm session completion.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =====================================================
     FILTER SESSIONS
  ===================================================== */

  const filteredSessions =
    sessions.filter((session) => {
      if (filter === 'requested') {
        return (
          session.status ===
          'REQUESTED'
        );
      }

      if (filter === 'active') {
        return (
          session.status ===
            'ACCEPTED' ||
          session.status ===
            'IN_PROGRESS'
        );
      }

      if (filter === 'completed') {
        return (
          session.status ===
          'COMPLETED'
        );
      }

      return true;
    });

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6 sm:px-6 lg:px-8">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white sm:text-3xl">
            My Learning & Sharing
            Sessions
          </h1>

          <p className="mt-1 text-xs text-slate-400">
            Real-time 1-to-1 learning
            sessions inside LearnX.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={
              openScheduleModal
            }
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-cyan-500"
          >
            <Video className="h-4 w-4" />
            <span>
              + Request a Session
            </span>
          </button>

          {/* Filter */}

          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {[
              {
                id: 'all',
                label: 'All',
              },
              {
                id: 'requested',
                label: 'Requested',
              },
              {
                id: 'active',
                label: 'Active',
              },
              {
                id: 'completed',
                label: 'Completed',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setFilter(tab.id)
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =================================================
          SESSION LIST
      ================================================= */}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Loading sessions from
          cloud database...
        </div>
      ) : filteredSessions.length ===
        0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 py-16 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-600" />

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              No Sessions in this View
            </h3>

            <p className="mx-auto max-w-sm text-xs text-slate-400">
              Request a 1-on-1 peer
              learning session with a
              knowledge sharer.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={
                openScheduleModal
              }
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white"
            >
              <Video className="h-3.5 w-3.5" />
              <span>
                Request Session
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/discover')
              }
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <span>
                Explore Sharers
              </span>

              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map(
            (session) => {
              const isSharer =
                session.knowledge_sharer_id ===
                user?.user_id;

              const otherName =
                isSharer
                  ? session.learner_name
                  : session.sharer_name;

              const otherEmail =
                isSharer
                  ? session.learner_email
                  : session.sharer_email;

              const creditAwarded =
                Number(
                  session.credit_awarded
                ) === 1;

              return (
                <div
                  key={session.id}
                  className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-md transition-all hover:border-slate-700 md:flex-row md:items-center"
                >
                  <div className="max-w-2xl space-y-3">
                    {/* Status */}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {
                          session.skill_name
                        }
                      </span>

                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          session.status ===
                          'ACCEPTED'
                            ? 'border border-emerald-800/40 bg-emerald-950 text-emerald-300'
                            : session.status ===
                              'IN_PROGRESS'
                            ? 'border border-cyan-800/40 bg-cyan-950 text-cyan-300'
                            : session.status ===
                              'COMPLETED'
                            ? 'border border-blue-800/40 bg-blue-950 text-blue-300'
                            : session.status ===
                                'REJECTED' ||
                              session.status ===
                                'CANCELLED'
                            ? 'border border-rose-800/40 bg-rose-950 text-rose-300'
                            : 'border border-amber-800/40 bg-amber-950 text-amber-300'
                        }`}
                      >
                        {
                          session.status
                        }
                      </span>

                      <span className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        <Video className="h-3 w-3 text-blue-400" />
                        <span>
                          LearnX Session
                          Room
                        </span>
                      </span>

                      <span className="text-[11px] font-medium text-slate-400">
                        {isSharer
                          ? '(You are the Knowledge Sharer)'
                          : '(You are the Learner)'}
                      </span>
                    </div>

                    {/* Goal */}

                    <p className="text-xs text-slate-200">
                      <strong className="text-white">
                        Goal:
                      </strong>{' '}
                      {
                        session.learning_goal
                      }
                    </p>

                    {/* Metadata */}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <User className="h-3.5 w-3.5 text-slate-500" />

                        <span>
                          With{' '}
                          <strong className="text-white">
                            {otherName ||
                              'LearnX participant'}
                          </strong>{' '}
                          {otherEmail
                            ? `(${otherEmail})`
                            : ''}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />

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
                      </span>

                      {creditAwarded && (
                        <span className="flex items-center gap-1 font-semibold text-amber-400">
                          <Coins className="h-3.5 w-3.5" />

                          <span>
                            +
                            {(
                              Number(
                                session.duration_seconds ||
                                  0
                              ) / 3600
                            ).toFixed(
                              2
                            )}{' '}
                            Time Credits
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                                    {/* Actions */}

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Accept / Reject */}

                    {session.status ===
                      'REQUESTED' &&
                      isSharer && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleAccept(
                                session.id
                              )
                            }
                            disabled={
                              actionLoading ===
                              session.id
                            }
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />

                            <span>
                              Accept Session
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleReject(
                                session.id
                              )
                            }
                            disabled={
                              actionLoading ===
                              session.id
                            }
                            className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}

                    {/* Start Session */}

                    {session.status ===
                      'ACCEPTED' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStart(
                            session.id
                          )
                        }
                        disabled={
                          actionLoading ===
                          session.id
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                      >
                        <Video className="h-3.5 w-3.5" />

                        <span>
                          Start Session
                        </span>
                      </button>
                    )}

                    {/* Join */}

                    {(session.status ===
                      'ACCEPTED' ||
                      session.status ===
                        'IN_PROGRESS') && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/session-room/${session.id}`
                          )
                        }
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-[#123A8C] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:from-blue-500 hover:to-blue-500"
                      >
                        <Video className="h-3.5 w-3.5" />

                        <span>
                          Join Session
                        </span>
                      </button>
                    )}

                    {/* End Session */}

                    {session.status ===
                      'IN_PROGRESS' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleEnd(
                            session.id
                          )
                        }
                        disabled={
                          actionLoading ===
                          session.id
                        }
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-950/40 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />

                        <span>
                          End Session
                        </span>
                      </button>
                    )}

                    {/* Confirm Completion */}

                    {session.status ===
                      'COMPLETED' &&
                      (
                        session.learner_confirmed ===
                          0 ||
                        session.sharer_confirmed ===
                          0
                      ) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleConfirmCompletion(
                              session.id
                            )
                          }
                          disabled={
                            actionLoading ===
                            session.id
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />

                          <span>
                            Confirm Completion
                          </span>
                        </button>
                      )}

                    {/* Review */}

                    {session.status ===
                      'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            '/ratings'
                          )
                        }
                        className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-950/40"
                      >
                        <Star className="h-3.5 w-3.5" />

                        <span>
                          Review / Rate
                          Session
                        </span>
                      </button>
                    )}

                    {/* Cancel */}

                    {[
                      'REQUESTED',
                      'ACCEPTED',
                    ].includes(
                      session.status
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCancel(
                            session.id
                          )
                        }
                        disabled={
                          actionLoading ===
                          session.id
                        }
                        className="rounded-xl p-2 text-xs text-slate-500 transition-colors hover:bg-slate-800 hover:text-rose-400 disabled:opacity-50"
                        title="Cancel session"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* =================================================
          SESSION REQUEST MODAL
      ================================================= */}

      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-lg space-y-5 rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl">
            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-400">
                  <Video className="h-4 w-4" />
                </div>

                <div>
                  <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                    Request a LearnX
                    Session
                  </h3>

                  <p className="text-xs text-slate-400">
                    Meet your knowledge
                    sharer in the
                    built-in LearnX
                    room
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsScheduleModalOpen(
                    false
                  )
                }
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error */}

            {scheduleError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />

                <span>
                  {scheduleError}
                </span>
              </div>
            )}

            {/* Success */}

            {scheduleSuccess ? (
              <div className="space-y-2 py-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />

                <h4 className="text-sm font-bold text-white">
                  Session Request
                  Sent
                </h4>

                <p className="text-xs text-slate-300">
                  {scheduleSuccess}
                </p>
              </div>
            ) : (
              <form
                onSubmit={
                  handleCreateSession
                }
                className="space-y-4"
              >
                {/* Knowledge Sharer */}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Select Peer
                    Knowledge Sharer *
                  </label>

                  {candidates.length >
                  0 ? (
                    <select
                      required
                      value={
                        sessionForm.sharer_id
                      }
                      onChange={(event) => {
                        const candidate =
                          candidates.find(
                            (item) =>
                              item.user_id ===
                              event.target
                                .value
                          );

                        setSessionForm(
                          (previous) => ({
                            ...previous,
                            sharer_id:
                              event.target
                                .value,
                            skill_id:
                              candidate?.skill_id ||
                              previous.skill_id,
                          })
                        );
                      }}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    >
                      {candidates.map(
                        (candidate) => (
                          <option
                            key={`${candidate.user_id}-${candidate.skill_id}`}
                            value={
                              candidate.user_id
                            }
                          >
                            {
                              candidate.full_name
                            }{' '}
                            —{' '}
                            {
                              candidate.skill_name
                            }{' '}
                            (
                            {
                              candidate.skill_level
                            }
                            )
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No matching
                      knowledge sharers
                      are currently
                      available.
                    </p>
                  )}
                </div>

                {/* Skill */}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Skill Topic *
                  </label>

                  <select
                    required
                    value={
                      sessionForm.skill_id
                    }
                    onChange={(event) =>
                      setSessionForm(
                        (previous) => ({
                          ...previous,
                          skill_id:
                            event.target
                              .value,
                        })
                      )
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    {skills.map(
                      (skill) => (
                        <option
                          key={skill.id}
                          value={skill.id}
                        >
                          {skill.name}
                          {skill.category
                            ? ` (${skill.category})`
                            : ''}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Date + Time */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Session Date *
                    </label>

                    <input
                      type="date"
                      required
                      min={new Date()
                        .toISOString()
                        .split('T')[0]}
                      value={
                        sessionForm.date
                      }
                      onChange={(event) =>
                        setSessionForm(
                          (previous) => ({
                            ...previous,
                            date: event
                              .target
                              .value,
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Start Time *
                    </label>

                    <input
                      type="time"
                      required
                      value={sessionForm.time.slice(
                        0,
                        5
                      )}
                      onChange={(event) =>
                        setSessionForm(
                          (previous) => ({
                            ...previous,
                            time:
                              event.target
                                .value +
                              ':00',
                          })
                        )
                      }
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Learning Goal */}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Specific Learning
                    Goal *
                  </label>

                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Master React hooks, state lifting, and practical async API flows..."
                    value={
                      sessionForm.goal
                    }
                    onChange={(event) =>
                      setSessionForm(
                        (previous) => ({
                          ...previous,
                          goal: event.target
                            .value,
                        })
                      )
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Session Information */}

                <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <Video className="h-3.5 w-3.5" />

                    <span>
                      LearnX video room
                    </span>
                  </div>

                  <p>
                    Both participants
                    join the same
                    private room.
                    Verified sharing
                    time determines
                    Time Credits.
                  </p>
                </div>

                {/* Actions */}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setIsScheduleModalOpen(
                        false
                      )
                    }
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      modalLoading ||
                      candidates.length ===
                        0 ||
                      skills.length === 0
                    }
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                  >
                    {modalLoading
                      ? 'Sending request...'
                      : 'Request Session'}
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

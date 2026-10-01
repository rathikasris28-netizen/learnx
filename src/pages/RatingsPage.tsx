
import React, { useEffect, useState } from 'react';
import {
  Star,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';

interface SessionReview {
  id: string;
  sessionId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number;
  reviewText?: string | null;
  createdAt?: string;

  reviewer?: {
    id?: string;
    fullName?: string;
    full_name?: string;
    email?: string;
  };

  session?: {
    id: string;
    status?: string;
    scheduledStart?: string;
    scheduledEnd?: string;
    skill?: {
      id: string;
      name: string;
    };
    learner?: {
      id: string;
      fullName?: string;
      full_name?: string;
    };
    knowledgeSharer?: {
      id: string;
      fullName?: string;
      full_name?: string;
    };
  };
}

interface SessionItem {
  id: string;
  status?: string;
  scheduledStart?: string;
  scheduledEnd?: string;

  skill?: {
    id: string;
    name: string;
  };

  learner?: {
    id: string;
    fullName?: string;
    full_name?: string;
  };

  knowledgeSharer?: {
    id: string;
    fullName?: string;
    full_name?: string;
  };
}

export function RatingsPage({
  navigate,
}: {
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();

  const [ratings, setRatings] = useState<SessionReview[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [targetSession, setTargetSession] =
    useState<SessionItem | null>(null);

  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getUserId = () => {
    return user?.user_id || user?.id || '';
  };

  const getName = (
    person?:
      | {
          fullName?: string;
          full_name?: string;
        }
      | null
  ) => {
    return (
      person?.fullName ||
      person?.full_name ||
      'Peer'
    );
  };

  const formatDate = (value?: string) => {
    if (!value) return 'Date not available';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const fetchRatingsData = async () => {
    setLoading(true);
    setError('');

    try {
      const [ratingsResponse, sessionsResponse] =
        await Promise.all([
          apiRequest<SessionReview[]>('/ratings'),
          apiRequest<SessionItem[]>('/sessions'),
        ]);

      const ratingList = Array.isArray(ratingsResponse)
        ? ratingsResponse
        : [];

      const sessionList = Array.isArray(sessionsResponse)
        ? sessionsResponse
        : [];

      setRatings(ratingList);
      setSessions(sessionList);
    } catch (err: any) {
      setRatings([]);
      setSessions([]);
      setError(
        err?.message ||
          'Failed to load ratings and sessions.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRatingsData();
  }, []);

  const userId = getUserId();

  const givenRatings = ratings.filter(
    (ratingItem) =>
      ratingItem.reviewerId === userId
  );

  const receivedRatings = ratings.filter(
    (ratingItem) =>
      ratingItem.reviewedUserId === userId
  );

  const ratedSessionIds = new Set(
    givenRatings.map(
      (ratingItem) => ratingItem.sessionId
    )
  );

  const unratedSessions = sessions.filter(
    (session) =>
      session.status === 'COMPLETED' &&
      !ratedSessionIds.has(session.id)
  );

  const openRatingForm = (session: SessionItem) => {
    setTargetSession(session);
    setRating(5);
    setFeedback('');
    setRatingModalOpen(true);
  };

  const closeRatingForm = () => {
    if (submitting) return;

    setRatingModalOpen(false);
    setTargetSession(null);
    setRating(5);
    setFeedback('');
  };

  const handleSubmitRating = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!targetSession) return;

    setSubmitting(true);

    try {
      await apiRequest('/ratings', {
        method: 'POST',
        body: {
          session_id: targetSession.id,
          rating,
          review_text: feedback.trim() || null,
        },
      });

      closeRatingForm();
      await fetchRatingsData();
    } catch (err: any) {
      alert(
        err?.message ||
          'Failed to submit rating.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getOtherParticipant = (
    session: SessionItem
  ) => {
    if (session.learner?.id === userId) {
      return getName(session.knowledgeSharer);
    }

    return getName(session.learner);
  };

  const getReceivedReviewerName = (
    review: SessionReview
  ) => {
    if (review.reviewer) {
      return getName(review.reviewer);
    }

    if (
      review.session?.learner?.id ===
      review.reviewerId
    ) {
      return getName(review.session.learner);
    }

    if (
      review.session?.knowledgeSharer?.id ===
      review.reviewerId
    ) {
      return getName(
        review.session.knowledgeSharer
      );
    }

    return 'Peer';
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
          <Star className="h-6 w-6 text-amber-400 fill-current" />
          Peer Ratings & Reviews
        </h1>

        <p className="text-xs text-slate-400 mt-1">
          Review completed knowledge-exchange sessions
          and see feedback from your peers.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-800/50 bg-rose-950/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            onClick={() => void fetchRatingsData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Pending Ratings */}
      {!loading && unratedSessions.length > 0 && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <Star className="h-4 w-4" />
            <span>
              {unratedSessions.length} completed session
              {unratedSessions.length !== 1
                ? 's'
                : ''}{' '}
              awaiting your review
            </span>
          </div>

          <div className="space-y-2">
            {unratedSessions.map((session) => (
              <div
                key={session.id}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white">
                    {session.skill?.name ||
                      'Knowledge Exchange'}
                  </div>

                  <div className="text-slate-400 mt-1">
                    with {getOtherParticipant(session)}
                  </div>

                  <div className="text-[10px] text-slate-500 mt-1">
                    {formatDate(
                      session.scheduledStart
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    openRatingForm(session)
                  }
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white font-['Space_Grotesk']">
            Feedback Received ({receivedRatings.length})
          </h2>

          <div className="text-[11px] text-slate-500">
            Your reviews: {givenRatings.length}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading feedback...
          </div>
        ) : receivedRatings.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="h-7 w-7 text-slate-600 mx-auto mb-2" />

            <p className="text-xs text-slate-500">
              No feedback received yet.
            </p>

            <p className="text-[11px] text-slate-600 mt-1">
              Complete knowledge-exchange sessions to
              receive peer reviews.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {receivedRatings.map((review) => (
              <div
                key={review.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-white">
                    {getReceivedReviewerName(review)}

                    {review.session?.skill?.name && (
                      <span className="text-slate-400 font-normal">
                        {' '}
                        · {review.session.skill.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-amber-400 font-bold shrink-0">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span>
                      {Number(review.rating).toFixed(1)}
                      /5
                    </span>
                  </div>
                </div>

                {review.reviewText && (
                  <p className="text-slate-300 italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                    "{review.reviewText}"
                  </p>
                )}

                {review.createdAt && (
                  <div className="text-[10px] text-slate-500">
                    {formatDate(review.createdAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {ratingModalOpen && targetSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0f172a] p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white">
                Rate Your Session
              </h3>

              <p className="text-xs text-slate-400 mt-1">
                {targetSession.skill?.name ||
                  'Knowledge Exchange'}{' '}
                with{' '}
                {getOtherParticipant(targetSession)}
              </p>
            </div>

            <form
              onSubmit={handleSubmitRating}
              className="space-y-5 text-xs"
            >
              <div className="space-y-3">
                <div className="text-slate-300 font-semibold">
                  Overall Session Rating
                </div>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setRating(value)
                      }
                      aria-label={`Rate ${value} out of 5`}
                      className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                        rating >= value
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      <Star
                        className={`h-5 w-5 ${
                          rating >= value
                            ? 'fill-current'
                            : ''
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500">
                  {rating}/5 rating selected
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Written Feedback
                </label>

                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(event) =>
                    setFeedback(event.target.value)
                  }
                  placeholder="Share how the knowledge-exchange session went..."
                  className="w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                  maxLength={1000}
                />

                <div className="text-right text-[10px] text-slate-600 mt-1">
                  {feedback.length}/1000
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRatingForm}
                  disabled={submitting}
                  className="px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-md hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
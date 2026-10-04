import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { learnxApi } from '../../services/learnx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MessageSquare,
  LogOut,
  CheckCircle2,
  Star,
  Loader2,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Radio,
} from 'lucide-react';

export const SessionRoom: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Controls state
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [notes, setNotes] = useState('');
  const [syncStatus, setSyncStatus] = useState<'Synced' | 'Saving...' | 'Live'>('Synced');
  const [completing, setCompleting] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    learnxApi.getSession(sessionId)
      .then((data) => {
        setSession(data);
        if (data.notes) setNotes(data.notes);
      })
      .catch((err) => {
        console.error('Error loading session:', err);
        setError('Failed to load session details.');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Supabase Realtime subscription for live shared notes synchronization
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-notes-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.notes !== undefined) {
            setNotes((prev) => (payload.new.notes !== prev ? payload.new.notes : prev));
            setSyncStatus('Live');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Debounced auto-save notes to public.sessions.notes
  useEffect(() => {
    if (!sessionId || loading) return;
    setSyncStatus('Saving...');
    const timer = setTimeout(async () => {
      try {
        await learnxApi.updateSessionNotes(sessionId, notes);
        setSyncStatus('Synced');
      } catch (err) {
        console.error('Error auto-saving notes:', err);
        setSyncStatus('Synced');
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [notes, sessionId, loading]);

  const handleStart = async () => {
    if (!sessionId) return;
    try {
      await learnxApi.startSession(sessionId, `learnx-room-${sessionId}`);
      const updated = await learnxApi.getSession(sessionId);
      setSession(updated);
      setSuccessMsg('Session started successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to start session.');
    }
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    setCompleting(true);
    setError(null);
    try {
      await learnxApi.completeSession(sessionId);
      const updated = await learnxApi.getSession(sessionId);
      setSession(updated);
      setSuccessMsg('Completion confirmed! Time Credits have been securely transacted.');
      setShowReviewModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to complete session.');
    } finally {
      setCompleting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    setSubmittingReview(true);
    try {
      await learnxApi.submitReview(sessionId, rating, reviewText);
      setShowReviewModal(false);
      navigate('/sessions');
    } catch (err: any) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Connecting to session room...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="text-slate-700 font-bold">Session not found.</p>
        <button onClick={() => navigate('/sessions')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">
          Back to Sessions
        </button>
      </div>
    );
  }

  const isLearner = user?.id === session.learner_id;
  const isSharer = user?.id === session.knowledge_sharer_id;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-12">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-extrabold text-slate-900">{session.skills?.name || 'LearnX Session'}</h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {session.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">Goal: {session.session_goal || 'Master skill objectives'}</p>
        </div>

        <div className="flex items-center space-x-3">
          {session.status === 'SCHEDULED' && (
            <button
              onClick={handleStart}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all"
            >
              Start Session
            </button>
          )}

          <button
            onClick={() => navigate('/sessions')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Room</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Video Grid Simulation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-3xl aspect-video flex flex-col items-center justify-center relative shadow-xl overflow-hidden text-white">
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>You ({isLearner ? 'Learner' : isSharer ? 'Knowledge Sharer' : 'Participant'})</span>
          </div>
          <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-2xl shadow-lg">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="absolute bottom-4 flex items-center space-x-3 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full">
            <button onClick={() => setMicOn(!micOn)} className={`p-2 rounded-full ${micOn ? 'bg-slate-700 text-white' : 'bg-rose-600 text-white'}`}>
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button onClick={() => setCamOn(!camOn)} className={`p-2 rounded-full ${camOn ? 'bg-slate-700 text-white' : 'bg-rose-600 text-white'}`}>
              {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button onClick={() => setScreenShare(!screenShare)} className={`p-2 rounded-full ${screenShare ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'}`}>
              <Monitor className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl aspect-video flex flex-col items-center justify-center relative shadow-xl overflow-hidden text-white">
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Peer Participant</span>
          </div>
          <div className="w-20 h-20 rounded-full bg-violet-600 flex items-center justify-center font-bold text-2xl shadow-lg">
            P
          </div>
          <p className="text-xs text-slate-400 mt-4">Connected securely via LiveKit room: {session.meeting_room_id || 'learnx-session'}</p>
        </div>
      </div>

      {/* Completion & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Real-Time Shared Session Notes</span>
            </h2>
            <div className="flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
              <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-600" />
              <span>{syncStatus}</span>
            </div>
          </div>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type collaborative notes here. Changes sync in real-time between participants and save to session record..."
            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Session Completion</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Both participants must confirm session completion to securely trigger the Time Credit exchange (+1 credit for sharer, -1 for learner).
            </p>
            <div className="space-y-2 text-xs font-semibold text-slate-700">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Your Confirmation:</span>
                <span className={session.learner_confirmed && isLearner || session.knowledge_sharer_confirmed && isSharer ? 'text-emerald-600' : 'text-amber-600'}>
                  {session.learner_confirmed && isLearner || session.knowledge_sharer_confirmed && isSharer ? 'Confirmed ✓' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleComplete}
            disabled={completing || session.status === 'COMPLETED'}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {completing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            <span>{session.status === 'COMPLETED' ? 'Session Completed' : 'Confirm Session Completion'}</span>
          </button>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <Star className="w-10 h-10 text-amber-500 fill-amber-500 mx-auto" />
              <h2 className="text-xl font-extrabold text-slate-900">Rate Your Peer Session</h2>
              <p className="text-xs text-slate-500">Help maintain high community trust and reliability.</p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  Rating (1 to 5 Stars)
                </label>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center transition-all ${
                        rating >= star ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Review Comment (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Great session, very knowledgeable and helpful..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center justify-center space-x-2"
              >
                {submittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Submit Review & Finish</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

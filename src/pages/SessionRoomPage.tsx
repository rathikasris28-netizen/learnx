import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Send, 
  Coins, 
  AlertCircle, 
  Sparkles,
  ArrowLeft,
  Users,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Layers
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import confetti from 'canvas-confetti';

export function SessionRoomPage({ 
  sessionId, 
  navigate 
}: { 
  sessionId: string; 
  navigate: (path: string) => void;
}) {
  const { user } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mode: Google Meet vs LiveKit
  const [platformMode, setPlatformMode] = useState<'GOOGLE_MEET' | 'LIVEKIT'>('GOOGLE_MEET');
  const [copiedLink, setCopiedLink] = useState(false);

  // Media Controls for LiveKit
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitConnected, setLiveKitConnected] = useState(false);

  // Timer & Notes
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState('Session Notes & Whiteboard:\n- Key concepts reviewed\n- Exercise solutions\n- Follow-up resources');

  // In-Room Chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'System', text: 'Welcome to your 1-on-1 LearnX peer exchange session.', time: 'Now' }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');

  // Completion State
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [otherConfirmed, setOtherConfirmed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Fetch session details & initialize
  useEffect(() => {
    async function initRoom() {
      try {
        setLoading(true);
        const data = await apiRequest(`/sessions/${sessionId}`);
        if (!data.session) throw new Error('Session not found');
        setSession(data.session);

        if (data.session.meeting_provider === 'GOOGLE_MEET' || data.session.meet_link) {
          setPlatformMode('GOOGLE_MEET');
        } else {
          setPlatformMode('LIVEKIT');
        }

        // Mark session as IN_PROGRESS if not already
        if (data.session.status === 'ACCEPTED') {
          await apiRequest(`/sessions/${sessionId}/start`, { method: 'POST' });
        }

        // Check prior confirmations
        const isSharer = data.session.knowledge_sharer_id === user?.user_id;
        if (isSharer && data.session.sharer_confirmed) setMyConfirmed(true);
        if (!isSharer && data.session.learner_confirmed) setMyConfirmed(true);
        if (isSharer && data.session.learner_confirmed) setOtherConfirmed(true);
        if (!isSharer && data.session.sharer_confirmed) setOtherConfirmed(true);
        if (data.session.status === 'COMPLETED') setCompleted(true);

        // Generate LiveKit Token server-side
        try {
          const tokenData = await apiRequest(`/livekit/token?room=${data.session.room_id}`);
          setLiveKitToken(tokenData.token);
          setLiveKitConnected(true);
        } catch {
          // In Google Meet mode or offline LiveKit token fallback
        }

        // Request local media stream if in LiveKit mode
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          mediaStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } catch {
          // Camera/Mic may be sandbox restricted
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize session room.');
      } finally {
        setLoading(false);
      }
    }

    initRoom();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sessionId, user]);

  // Session timer increment
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to server events for completion confirmation
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('session_confirmed_one_side', (e: any) => {
      const parsed = JSON.parse(e.data || '{}');
      if (parsed.sessionId === sessionId && parsed.confirmedBy !== user?.user_id) {
        setOtherConfirmed(true);
      }
    });

    eventSource.addEventListener('session_completed', (e: any) => {
      const parsed = JSON.parse(e.data || '{}');
      if (parsed.sessionId === sessionId) {
        setCompleted(true);
        setCompletionMessage('Both participants confirmed! 1 Time Credit awarded to Knowledge Sharer.');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    });

    return () => eventSource.close();
  }, [sessionId, user]);

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
    setVideoEnabled(!videoEnabled);
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
    setAudioEnabled(!audioEnabled);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    setChatMessages([
      ...chatMessages,
      {
        sender: user?.full_name?.split(' ')[0] || 'Me',
        text: currentMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setCurrentMessage('');
  };

  const handleConfirmCompletion = async () => {
    try {
      const res = await apiRequest(`/sessions/${sessionId}/confirm-completion`, { method: 'POST' });
      setMyConfirmed(true);
      if (res.completed) {
        setCompleted(true);
        setCompletionMessage(res.message);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to confirm session completion');
    }
  };

  const copyMeetUrl = () => {
    const url = session?.meet_link || `https://meet.google.com/lx-${sessionId.slice(0, 3)}-${sessionId.slice(4, 8)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-xs text-slate-400">
        Connecting to session portal...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
        <h2 className="text-base font-bold text-white">Session Unavailable</h2>
        <p className="text-xs text-slate-400">{error || 'Session could not be located.'}</p>
        <button
          onClick={() => navigate('/sessions')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs hover:bg-slate-700"
        >
          Return to Sessions
        </button>
      </div>
    );
  }

  const isSharer = session.knowledge_sharer_id === user?.user_id;
  const otherPartyName = isSharer ? session.learner_name : session.sharer_name;
  const effectiveMeetUrl = session.meet_link || `https://meet.google.com/lx-${sessionId.slice(0, 3)}-${sessionId.slice(4, 8)}`;

  // Google Calendar add URL
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`LearnX Session: ${session.skill_name}`)}&details=${encodeURIComponent(`LearnX 1-on-1 Peer Session.\nTopic: ${session.skill_name}\nGoal: ${session.learning_goal}\nGoogle Meet link: ${effectiveMeetUrl}`)}&location=${encodeURIComponent(effectiveMeetUrl)}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#070a10]">
      {/* Top Session Bar */}
      <div className="h-14 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sessions')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
            title="Leave Room"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-['Space_Grotesk']">{session.skill_name}</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950 border border-cyan-800/40 px-2 py-0.5 rounded font-mono">
                {session.room_id}
              </span>
              {session.meeting_provider === 'GOOGLE_MEET' && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  <span>Google Meet</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {isSharer ? 'Sharing with' : 'Learning from'} <strong className="text-white">{otherPartyName}</strong> · Goal: {session.learning_goal}
            </p>
          </div>
        </div>

        {/* Live Timer, Platform Toggle & Verification Button */}
        <div className="flex items-center gap-3">
          {/* Switcher */}
          <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <button
              onClick={() => setPlatformMode('GOOGLE_MEET')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                platformMode === 'GOOGLE_MEET'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video className="h-3 w-3" />
              <span>Google Meet</span>
            </button>
            <button
              onClick={() => setPlatformMode('LIVEKIT')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                platformMode === 'LIVEKIT'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>Built-in Room</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Confirm Completion Button */}
          {completed ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Verified Complete · +1 TC</span>
            </div>
          ) : (
            <button
              onClick={handleConfirmCompletion}
              disabled={myConfirmed}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
                myConfirmed
                  ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300 cursor-default'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{myConfirmed ? 'You Confirmed (Waiting for Peer)' : 'Verify Session Complete (+1 TC)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Room Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Google Meet Portal OR LiveKit Videos */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Completion Celebration Banner */}
          {completed && (
            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-white text-sm">Session Successfully Completed!</h4>
                  <p className="text-xs text-emerald-300">{completionMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/ratings')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition-colors"
                >
                  Leave Peer Rating
                </button>
                <button
                  onClick={() => navigate('/time-wallet')}
                  className="px-3 py-1.5 rounded-lg border border-emerald-500/40 text-white hover:bg-emerald-900/40 text-xs transition-colors"
                >
                  View Wallet
                </button>
              </div>
            </div>
          )}

          {platformMode === 'GOOGLE_MEET' ? (
            /* Google Meet Conference Portal */
            <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/70 via-slate-950 to-slate-950 text-center space-y-6 shadow-xl">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Video className="h-10 w-10 text-emerald-400" />
              </div>

              <div className="space-y-2 max-w-md">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Google Meet Video Space Active</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
                  Join Your Peer Video Call
                </h2>
                <p className="text-xs text-slate-300">
                  Connect face-to-face with <strong className="text-white">{otherPartyName}</strong> via Google Meet. Keep this portal open for synchronized session notes, live timing, and Time Credit confirmation.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={effectiveMeetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center gap-2"
                >
                  <Video className="h-5 w-5" />
                  <span>Launch Google Meet Meeting</span>
                  <ExternalLink className="h-4 w-4" />
                </a>

                <button
                  onClick={copyMeetUrl}
                  className="px-4 py-3 rounded-2xl border border-slate-700 bg-slate-800/80 text-slate-200 font-semibold text-xs hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Meet URL'}</span>
                </button>

                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-2xl border border-blue-800/50 bg-blue-950/40 text-blue-300 font-semibold text-xs hover:bg-blue-900/40 transition-colors flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span>Add to Google Calendar</span>
                </a>
              </div>

              {/* Status and Verification Box */}
              <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-left grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Your Verification</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    {myConfirmed ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed Complete
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> In Session
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Peer Verification</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    {otherConfirmed ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Peer Confirmed
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Awaiting Confirmation
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* LiveKit Video Room */
            <>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
                {/* Remote Peer Video Container */}
                <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                  <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-cyan-500/40 flex items-center justify-center text-lg font-bold text-white uppercase shadow-lg">
                    {otherPartyName?.slice(0, 2) || 'PEER'}
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-bold text-white">{otherPartyName}</div>
                    <div className="text-xs text-slate-400">
                      {isSharer ? 'Learner' : 'Knowledge Sharer'} · Connected via LiveKit
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-cyan-400 font-mono flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    LiveKit Peer
                  </div>
                  <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 bg-black/60 px-2 py-1 rounded">
                    Status: {otherConfirmed ? '✓ Confirmed Completion' : 'In Session'}
                  </div>
                </div>

                {/* Local User Video */}
                <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${videoEnabled ? 'block' : 'hidden'}`}
                  />
                  {!videoEnabled && (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-base font-bold text-slate-300 uppercase">
                        {user?.full_name?.slice(0, 2) || 'ME'}
                      </div>
                      <span className="text-xs text-slate-500 mt-2">Camera is paused</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-white">
                    You ({user?.full_name?.split(' ')[0]})
                  </div>
                  <div className="absolute bottom-3 left-3 text-[10px] text-slate-400 bg-black/60 px-2 py-0.5 rounded">
                    {myConfirmed ? '✓ You Confirmed' : 'Not yet confirmed'}
                  </div>
                </div>
              </div>

              {/* Media Control Bar */}
              <div className="h-14 rounded-2xl border border-slate-800 bg-slate-950/80 px-6 flex items-center justify-center gap-4">
                <button
                  onClick={toggleAudio}
                  className={`p-3 rounded-xl transition-colors ${audioEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}
                  title={audioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                  {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-xl transition-colors ${videoEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}
                  title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setScreenSharing(!screenSharing)}
                  className={`p-3 rounded-xl transition-colors ${screenSharing ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                  title="Share Screen"
                >
                  <Monitor className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setPlatformMode('GOOGLE_MEET')}
                  className="px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span>Switch to Google Meet</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar: Chat & Collaborative Notes */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800/80 bg-slate-950 flex flex-col">
          {/* Notes Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/40">
            <span className="text-xs font-bold text-white block">Shared Notes & Whiteboard</span>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record shared peer code, algorithm solutions, or takeaways..."
              className="w-full mt-2 p-2 text-[11px] rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* In-Room Text Chat */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <span className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
              In-Room Peer Chat
            </span>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {chatMessages.map((m, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-semibold text-cyan-300">{m.sender}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="text-slate-200">{m.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type in chat..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

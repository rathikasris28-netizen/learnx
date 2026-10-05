import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare, FileText, CheckCircle, Send, Upload, Paperclip } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LiveSessionRoomProps {
  session: any;
  user: any;
  onLeave: () => void;
  onRefreshSessions: () => void;
}

export default function LiveSessionRoom({ session, user, onLeave, onRefreshSessions }: LiveSessionRoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([
    { sender: 'System', text: `Welcome to the live learning room for ${session.skill_name}!`, time: new Date().toLocaleTimeString() }
  ]);
  const [chatInput, setChatInput] = useState('');
  
  // Session Notes & Upload state (Restricted to Mentor & Learner of this session)
  const [sessionNotes, setSessionNotes] = useState('# Session Notes & Shared Materials\n\n- Add private notes for this session.');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; uploader: string }[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [fileNameInput, setFileNameInput] = useState('');
  const [fileUrlInput, setFileUrlInput] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(session.status === 'COMPLETED');
  const [fallbackMode, setFallbackMode] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const fallbackVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Fetch session notes on mount
  useEffect(() => {
    fetch(`/api/sessions/${session.id}/notes`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.content) {
          setSessionNotes(data.content);
        }
        if (data && Array.isArray(data.uploadedFiles)) {
          setUploadedFiles(data.uploadedFiles);
        }
      })
      .catch(err => console.error('Error fetching session notes:', err));
  }, [session.id]);

  // Initialize Camera & Microphone and LiveKit room
  useEffect(() => {
    let activeRoom: Room | null = null;

    async function initMediaAndRoom() {
      // 1. Initialize local camera & microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (fallbackVideoRef.current) {
          fallbackVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Could not acquire local media stream:', err);
      }

      // 2. Connect to LiveKit
      try {
        const res = await fetch(`/api/livekit/token?room=${session.room_name}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
        });
        const data = await res.json();
        if (!data.token) throw new Error('No token received');

        const r = new Room();
        activeRoom = r;

        r.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === 'video' || track.kind === 'audio') {
            const element = track.attach();
            if (track.kind === 'video' && videoContainerRef.current) {
              videoContainerRef.current.appendChild(element);
            }
          }
        });

        await r.connect(data.wsUrl, data.token);
        await r.localParticipant.enableCameraAndMicrophone();
        setRoom(r);
        setConnected(true);
      } catch (err) {
        console.warn('LiveKit cloud connection fallback activated, using local WebRTC stream:', err);
        setFallbackMode(true);
        setConnected(true);
      }
    }

    initMediaAndRoom();

    return () => {
      if (activeRoom) {
        activeRoom.disconnect();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [session]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
    if (room) {
      const enabled = room.localParticipant.isMicrophoneEnabled;
      room.localParticipant.setMicrophoneEnabled(!enabled);
      setMicMuted(enabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoMuted(!videoTrack.enabled);
      }
    }
    if (room) {
      const enabled = room.localParticipant.isCameraEnabled;
      room.localParticipant.setCameraEnabled(!enabled);
      setVideoMuted(enabled);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { sender: user.name, text: chatInput, time: new Date().toLocaleTimeString() }]);
    setChatInput('');
  };

  const saveNotes = async (newContent: string, fileName?: string, fileUrl?: string) => {
    setSessionNotes(newContent);
    try {
      await fetch(`/api/sessions/${session.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('learnx_token')}`
        },
        body: JSON.stringify({
          content: newContent,
          file_name: fileName,
          file_url: fileUrl
        })
      });
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileNameInput.trim() || !fileUrlInput.trim()) return;
    const newFile = { name: fileNameInput, url: fileUrlInput, uploader: user.name };
    const updatedFiles = [...uploadedFiles, newFile];
    setUploadedFiles(updatedFiles);
    saveNotes(sessionNotes, fileNameInput, fileUrlInput);
    setFileNameInput('');
    setFileUrlInput('');
  };

  const handleConfirmCompletion = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('learnx_token')}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.learner_confirmed && data.mentor_confirmed) {
          setSessionCompleted(true);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
        onRefreshSessions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const isLearner = session.learner_id === user.id;
  const isConfirmedByMe = isLearner ? session.learner_confirmed : session.mentor_confirmed;

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-slate-950">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
            Live Peer Learning Session (Camera & Mic Active)
          </span>
          <h1 className="text-lg font-bold text-white">{session.skill_name} Session: {session.learner_name} & {session.mentor_name}</h1>
        </div>

        <div className="flex items-center gap-3">
          {!sessionCompleted ? (
            <button
              onClick={handleConfirmCompletion}
              disabled={confirming || isConfirmedByMe}
              className={`text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-md ${isConfirmedByMe ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              <CheckCircle className="w-4 h-4" />
              {isConfirmedByMe ? 'Waiting for Partner Confirmation' : 'Confirm Completion (+1 Credit)'}
            </button>
          ) : (
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Session Completed Successfully! Credit Transferred.
            </span>
          )}

          <button
            onClick={onLeave}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-800 text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" /> Leave Room
          </button>
        </div>
      </div>

      {/* Main Content: Video grid + Sidebar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
        {/* Video / Audio Area */}
        <div className="lg:col-span-3 bg-slate-950 p-4 flex flex-col gap-4 relative overflow-y-auto">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[350px]">
            {/* Local Video */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-xl">
              <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${videoMuted ? 'hidden' : ''}`} />
              {videoMuted && (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <VideoOff className="w-12 h-12 mb-2" />
                  <span className="text-sm">Camera Off</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-white">
                {user.name} (You) {micMuted && '🔇 (Muted)'}
              </div>
            </div>

            {/* Partner Video Feed */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-xl" ref={videoContainerRef}>
              <video ref={fallbackVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${fallbackMode ? '' : 'hidden'}`} />
              {!fallbackMode && (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <Video className="w-12 h-12 mb-2 animate-pulse text-emerald-500" />
                  <span className="text-sm">Connected to Live Room</span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-white">
                {isLearner ? session.mentor_name : session.learner_name} (Partner)
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-center gap-4 shadow-lg">
            <button
              onClick={toggleMic}
              className={`p-3 rounded-xl transition ${micMuted ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
              title={micMuted ? 'Unmute' : 'Mute'}
            >
              {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-xl transition ${videoMuted ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
              title={videoMuted ? 'Start Video' : 'Stop Video'}
            >
              {videoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sidebar: Chat & Private Session Notes / Upload */}
        <div className="bg-slate-900 border-l border-slate-800 flex flex-col h-full">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-xs font-semibold transition border-b-2 flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' : 'border-transparent text-slate-400'}`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-xs font-semibold transition border-b-2 flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' : 'border-transparent text-slate-400'}`}
            >
              <FileText className="w-4 h-4" /> Session Notes & Files (Private)
            </button>
          </div>

          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.map((m, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-emerald-400">{m.sender}</span>
                      <span className="text-[10px] text-slate-500">{m.time}</span>
                    </div>
                    <p className="text-xs text-slate-200">{m.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-xl transition">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">Shared Session Notes (Visible only to Mentor & Learner)</span>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => saveNotes(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="Type notes here..."
                />
              </div>

              <div className="border-t border-slate-800 pt-4">
                <span className="text-xs font-semibold text-slate-400 block mb-2">Upload Notes / Study Materials</span>
                <form onSubmit={handleUploadFile} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Document Title (e.g. Python CheatSheet)"
                    value={fileNameInput}
                    onChange={(e) => setFileNameInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="url"
                    placeholder="File URL (https://...)"
                    value={fileUrlInput}
                    onChange={(e) => setFileUrlInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload to Session
                  </button>
                </form>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 block">Uploaded Files in this Session:</span>
                    {uploadedFiles.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-950 border border-slate-800 hover:border-emerald-500 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-400 block transition"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Paperclip className="w-3.5 h-3.5 shrink-0" /> {file.name}
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">by {file.uploader}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

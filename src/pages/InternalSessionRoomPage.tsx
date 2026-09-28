import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { ArrowLeft, CheckCircle2, Clock3, LoaderCircle, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Send, Video, VideoOff } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type RoomTrack = { key: string; identity: string; name: string; kind: string; source: string; track: any };

function TrackOutput({ track, audio = false }: { track: any; audio?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current || !track) return;
    const element = track.attach();
    element.autoplay = true;
    if (element instanceof HTMLVideoElement) element.playsInline = true;
    container.current.replaceChildren(element);
    return () => {
      track.detach(element);
      element.remove();
    };
  }, [track]);
  return <div ref={container} className={audio ? 'hidden' : 'absolute inset-0 [&>video]:h-full [&>video]:w-full [&>video]:object-cover'} />;
}

export function InternalSessionRoomPage({ sessionId, navigate }: { sessionId: string; navigate: (path: string) => void }) {
  const { user } = useAuth();
  const roomRef = useRef<Room | null>(null);
  const [session, setSession] = useState<any>(null);
  const [tracks, setTracks] = useState<RoomTrack[]>([]);
  const [connected, setConnected] = useState(false);
  const [remotePresent, setRemotePresent] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [notes, setNotes] = useState('');
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [peerConfirmed, setPeerConfirmed] = useState(false);
  const [working, setWorking] = useState(false);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [outputId, setOutputId] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  const isSharer = session?.knowledge_sharer_id === user?.user_id;
  const ownId = user?.user_id;
  const peerId = isSharer ? session?.learner_id : session?.knowledge_sharer_id;
  const ownName = user?.full_name || 'You';
  const peerName = isSharer ? session?.learner_name : session?.sharer_name;
  const ownVideo = tracks.find((item) => item.identity === ownId && item.kind === 'video' && item.source === Track.Source.Camera);
  const peerVideo = tracks.find((item) => item.identity === peerId && item.kind === 'video' && item.source === Track.Source.Camera);
  const screenTrack = tracks.find((item) => item.kind === 'video' && item.source === Track.Source.ScreenShare);
  const peerAudio = tracks.filter((item) => item.identity === peerId && item.kind === 'audio');

  const addTrack = (track: any, participant: any) => {
    const source = String(track.source || 'unknown');
    const key = `${participant.identity}:${source}:${track.sid || track.mediaStreamTrack?.id || track.kind}`;
    setTracks((current) => [...current.filter((item) => !(item.identity === participant.identity && item.source === source)), {
      key, identity: participant.identity, name: participant.name || participant.identity, kind: track.kind, source, track
    }]);
  };

  useEffect(() => {
    let disposed = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const refresh = async () => {
      const data = await apiRequest(`/sessions/${sessionId}`);
      if (disposed) return;
      setSession(data.session);
      const sharer = data.session.knowledge_sharer_id === user?.user_id;
      setMyConfirmed(Boolean(sharer ? data.session.sharer_confirmed : data.session.learner_confirmed));
      setPeerConfirmed(Boolean(sharer ? data.session.learner_confirmed : data.session.sharer_confirmed));
    };
    const initialize = async () => {
      try {
        const details = await apiRequest(`/sessions/${sessionId}`);
        if (disposed) return;
        const record = details.session;
        if (!['ACCEPTED', 'IN_PROGRESS'].includes(record.status) || record.ended_at) {
          setSession(record);
          setError('This session is not currently open for joining.');
          return;
        }
        const [joined, noteData, chatData] = await Promise.all([
          apiRequest(`/sessions/${sessionId}/join`, { method: 'POST' }),
          apiRequest(`/sessions/${sessionId}/notes`),
          apiRequest(`/sessions/${sessionId}/chat`)
        ]);
        if (disposed) return;
        setSession(joined.session);
        setNotes(noteData.note.content || '');
        setNotesLoaded(true);
        setMessages(chatData.messages || []);

        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;
        room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => addTrack(track, participant));
        room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
          setTracks((current) => current.filter((item) => !(item.identity === participant.identity && item.track === track)));
        });
        room.on(RoomEvent.TrackPublished, (publication, participant) => {
          if (publication.track) addTrack(publication.track, participant);
        });
        room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
          if (publication.track) setTracks((current) => current.filter((item) => !(item.identity === participant.identity && item.track === publication.track)));
        });
        room.on(RoomEvent.ParticipantConnected, () => setRemotePresent(true));
        room.on(RoomEvent.ParticipantDisconnected, () => setRemotePresent(room.remoteParticipants.size > 0));
        room.on(RoomEvent.ConnectionStateChanged, (state) => setConnected(state === 'connected'));
        await room.connect(joined.livekit_url, joined.token);
        if (disposed) return;
        setConnected(true);
        setRemotePresent(room.remoteParticipants.size > 0);
        const presence = await apiRequest(`/sessions/${sessionId}/connected`, { method: 'POST' });
        setSession(presence.session);
        try {
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch {
          setError('Connected. Allow camera and microphone access to publish media.');
        }
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setOutputs(devices.filter((device) => device.kind === 'audiooutput'));
        }
        await refresh();
        poll = setInterval(() => {
          refresh().catch(() => {});
          apiRequest(`/sessions/${sessionId}/chat`).then((data) => setMessages(data.messages || [])).catch(() => {});
        }, 3000);
      } catch (cause: any) {
        if (!disposed) setError(cause.message || 'Unable to connect to the LearnX session room.');
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    initialize();
    return () => {
      disposed = true;
      if (poll) clearInterval(poll);
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [sessionId, user?.user_id]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!session?.started_at) return setSeconds(0);
      const start = Date.parse(session.started_at);
      const stop = session.ended_at ? Date.parse(session.ended_at) : Date.now();
      setSeconds(Math.max(0, Math.floor((stop - start) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.started_at, session?.ended_at]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => {
    if (!outputId) return;
    document.querySelectorAll('video, audio').forEach((element) => {
      const media = element as HTMLMediaElement & { setSinkId?: (deviceId: string) => Promise<void> };
      media.setSinkId?.(outputId).catch(() => {});
    });
  }, [outputId, tracks]);

  const formatTime = (value: number) => [Math.floor(value / 3600), Math.floor((value % 3600) / 60), value % 60]
    .map((part) => String(part).padStart(2, '0')).join(':');
  const connectedRoom = connected && !session?.ended_at;
  const peerJoined = isSharer ? Boolean(session?.learner_joined_at) : Boolean(session?.sharer_joined_at);
  const verified = session?.session_stage === 'VERIFIED' || session?.status === 'COMPLETED';

  const toggleCamera = async () => { const next = !cameraOn; await roomRef.current?.localParticipant.setCameraEnabled(next); setCameraOn(next); };
  const toggleMic = async () => { const next = !micOn; await roomRef.current?.localParticipant.setMicrophoneEnabled(next); setMicOn(next); };
  const toggleShare = async () => { const next = !sharing; await roomRef.current?.localParticipant.setScreenShareEnabled(next); setSharing(next); };
  const leave = () => { roomRef.current?.disconnect(); navigate('/sessions'); };

  const endSession = async () => {
    setWorking(true);
    try {
      await apiRequest(`/sessions/${sessionId}/end`, { method: 'POST' });
      roomRef.current?.disconnect();
      setConnected(false);
      const data = await apiRequest(`/sessions/${sessionId}`);
      setSession(data.session);
    } catch (cause: any) { setError(cause.message || 'Could not end this session.'); }
    finally { setWorking(false); }
  };

  const confirmCompletion = async () => {
    setWorking(true);
    try {
      const result = await apiRequest(`/sessions/${sessionId}/confirm-completion`, { method: 'POST' });
      setMyConfirmed(true);
      if (result.completed) setSession((current: any) => ({ ...current, status: 'COMPLETED', session_stage: 'VERIFIED', credit_awarded: result.credits_awarded > 0 ? 1 : 0 }));
    } catch (cause: any) { setError(cause.message || 'Could not confirm completion.'); }
    finally { setWorking(false); }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = messageText.trim();
    if (!message) return;
    setMessageText('');
    try {
      await apiRequest(`/sessions/${sessionId}/chat`, { method: 'POST', body: { message } });
      const data = await apiRequest(`/sessions/${sessionId}/chat`);
      setMessages(data.messages || []);
    } catch (cause: any) { setError(cause.message || 'Message could not be sent.'); setMessageText(message); }
  };

  const saveNotes = async () => {
    try { await apiRequest(`/sessions/${sessionId}/notes`, { method: 'PUT', body: { content: notes } }); }
    catch (cause: any) { setError(cause.message || 'Notes could not be saved.'); }
  };

  if (loading) return <div className="flex min-h-[70vh] items-center justify-center gap-2 text-sm text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" />Connecting to your LearnX room</div>;
  if (error && !session) return <div className="mx-auto max-w-lg px-6 py-20 text-center"><p className="text-sm text-rose-300">{error}</p><button onClick={() => navigate('/sessions')} className="mt-5 rounded-md bg-slate-800 px-4 py-2 text-sm text-white">Return to Sessions</button></div>;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#080c12] text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0d131b] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={leave} title="Leave session room" className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h1 className="truncate text-sm font-bold text-white">{session?.skill_name}</h1><span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">{session?.session_stage || session?.status}</span></div><p className="mt-0.5 truncate text-xs text-slate-400">{ownName} · {peerName} · {session?.learning_goal}</p></div>
        </div>
        <div className="flex items-center gap-3"><span className={`inline-flex items-center gap-1.5 text-xs ${connectedRoom ? 'text-emerald-300' : 'text-amber-300'}`}><span className={`h-2 w-2 rounded-full ${connectedRoom ? 'bg-emerald-400' : 'bg-amber-400'}`} />{connectedRoom ? remotePresent ? 'Both connected' : 'Waiting for participant' : session?.ended_at ? 'Session ended' : 'Connecting'}</span><div className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs"><Clock3 className="h-3.5 w-3.5 text-cyan-300" />{formatTime(seconds)}</div></div>
      </header>
      {error && session && <div role="status" className="border-b border-amber-700/50 bg-amber-950/40 px-4 py-2 text-xs text-amber-200">{error}</div>}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px]">
        <main className="flex min-h-0 flex-col gap-3 p-3 sm:gap-4 sm:p-5">
          <section className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Learning goal</p><p className="mt-1 text-sm font-semibold text-white">{session?.learning_goal}</p><p className="mt-0.5 text-xs text-slate-400">{session?.skill_name}{session?.skill_category ? ` · ${session.skill_category}` : ''}</p></div><p className="shrink-0 text-right text-xs text-slate-400">{session?.session_date}<br />{session?.start_time}</p></section>
          {screenTrack && <div className="relative min-h-48 flex-1 overflow-hidden rounded-md border border-cyan-700/50 bg-black"><TrackOutput track={screenTrack.track} /><span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 text-xs">Shared screen · {screenTrack.name}</span></div>}
          <section className="grid min-h-[280px] flex-1 grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Session participants">
            <div className="relative min-h-[220px] overflow-hidden rounded-md border border-slate-700 bg-[#111923]">
              {peerVideo ? <TrackOutput track={peerVideo.track} /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-cyan-100">{peerName?.slice(0, 1)?.toUpperCase()}</div><div><p className="text-sm font-semibold text-white">{peerName}</p><p className="mt-1 text-xs text-slate-400">{peerJoined ? 'Camera is off' : 'Waiting for participant to join'}</p></div></div>}
              {peerAudio.map((item) => <TrackOutput key={item.key} track={item.track} audio />)}
              <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs text-white">{peerName}<span className="ml-1 text-slate-300">· {isSharer ? 'Learner' : 'Knowledge sharer'}</span></span><span className={`absolute right-3 top-3 rounded px-2 py-1 text-[10px] ${peerJoined ? 'bg-emerald-950/80 text-emerald-200' : 'bg-slate-900/80 text-slate-300'}`}>{peerJoined ? 'Joined' : 'Not joined'}</span>
            </div>
            <div className="relative min-h-[220px] overflow-hidden rounded-md border border-slate-700 bg-[#111923]">
              {cameraOn && ownVideo ? <TrackOutput track={ownVideo.track} /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-white">{ownName.slice(0, 1).toUpperCase()}</div><p className="text-xs text-slate-400">{cameraOn ? 'Starting camera' : 'Camera is off'}</p></div>}
              <span className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs text-white">{ownName}<span className="ml-1 text-slate-300">· {isSharer ? 'Knowledge sharer' : 'Learner'}</span></span><span className={`absolute right-3 top-3 rounded px-2 py-1 text-[10px] ${connectedRoom ? 'bg-emerald-950/80 text-emerald-200' : 'bg-slate-900/80 text-slate-300'}`}>{connectedRoom ? 'Connected' : 'Offline'}</span>
            </div>
          </section>
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-800 pt-3">
            <button onClick={() => void toggleMic()} disabled={!connectedRoom} title={micOn ? 'Turn microphone off' : 'Turn microphone on'} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-700 text-white'}`}>{micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}<span className="hidden sm:inline">Mic</span></button>
            <button onClick={() => void toggleCamera()} disabled={!connectedRoom} title={cameraOn ? 'Turn camera off' : 'Turn camera on'} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${cameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-700 text-white'}`}>{cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}<span className="hidden sm:inline">Camera</span></button>
            <button onClick={() => void toggleShare()} disabled={!connectedRoom} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${sharing ? 'bg-cyan-700 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}><MonitorUp className="h-4 w-4" />{sharing ? 'Stop sharing' : 'Share screen'}</button>
            {outputs.length > 1 && <select aria-label="Audio output" value={outputId} onChange={(event) => setOutputId(event.target.value)} className="max-w-36 rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-200"><option value="">System audio</option>{outputs.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Speaker'}</option>)}</select>}
            <button onClick={leave} className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"><PhoneOff className="h-4 w-4" />Leave</button>
            {!session?.ended_at && <button onClick={() => void endSession()} disabled={working || !session?.started_at} className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50">{working ? 'Ending…' : 'End session'}</button>}
          </div>
          {session?.ended_at && <section className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3"><div><p className="text-sm font-semibold text-white">{verified ? 'Session verified' : 'Confirm Session Completion'}</p><p className="mt-1 text-xs text-slate-400">Both participant confirmations are required.</p></div>{verified ? <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" />Verified</span> : <button onClick={() => void confirmCompletion()} disabled={working || myConfirmed} className="rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">{myConfirmed ? 'Confirmed · Waiting for partner' : 'Confirm Session Completion'}</button>}<p className="w-full text-[11px] text-slate-400">{peerConfirmed ? 'Partner confirmed' : 'Waiting for partner confirmation'}{verified && session?.credit_awarded ? ` · ${Number(session.duration_seconds / 3600).toFixed(2)} Time Credits verified` : ''}</p></section>}
        </main>

        <aside className="grid min-h-[560px] grid-rows-[minmax(0,1fr)_minmax(190px,0.8fr)] border-t border-slate-800 bg-[#0c121a] lg:min-h-0 lg:border-l lg:border-t-0">
          <section className="flex min-h-[250px] flex-col border-b border-slate-800"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><h2 className="flex items-center gap-2 text-xs font-semibold text-white"><MessageSquare className="h-4 w-4 text-cyan-300" />Session chat</h2><span className="text-[10px] text-slate-500">Participants only</span></div><div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">{messages.map((item) => <article key={item.id} className="rounded-md border border-slate-800 bg-slate-900/70 p-2.5"><div className="mb-1 flex justify-between gap-2 text-[10px]"><span className="font-semibold text-cyan-200">{item.sender_name}</span><time className="text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</time></div><p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">{item.message}</p></article>)}<div ref={chatEnd} /></div><form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-800 p-3"><input value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={4000} placeholder="Message your partner" className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none" /><button type="submit" title="Send message" className="rounded-md bg-cyan-700 p-2 text-white hover:bg-cyan-600"><Send className="h-4 w-4" /></button></form></section>
          <section className="flex min-h-[190px] flex-col"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><h2 className="text-xs font-semibold text-white">My private session notes</h2><span className="text-[10px] text-slate-500">Only visible to you</span></div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={() => notesLoaded && void saveNotes()} maxLength={20000} placeholder="Capture your takeaways and next steps…" className="min-h-[130px] flex-1 resize-none bg-transparent p-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none" /></section>
        </aside>
      </div>
    </div>
  );
}
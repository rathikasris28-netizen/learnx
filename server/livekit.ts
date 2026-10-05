import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

export const LIVEKIT_URL = process.env.LIVEKIT_URL;

if (!LIVEKIT_API_KEY) {
  throw new Error('[LearnX] Missing LIVEKIT_API_KEY environment variable');
}

if (!LIVEKIT_API_SECRET) {
  throw new Error('[LearnX] Missing LIVEKIT_API_SECRET environment variable');
}

if (!LIVEKIT_URL) {
  throw new Error('[LearnX] Missing LIVEKIT_URL environment variable');
}

export async function createLiveKitToken(params: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
}): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: params.participantIdentity,
    name: params.participantName,
    ttl: '3h'
  });

  at.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return await at.toJwt();
}

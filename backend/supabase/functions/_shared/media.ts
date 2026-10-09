import { AccessToken, RoomServiceClient } from 'npm:livekit-server-sdk@2.19.1';
import { env } from './client.ts';

export interface Permissions { microphone: boolean; camera: boolean; screenShare: boolean; chat: boolean }

export function sources(permissions: Permissions) {
  // LiveKit TrackSource enum: CAMERA=1, MICROPHONE=2, SCREEN_SHARE=3, SCREEN_SHARE_AUDIO=4.
  const allowed: number[] = [];
  if (permissions.camera) allowed.push(1);
  if (permissions.microphone) allowed.push(2);
  if (permissions.screenShare) allowed.push(3, 4);
  return allowed;
}

export function mediaPermission(permissions: Permissions) {
  const allowed = sources(permissions);
  return { canSubscribe: true, canPublish: allowed.length > 0, canPublishSources: allowed, canPublishData: false,
    hidden: false, recorder: false, canUpdateMetadata: false, canSubscribeMetrics: false };
}

export function rooms() {
  return new RoomServiceClient(env('LIVEKIT_URL').replace(/^wss:/, 'https:').replace(/^ws:/, 'http:'), env('LIVEKIT_API_KEY'), env('LIVEKIT_API_SECRET'));
}

export async function roomToken(meetingId: string, userId: string, displayName: string, permissions: Permissions, ttl = 60) {
  const token = new AccessToken(env('LIVEKIT_API_KEY'), env('LIVEKIT_API_SECRET'), { identity: userId, name: displayName, ttl });
  token.addGrant({ room: meetingId, roomJoin: true, ...mediaPermission(permissions) });
  return { token: await token.toJwt(), serverUrl: env('LIVEKIT_URL'), expiresIn: ttl };
}

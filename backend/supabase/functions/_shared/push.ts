import { env } from './client.ts';
let cached: { token: string; expires: number } | undefined;
const encode = (value: Uint8Array | string) => btoa(typeof value === 'string' ? value : String.fromCharCode(...value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
async function accessToken() {
  if (cached && cached.expires > Date.now() + 300000) return cached.token;
  const account = JSON.parse(env('FCM_SERVICE_ACCOUNT_JSON'));
  if (account.project_id !== env('FIREBASE_PROJECT_ID')) throw new Error('Push project mismatch');
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = encode(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = account.private_key.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const unsigned = header + '.' + claims;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + encode(new Uint8Array(signature)) }),
  });
  if (!response.ok) throw new Error('Push authorization failed');
  const result = await response.json();
  cached = { token: result.access_token, expires: Date.now() + result.expires_in * 1000 };
  return cached.token;
}
export function pushMessage(token: string, platform: string, data: Record<string, string>) {
  const message: Record<string, unknown> = { token, data };
  if (platform === 'android') message.android = {
    priority: 'HIGH', ttl: '3600s',
    notification: { title: 'Conference invitation', body: 'You have a new meeting invitation. Open Conference to respond.', channel_id: 'conference_invites', tag: data.notificationId },
  };
  return message;
}
export async function sendPush(token: string, platform: string, data: Record<string, string>): Promise<'sent' | 'expired'> {
  const response = await fetch('https://fcm.googleapis.com/v1/projects/' + env('FIREBASE_PROJECT_ID') + '/messages:send', {
    method: 'POST', headers: { Authorization: 'Bearer ' + await accessToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: pushMessage(token, platform, data) }),
  });
  if (response.ok) return 'sent';
  const result = await response.json().catch(() => ({}));
  if (result.error?.details?.some((detail: { errorCode?: string }) => detail.errorCode === 'UNREGISTERED')) return 'expired';
  if (response.status === 401) cached = undefined;
  throw new Error('Push delivery failed (' + response.status + ')');
}
export async function deliverInvitationPush(client: ReturnType<typeof import('./client.ts').adminClient>, notificationId: string) {
  const { data: notice, error } = await client.from('notifications').select('id,user_id,meeting_id,invitation_id,is_read').eq('id', notificationId).maybeSingle();
  if (error) throw error;
  if (!notice || notice.is_read) return;
  const [invitation, meeting, devices] = await Promise.all([
    client.from('invitations').select('status').eq('id', notice.invitation_id).maybeSingle(),
    client.from('meetings').select('status').eq('id', notice.meeting_id).maybeSingle(),
    client.from('push_tokens').select('token,platform').eq('user_id', notice.user_id),
  ]);
  if (invitation.error || meeting.error || devices.error) throw new Error('Push lookup failed');
  if (invitation.data?.status !== 'pending' || !meeting.data || ['ended', 'cancelled'].includes(meeting.data.status)) return;
  for (const device of devices.data || []) {
    if (!['android', 'web'].includes(device.platform)) continue;
    const result = await sendPush(device.token, device.platform, { userId: notice.user_id, meetingId: notice.meeting_id, notificationId: notice.id, kind: 'meeting_invitation' });
    if (result === 'expired') {
      const removed = await client.from('push_tokens').delete().eq('user_id', notice.user_id).eq('token', device.token);
      if (removed.error) throw removed.error;
    }
  }
}

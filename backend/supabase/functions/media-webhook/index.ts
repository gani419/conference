import { WebhookReceiver } from 'npm:livekit-server-sdk@2.19.1';
import { adminClient, env } from '../_shared/client.ts';
import { rooms, mediaPermission, type Permissions } from '../_shared/media.ts';

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  let event;
  try {
    event = await new WebhookReceiver(env('LIVEKIT_API_KEY'), env('LIVEKIT_API_SECRET'))
      .receive(await request.text(), request.headers.get('Authorization') || '');
  } catch { return new Response('Invalid webhook', { status: 401 }); }
  try {
    if (event.event === 'participant_joined' && event.room && event.participant) {
      const client = adminClient();
      const { data: meeting, error: meetingError } = await client.from('meetings').select('status,expires_at').eq('id', event.room.name).maybeSingle();
      const { data: participant, error } = await client.from('participants').select('status,permissions').eq('meeting_id', event.room.name).eq('user_id', event.participant.identity).maybeSingle();
      if (meetingError || error) return new Response('Retry', { status: 503 });
      if (meeting?.status !== 'live' || (meeting.expires_at && new Date(meeting.expires_at).getTime() <= Date.now()) || participant?.status !== 'in_meeting') await rooms().removeParticipant(event.room.name, event.participant.identity);
      else await rooms().updateParticipant(event.room.name, event.participant.identity, { permission: mediaPermission(participant.permissions as Permissions) });
    }
    if (event.event === 'participant_left' && event.room && event.participant) {
      const client = adminClient();
      const { data: meeting, error } = await client.from('meetings').select('status').eq('id', event.room.name).maybeSingle();
      if (error) return new Response('Retry', { status: 503 });
      if (meeting?.status === 'live') {
        // Ignore delayed leave events if the same identity has already reconnected.
        let connected: Awaited<ReturnType<ReturnType<typeof rooms>['listParticipants']>>;
        try { connected = await rooms().listParticipants(event.room.name); }
        catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'not_found') connected = [];
          else throw error;
        }
        if (!connected.some(person => person.identity === event.participant!.identity)) {
          const { error: presenceError } = await client.rpc('conference_media_left', { mid: event.room.name, uid: event.participant.identity, event_time: new Date(Number(event.createdAt) * 1000).toISOString() });
          if (presenceError) return new Response('Retry', { status: 503 });
        }
      }
    }
    return new Response('OK');
  } catch { return new Response('Retry', { status: 503 }); }
});

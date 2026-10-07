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
      const { data: meeting, error: meetingError } = await client.from('meetings').select('status').eq('id', event.room.name).maybeSingle();
      const { data: participant, error } = await client.from('participants').select('status,permissions').eq('meeting_id', event.room.name).eq('user_id', event.participant.identity).maybeSingle();
      if (meetingError || error) return new Response('Retry', { status: 503 });
      if (meeting?.status !== 'live' || participant?.status !== 'in_meeting') await rooms().removeParticipant(event.room.name, event.participant.identity);
      else await rooms().updateParticipant(event.room.name, event.participant.identity, { permission: mediaPermission(participant.permissions as Permissions) });
    }
    return new Response('OK');
  } catch { return new Response('Retry', { status: 503 }); }
});

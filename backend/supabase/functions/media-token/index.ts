import { authenticate, endpoint, HttpError } from '../_shared/client.ts';
import { roomToken, type Permissions } from '../_shared/media.ts';

Deno.serve(endpoint(async request => {
  const { client, user } = await authenticate(request);
  const { meetingId } = await request.json();
  if (typeof meetingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(meetingId)) throw new HttpError(400, 'INVALID_MEETING_ID');
  const { data: meeting, error: meetingError } = await client.from('meetings').select('status').eq('id', meetingId).maybeSingle();
  const { data: participant, error } = await client.from('participants').select('status,permissions,display_name').eq('meeting_id', meetingId).eq('user_id', user.id).maybeSingle();
  if (meetingError || error || meeting?.status !== 'live' || participant?.status !== 'in_meeting') throw new HttpError(403, 'NOT_ADMITTED');
  // No host or room-admin grants ever reach a client. Media permissions come from the database.
  return await roomToken(meetingId, user.id, participant.display_name, participant.permissions as Permissions);
}));

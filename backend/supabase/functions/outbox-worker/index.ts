import { deliverInvitationPush } from '../_shared/push.ts';
import { adminClient, endpoint, env, HttpError } from '../_shared/client.ts';
import { rooms, mediaPermission, type Permissions } from '../_shared/media.ts';

async function verifyWorker(request: Request) {
  const supplied = request.headers.get('Authorization') || '';
  const expected = `Bearer ${env('BACKEND_WORKER_SECRET')}`;
  const encode = new TextEncoder();
  const a = new Uint8Array(await crypto.subtle.digest('SHA-256', encode.encode(supplied)));
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', encode.encode(expected)));
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (difference) throw new HttpError(401, 'UNAUTHORIZED_WORKER');
}

function notFound(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'not_found';
}

Deno.serve(endpoint(async request => {
  await verifyWorker(request);
  const client = adminClient();
  const { data: jobs, error } = await client.rpc('claim_backend_jobs');
  if (error) throw new Error('Job claim failed');
  let delivered = 0;
  let failed = 0;
  for (const job of jobs || []) {
    try {
      if (job.kind === 'invitation_push') {
        await deliverInvitationPush(client, job.payload.notificationId);
      } else if (job.kind === 'invitation_email') {
        const { data: invite, error: inviteError } = await client.from('invitations').select('status,email').eq('id', job.payload.invitationId).maybeSingle();
        if (inviteError) throw inviteError;
        if (invite?.status === 'pending') {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json', 'Idempotency-Key': `conference-invite-${job.id}` },
            body: JSON.stringify({ from: env('EMAIL_FROM'), to: [invite.email], subject: `Meeting invitation: ${job.payload.title}`,
              text: `You are invited to ${job.payload.title}. Open Conference and enter meeting code ${job.payload.code}. Admission is controlled by the host.` }),
          });
          if (!response.ok) throw new Error('Email delivery failed');
        }
      } else if (['media_sync', 'media_remove', 'media_close'].includes(job.kind)) {
        const service = rooms();
        const { data: meeting, error: meetingError } = await client.from('meetings').select('status').eq('id', job.meeting_id).maybeSingle();
        if (meetingError) throw meetingError;
        if (!meeting || ['ended', 'cancelled'].includes(meeting.status)) {
          try { await service.deleteRoom(job.meeting_id); } catch (error) { if (!notFound(error)) throw error; }
        } else {
          const { data: participants, error: participantError } = await client.from('participants').select('user_id,status,permissions').eq('meeting_id', job.meeting_id);
          if (participantError) throw participantError;
          let connected: Awaited<ReturnType<typeof service.listParticipants>>;
          try { connected = await service.listParticipants(job.meeting_id); } catch (error) { if (!notFound(error)) throw error; connected = []; }
          for (const remote of connected) {
            const participant = participants?.find((p: { user_id: string; status: string; permissions: Permissions }) => p.user_id === remote.identity);
            try {
              if (!participant || participant.status !== 'in_meeting') await service.removeParticipant(job.meeting_id, remote.identity);
              else await service.updateParticipant(job.meeting_id, remote.identity, { permission: mediaPermission(participant.permissions as Permissions) });
            } catch (error) { if (!notFound(error)) throw error; }
          }
        }
      }
      if (!['invitation_push', 'invitation_email', 'media_sync', 'media_remove', 'media_close'].includes(job.kind)) throw new Error('Unsupported job');
      const { error: ackError } = await client.rpc('complete_backend_job', { job_id: job.id, attempt: job.attempts });
      if (ackError) throw ackError;
      delivered++;
    } catch {
      // The lease expires so a later worker retries. Do not log email addresses or credentials.
      failed++;
    }
  }
  return { delivered, failed };
}));

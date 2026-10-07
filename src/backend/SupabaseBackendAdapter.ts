import type { BackendAdapter } from './BackendAdapter';
import type { ApiResult, RequestContext, PageRequest } from '../types/common';
import type { Meeting, MeetingSummary } from '../types/meeting';
import type { Session } from '../types/auth';
import { supabase } from './supabaseClient';
import { PUBLIC_ENV } from '../config/publicEnvironment.generated';
import * as model from './supabaseModels';

type Input<K extends keyof BackendAdapter> = Parameters<BackendAdapter[K]>[0];
class BackendError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
const previews = new Map<string, Meeting>();
export function clearMeetingPreviews() {
  previews.clear();
}

export async function hostedRequest<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new BackendError('Please sign in again', 401);
  const response = await fetch(
    `${PUBLIC_ENV.SUPABASE_URL}/functions/v1/${path}`,
    {
      method: 'POST',
      signal: signal as unknown as NonNullable<
        Parameters<typeof fetch>[1]
      >['signal'],
      headers: {
        'Content-Type': 'application/json',
        apikey: PUBLIC_ENV.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify(body),
    },
  );
  const json = (await response.json()) as model.Row;
  if (!response.ok)
    throw new BackendError(
      json.error || json.message || 'Backend request failed',
      response.status,
    );
  return json as T;
}
export async function conferenceCommand(action: string, payload: unknown) {
  return (
    await hostedRequest<{ data: model.Row }>('conference-api', {
      mode: 'command',
      action,
      payload,
    })
  ).data;
}
export async function restoreHostedSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  const check = await supabase.auth.getUser();
  if (check.error || !check.data.user) {
    // Preserve the SDK refresh session during network failures, but never fabricate tokens.
    if (check.error?.status === 0 || (check.error?.status || 0) >= 500)
      throw check.error;
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }
  const profile = await supabase
    .from('profiles')
    .select('display_name,avatar_id')
    .eq('id', check.data.user.id)
    .single();
  if (profile.error) throw profile.error;
  return model.appSession(
    { ...data.session, user: check.data.user },
    profile.data,
  );
}

export class SupabaseBackendAdapter implements BackendAdapter {
  private async run<T>(
    ctx: RequestContext,
    work: () => Promise<T>,
  ): Promise<ApiResult<T>> {
    try {
      return {
        success: true,
        data: await work(),
        requestId: ctx.requestId,
        serverTime: new Date().toISOString(),
      };
    } catch (error) {
      const status = error instanceof BackendError ? error.status : 0;
      return {
        success: false,
        requestId: ctx.requestId,
        serverTime: new Date().toISOString(),
        error: {
          code:
            status === 401
              ? 'UNAUTHENTICATED'
              : status === 403
              ? 'FORBIDDEN'
              : status === 409
              ? 'CONFLICT'
              : status === 400
              ? 'VALIDATION_ERROR'
              : 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Request failed',
          fieldErrors: [],
        },
      };
    }
  }
  private async call(
    action: string,
    payload: unknown,
    ctx: RequestContext,
    mode = 'command',
  ): Promise<model.Row> {
    return (
      await hostedRequest<{ data: model.Row }>(
        'conference-api',
        { mode, action, payload },
        ctx.signal,
      )
    ).data;
  }
  private async read(
    action: string,
    payload: unknown,
    ctx: RequestContext,
  ): Promise<model.Row[]> {
    return (await this.call(
      action,
      payload,
      ctx,
      'read',
    )) as unknown as model.Row[];
  }
  private async userId() {
    return (await supabase.auth.getSession()).data.session?.user.id || '';
  }
  private async detail(id: string, ctx: RequestContext) {
    try {
      return model.meeting(
        await this.call('meeting_details', { meetingId: id }, ctx, 'read'),
      );
    } catch (error) {
      if (
        error instanceof BackendError &&
        [400, 403].includes(error.status) &&
        previews.has(id)
      )
        return previews.get(id)!;
      throw error;
    }
  }
  login(payload: Input<'login'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      if (payload.identifier.kind !== 'email')
        throw new BackendError('Use email and password to sign in');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.identifier.email,
        password: payload.password,
      });
      if (error || !data.session)
        throw new BackendError(error?.message || 'Login failed', 401);
      return { session: model.appSession(data.session) };
    });
  }
  register(payload: Input<'register'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      if (payload.identifier.kind !== 'email')
        throw new BackendError('Use an email address to register');
      const { data, error } = await supabase.auth.signUp({
        email: payload.identifier.email,
        password: payload.password,
        options: {
          data: {
            displayName: payload.displayName,
            avatarId: payload.avatarId,
          },
        },
      });
      if (error || !data.session)
        throw new BackendError(
          error?.message || 'Account creation did not issue a session',
        );
      const session = model.appSession(data.session);
      if (session.kind !== 'registered')
        throw new BackendError('Registered account required');
      return {
        user: session.user,
        session,
        verificationId: '',
        verificationExpiresAt: '',
      };
    });
  }
  guestLogin(payload: Input<'guestLogin'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            displayName: payload.displayName,
            avatarId: payload.avatarId,
          },
        },
      });
      if (error || !data.session)
        throw new BackendError(error?.message || 'Guest access failed');
      const session = model.appSession(data.session);
      if (session.kind !== 'guest')
        throw new BackendError('Guest account required');
      return { session };
    });
  }
  verifyContact(_payload: Input<'verifyContact'>, ctx: RequestContext) {
    return this.run<{ session: Session }>(ctx, async () => {
      throw new BackendError('Email verification is disabled');
    });
  }
  resendVerificationCode(_id: string, ctx: RequestContext) {
    return this.run<boolean>(ctx, async () => {
      throw new BackendError('Email verification is disabled');
    });
  }
  forgotPassword(_payload: Input<'forgotPassword'>, ctx: RequestContext) {
    return this.run<
      Awaited<ReturnType<BackendAdapter['forgotPassword']>> extends ApiResult<
        infer T
      >
        ? T
        : never
    >(ctx, async () => {
      throw new BackendError(
        'Password recovery will be available after email delivery is configured',
      );
    });
  }
  resetPassword(_payload: Input<'resetPassword'>, ctx: RequestContext) {
    return this.run<{ success: boolean }>(ctx, async () => {
      throw new BackendError('Password recovery is not configured');
    });
  }
  getCurrentUser(ctx: RequestContext) {
    return this.run(ctx, async () => {
      const session = await restoreHostedSession();
      if (!session) throw new BackendError('Please sign in again', 401);
      return session.user;
    });
  }
  listMeetings(page: PageRequest, ctx: RequestContext) {
    return this.run(ctx, async () => {
      const rows = await this.read(
        'meetings',
        {
          limit: Math.min(page.pageSize, 100),
          offset: (page.page - 1) * page.pageSize,
        },
        ctx,
      );
      const uid = await this.userId();
      const items = rows.map(row => model.meetingItem(row, uid));
      return {
        items,
        page: page.page,
        pageSize: page.pageSize,
        totalItems: (page.page - 1) * page.pageSize + items.length,
        hasMore: items.length === Math.min(page.pageSize, 100),
      };
    });
  }
  getUpcomingMeetings(ctx: RequestContext) {
    return this.run(ctx, async () => {
      const rows = await this.read('meetings', {}, ctx);
      const uid = await this.userId();
      return rows
        .filter(r => ['scheduled', 'live'].includes(r.status))
        .map(r => model.meetingItem(r, uid))
        .sort((a, b) =>
          a.scheduledStartTime.localeCompare(b.scheduledStartTime),
        );
    });
  }
  getRecentMeetings(ctx: RequestContext) {
    return this.run(ctx, async () => {
      const rows = await this.read('meetings', {}, ctx);
      const uid = await this.userId();
      return rows
        .filter(r => ['ended', 'cancelled'].includes(r.status))
        .map(r => model.meetingItem(r, uid));
    });
  }
  getMeetingDetails(id: string, ctx: RequestContext) {
    return this.run(ctx, () => this.detail(id, ctx));
  }
  createMeeting(payload: Input<'createMeeting'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      if (payload.invitees.some(i => !i.email))
        throw new BackendError(
          'Each invitee needs an email address. Share the meeting code with phone-only contacts.',
        );
      const row = await this.call('create_meeting', payload, ctx);
      return { meeting: await this.detail(row.id, ctx) };
    });
  }
  updateMeeting(payload: Input<'updateMeeting'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      if (payload.invitees.some(i => !i.email))
        throw new BackendError(
          'Each invitee needs an email address. Share the meeting code with phone-only contacts.',
        );
      const row = await this.call('update_meeting', payload, ctx);
      return { meeting: await this.detail(row.id, ctx) };
    });
  }
  cancelMeeting(payload: Input<'cancelMeeting'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      const row = await this.call('cancel_meeting', payload, ctx);
      return {
        meetingId: row.id as string,
        status: 'cancelled' as const,
        updatedAt: row.updated_at as string,
      };
    });
  }
  resolveMeeting(payload: Input<'resolveMeeting'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      const code =
        payload.codeOrLink.trim().split(/[/?#]/).filter(Boolean).pop() || '';
      const row = await this.call('resolve_meeting', { code }, ctx);
      const m = model.meeting(row);
      previews.set(m.id, m);
      return {
        meeting: m,
        eligibleToJoin: Boolean(row.eligible_to_join),
        reason: row.is_locked ? 'Meeting is locked' : undefined,
      };
    });
  }
  joinMeeting(payload: Input<'joinMeeting'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      const row = await this.call('join_meeting', payload, ctx);
      return {
        meeting: await this.detail(payload.meetingId, ctx),
        participantToken: '',
        assignedRole: row.role as
          | Meeting['invitees'][number]['role']
          | 'host'
          | 'participant',
        requiresLobby: row.status === 'in_lobby',
        permissions: row.permissions as Meeting['defaultPermissions'],
      };
    });
  }
  startMeeting(id: string, ctx: RequestContext) {
    return this.run(ctx, async () =>
      model.meeting(await this.call('start_meeting', { meetingId: id }, ctx)),
    );
  }
  endMeeting(id: string, ctx: RequestContext) {
    return this.run(ctx, async () =>
      model.meeting(await this.call('end_meeting', { meetingId: id }, ctx)),
    );
  }
  getMeetingSummary(id: string, ctx: RequestContext) {
    return this.run<MeetingSummary>(ctx, async () => {
      const m = await this.detail(id, ctx);
      const rows = await this.read('attendance', { meetingId: id }, ctx);
      const minutes = (start?: string, end?: string) =>
        start && end
          ? Math.max(
              0,
              Math.round((Date.parse(end) - Date.parse(start)) / 60000),
            )
          : 0;
      return {
        meetingId: id,
        title: m.title,
        scheduledStartTime: m.scheduledStartTime,
        actualStartTime: m.actualStartTime,
        endedAt: m.endedAt,
        durationMinutes: minutes(m.actualStartTime, m.endedAt),
        status: m.status,
        userRole:
          m.organizerId === (await this.userId()) ? 'host' : 'participant',
        totalInvited: m.invitees.length,
        totalAccepted: m.invitees.filter(i => i.invitationStatus === 'accepted')
          .length,
        totalAttended: new Set(rows.map(r => r.participant_id)).size,
        organizerName: m.organizerName,
        organizerAvatarId: m.organizerAvatarId,
        attendanceRecords: rows.map(r => ({
          participantId: r.participant_id,
          displayName: r.display_name,
          avatarId: r.avatar_id,
          role: r.role,
          invited: m.invitees.some(i => i.displayName === r.display_name),
          accepted: m.invitees.some(
            i =>
              i.displayName === r.display_name &&
              i.invitationStatus === 'accepted',
          ),
          attended: true,
          joinedAt: r.joined_at,
          leftAt: r.left_at || undefined,
          durationMinutes: minutes(r.joined_at, r.left_at),
        })),
      };
    });
  }
  listInvitations(ctx: RequestContext) {
    return this.run(ctx, async () =>
      (await this.read('invitations', {}, ctx)).map(model.invitation),
    );
  }
  acceptInvitation(payload: Input<'acceptInvitation'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      const row = await this.call('accept_invitation', payload, ctx);
      return {
        invitation: model.invitation(row),
        meetingId: row.meeting_id as string,
        assignedRole: 'guest' as const,
      };
    });
  }
  declineInvitation(payload: Input<'declineInvitation'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      await this.call('decline_invitation', payload, ctx);
      return {
        invitationId: payload.invitationId,
        status: 'declined' as const,
      };
    });
  }
  saveGuestSchedule(payload: Input<'saveGuestSchedule'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      await this.call('save_meeting', payload, ctx);
      return {
        success: true,
        meetingId: payload.meetingId,
        savedLocally: false,
      };
    });
  }
  sendInvitations(payload: Input<'sendInvitations'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      if (payload.channels.some(c => c !== 'link'))
        throw new BackendError(
          'Share the meeting link or code. Email delivery is not configured',
        );
      await this.call('send_invitations', payload, ctx);
      return {
        meetingId: payload.meetingId,
        sentCount: 0,
        simulated: false,
        message: 'Share the meeting link or code with your invitees',
      };
    });
  }
  listParticipants(id: string, ctx: RequestContext) {
    return this.run(ctx, async () =>
      (await this.read('participants', { meetingId: id }, ctx)).map(
        model.participant,
      ),
    );
  }
  admitParticipant(payload: Input<'admitParticipant'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      const row = await this.call('admit_participant', payload, ctx);
      return {
        meetingId: payload.meetingId,
        participantId: row.id as string,
        status: row.status as 'in_meeting' | 'removed',
      };
    });
  }
  removeParticipant(payload: Input<'removeParticipant'>, ctx: RequestContext) {
    return this.run(ctx, async () => {
      await this.call('remove_participant', payload, ctx);
      return {
        meetingId: payload.meetingId,
        participantId: payload.participantId,
        status: 'removed' as const,
      };
    });
  }
  changeParticipantRole(
    payload: Input<'changeParticipantRole'>,
    ctx: RequestContext,
  ) {
    return this.run(ctx, async () => {
      const row = await this.call('change_role', payload, ctx);
      return {
        meetingId: payload.meetingId,
        participantId: payload.participantId,
        role: row.role as 'participant' | 'co_host',
      };
    });
  }
  requestPermission(payload: Input<'requestPermission'>, ctx: RequestContext) {
    return this.run(ctx, async () => ({
      request: model.permissionRequest(
        await this.call('request_permission', payload, ctx),
      ),
    }));
  }
  decidePermissionRequest(
    payload: Input<'decidePermissionRequest'>,
    ctx: RequestContext,
  ) {
    return this.run(ctx, async () => {
      const row = await this.call('decide_permission', payload, ctx);
      const participants = await this.read(
        'participants',
        { meetingId: payload.meetingId },
        ctx,
      );
      const p = participants.find(x => x.id === row.participant_id);
      if (!p) throw new BackendError('Participant not found');
      return {
        requestId: row.id as string,
        participantId: row.participant_id as string,
        permission: row.permission as Input<'requestPermission'>['permission'],
        decision: payload.decision,
        updatedPermissions: p.permissions as Meeting['defaultPermissions'],
      };
    });
  }
  updateParticipantPermissions(
    payload: Input<'updateParticipantPermissions'>,
    ctx: RequestContext,
  ) {
    return this.run(ctx, async () => {
      const row = await this.call('update_permissions', payload, ctx);
      return {
        meetingId: payload.meetingId,
        participantId: payload.participantId,
        permissions: row.permissions as Meeting['defaultPermissions'],
      };
    });
  }
  bulkUpdatePermissions(
    payload: Input<'bulkUpdatePermissions'>,
    ctx: RequestContext,
  ) {
    return this.run(ctx, async () => {
      const row = await this.call('bulk_permissions', payload, ctx);
      return {
        meetingId: payload.meetingId,
        action: payload.action,
        affectedParticipantCount: Number(row.affectedParticipantCount || 0),
      };
    });
  }
  listPermissionRequests(id: string, ctx: RequestContext) {
    return this.run(ctx, async () =>
      (await this.read('permission_requests', { meetingId: id }, ctx)).map(
        model.permissionRequest,
      ),
    );
  }
  listChatMessages(id: string, ctx: RequestContext) {
    return this.run(ctx, async () =>
      (await this.read('chat', { meetingId: id }, ctx)).map(model.chat),
    );
  }
  sendChatMessage(payload: Input<'sendChatMessage'>, ctx: RequestContext) {
    return this.run(ctx, async () => ({
      message: model.chat(await this.call('send_chat', payload, ctx)),
    }));
  }
  sendAnnouncement(payload: Input<'sendAnnouncement'>, ctx: RequestContext) {
    return this.run(ctx, async () => ({
      announcement: model.chat(
        await this.call('send_announcement', payload, ctx),
      ),
    }));
  }
  listNotifications(ctx: RequestContext) {
    return this.run(ctx, async () =>
      (await this.read('notifications', {}, ctx)).map(model.notification),
    );
  }
  markNotificationRead(id: string, ctx: RequestContext) {
    return this.run(ctx, async () => {
      await this.call('mark_notification_read', { notificationId: id }, ctx);
      return true;
    });
  }
  markAllNotificationsRead(ctx: RequestContext) {
    return this.run(ctx, async () => {
      await this.call('mark_all_notifications_read', {}, ctx);
      return true;
    });
  }
}

import type { User, Session as SupabaseSession } from '@supabase/supabase-js';
import type { Session } from '../types/auth';
import type { AppUser } from '../types/user';
import type {
  Meeting,
  MeetingListItem,
  MeetingInvitee,
} from '../types/meeting';
import type { MeetingParticipant } from '../types/participant';
import type { ChatMessage } from '../types/chat';
import type { PermissionRequest } from '../types/permission';
import type { MeetingInvitation } from '../types/invitation';
import type { AppNotification } from '../types/notification';
import { DEFAULT_AVATAR_ID } from '../constants/avatars';

// The hosted read model adds joined display fields to the underlying database rows.
// Dynamic JSON is confined to this boundary; consumers receive the application's typed models.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export function appUser(user: User, profile?: Row): AppUser {
  const base = {
    id: user.id,
    displayName:
      profile?.display_name || user.user_metadata.displayName || 'Guest',
    avatarId:
      profile?.avatar_id || user.user_metadata.avatarId || DEFAULT_AVATAR_ID,
    createdAt: user.created_at,
  };
  return user.is_anonymous
    ? { ...base, kind: 'guest' }
    : {
        ...base,
        kind: 'registered',
        email: user.email,
        isEmailVerified: Boolean(user.email_confirmed_at),
        isPhoneVerified: false,
        accountStatus: 'active',
        updatedAt: user.updated_at || user.created_at,
      };
}
export function appSession(session: SupabaseSession, profile?: Row): Session {
  const user = appUser(session.user, profile);
  const tokens = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: new Date((session.expires_at || 0) * 1000).toISOString(),
  };
  return user.kind === 'guest'
    ? { kind: 'guest', user, tokens }
    : { kind: 'registered', user, tokens };
}
export function invitee(row: Row): MeetingInvitee {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    userId: row.user_id || undefined,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    invitationStatus: row.status,
    status: row.status,
    invitedAt: row.created_at,
    acceptedAt: row.responded_at || undefined,
  };
}
export function meeting(row: Row): Meeting {
  const timing =
    row.timing_kind === 'scheduled'
      ? {
          kind: 'scheduled' as const,
          startsAt: row.starts_at,
          timezone: row.timezone,
        }
      : {
          kind: 'instant' as const,
          startsAt: row.starts_at,
          timezone: row.timezone,
        };
  return {
    id: row.id,
    code: row.code,
    shareLink: `conference://join/${row.code}`,
    version: row.version || 1,
    title: row.title,
    description: row.description || '',
    organizerId: row.organizer_id || '',
    hostId: row.organizer_id,
    organizerName: row.organizer_name || 'Meeting host',
    organizerAvatarId: row.organizer_avatar_id || DEFAULT_AVATAR_ID,
    status: row.status,
    timing,
    scheduledStartTime: row.starts_at,
    actualStartTime: row.actual_start_time || undefined,
    endedAt: row.ended_at || undefined,
    expiresAt: row.expires_at || undefined,
    guestAccess: row.guest_access,
    isLocked: row.is_locked,
    defaultPermissions: row.default_permissions || {
      microphone: false,
      camera: false,
      screenShare: false,
      chat: false,
    },
    invitees: (row.invitees || []).map(invitee),
    activeParticipantCount: Number(row.active_participant_count || 0),
    createdAt: row.created_at || row.starts_at,
    updatedAt: row.updated_at || row.starts_at,
  };
}
export function meetingItem(row: Row, userId: string): MeetingListItem {
  const m = meeting(row);
  const role = m.organizerId === userId ? 'host' : 'participant';
  return {
    id: m.id,
    code: m.code,
    shareLink: m.shareLink,
    title: m.title,
    organizerName: m.organizerName,
    organizerAvatarId: m.organizerAvatarId,
    scheduledStartTime: m.scheduledStartTime,
    actualStartTime: m.actualStartTime,
    endedAt: m.endedAt,
    expiresAt: m.expiresAt,
    timezone: row.timezone,
    status: m.status,
    userRole: role,
    participantCount: m.activeParticipantCount,
    participantAvatars: [],
    canJoin: ['live', 'scheduled'].includes(m.status) && !m.isLocked,
    canEdit: role === 'host' && ['live', 'scheduled'].includes(m.status),
    canCancel: role === 'host' && ['live', 'scheduled'].includes(m.status),
  };
}
export function participant(row: Row): MeetingParticipant {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarId: row.avatar_id,
    role: row.role,
    status: row.status,
    permissions: row.permissions,
    media: {
      isMuted: true,
      isCameraOff: true,
      isSharingScreen: false,
      isHandRaised: row.is_hand_raised,
      handRaisedAt: row.hand_raised_at || undefined,
    },
    joinedAt: row.joined_at || row.created_at,
    leftAt: row.left_at || undefined,
  };
}
export function chat(row: Row): ChatMessage {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatarId: row.sender_avatar_id,
    isHostOrCoHost: row.is_host_or_co_host,
    type: row.type,
    content: row.content,
    timestamp: row.created_at,
  };
}
export function permissionRequest(row: Row): PermissionRequest {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    participantId: row.participant_id,
    participantName: row.participant_name || 'Participant',
    participantAvatarId: row.participant_avatar_id || DEFAULT_AVATAR_ID,
    permission: row.permission,
    status: row.status,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at || undefined,
    decidedBy: row.decided_by || undefined,
  };
}
export function invitation(row: Row): MeetingInvitation {
  return {
    ...invitee(row),
    meetingTitle: row.meeting_title || '',
    organizerName: row.organizer_name || 'Meeting host',
    scheduledStartTime: row.scheduled_start_time,
    status: row.status,
    inviteeEmail: row.email,
    createdAt: row.created_at,
    respondedAt: row.responded_at || undefined,
  };
}
export function notification(row: Row): AppNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    meetingId: row.meeting_id,
    invitationId: row.invitation_id || undefined,
    timestamp: row.created_at,
    createdAt: row.created_at,
    isRead: row.is_read,
    read: row.is_read,
  };
}

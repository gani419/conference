import { AvatarId, ISODateTime } from './common';

export type InviteeRole = 'guest' | 'co_host';

export type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export type UserMeetingRole = 'host' | 'co_host' | 'participant' | 'guest';

export type InviteeContact = {
  email?: string | undefined;
  phoneE164?: string | undefined;
};

export type MeetingInviteePayload = {
  clientId: string;
  displayName: string;
  role: InviteeRole;
} & InviteeContact;

export type InviteePayload = MeetingInviteePayload;

export interface ParticipantPermissions {
  microphone: boolean;
  camera: boolean;
  screenShare: boolean;
  chat: boolean;
}

export type MeetingTiming =
  | {
      kind: 'instant';
      startsAt?: ISODateTime | undefined;
      timezone?: string | undefined;
    }
  | {
      kind: 'scheduled';
      startsAt: ISODateTime;
      timezone: string;
    };

export interface CreateMeetingPayload {
  title: string;
  description: string;
  timing: MeetingTiming;
  guestAccess: boolean;
  defaultPermissions: ParticipantPermissions;
  invitees: MeetingInviteePayload[];
}

export interface UpdateMeetingPayload {
  meetingId: string;
  expectedVersion: number;
  title: string;
  description: string;
  timing: MeetingTiming;
  guestAccess: boolean;
  defaultPermissions: ParticipantPermissions;
  invitees: MeetingInviteePayload[];
}

export interface CancelMeetingPayload {
  meetingId: string;
  expectedVersion: number;
}

export interface JoinMeetingPayload {
  meetingId: string;
}

export interface ResolveMeetingPayload {
  codeOrLink: string;
}

export interface MeetingInvitee {
  id: string;
  meetingId: string;
  userId?: string | undefined;
  displayName: string;
  email?: string | undefined;
  phoneE164?: string | undefined;
  role: InviteeRole;
  invitationStatus: 'pending' | 'accepted' | 'declined' | 'revoked';
  status?: 'pending' | 'accepted' | 'declined' | 'revoked' | undefined;
  invitedAt: ISODateTime;
  acceptedAt?: ISODateTime | undefined;
}

export interface Meeting {
  id: string;
  code: string;
  shareLink: string;
  version: number;
  title: string;
  description: string;
  organizerId: string;
  hostId?: string | undefined;
  organizerName: string;
  organizerAvatarId: AvatarId;
  status: MeetingStatus;
  timing: MeetingTiming;
  scheduledStartTime: ISODateTime;
  actualStartTime?: ISODateTime | undefined;
  endedAt?: ISODateTime | undefined;
  guestAccess: boolean;
  isLocked: boolean;
  defaultPermissions: ParticipantPermissions;
  invitees: MeetingInvitee[];
  activeParticipantCount: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface MeetingListItem {
  id: string;
  code: string;
  shareLink: string;
  title: string;
  organizerName: string;
  organizerAvatarId: AvatarId;
  scheduledStartTime: ISODateTime;
  actualStartTime?: ISODateTime | undefined;
  endedAt?: ISODateTime | undefined;
  durationMinutes?: number | undefined;
  timezone: string;
  status: MeetingStatus;
  userRole: UserMeetingRole;
  participantCount: number;
  participantAvatars: AvatarId[];
  canJoin: boolean;
  canEdit: boolean;
  canCancel: boolean;
}

export interface AttendanceRecord {
  participantId: string;
  displayName: string;
  avatarId: AvatarId;
  role: UserMeetingRole;
  invited: boolean;
  accepted: boolean;
  attended: boolean;
  joinedAt?: ISODateTime | undefined;
  leftAt?: ISODateTime | undefined;
  durationMinutes?: number | undefined;
}

export interface MeetingSummary {
  meetingId: string;
  title: string;
  scheduledStartTime: ISODateTime;
  actualStartTime?: ISODateTime | undefined;
  endedAt?: ISODateTime | undefined;
  durationMinutes: number;
  status: MeetingStatus;
  userRole: UserMeetingRole;
  totalInvited: number;
  totalAccepted: number;
  totalAttended: number;
  organizerName: string;
  organizerAvatarId: AvatarId;
  attendanceRecords: AttendanceRecord[];
}

export interface CreateMeetingResponse {
  meeting: Meeting;
}

export interface UpdateMeetingResponse {
  meeting: Meeting;
}

export interface CancelMeetingResponse {
  meetingId: string;
  status: 'cancelled';
  updatedAt: ISODateTime;
}

export interface ResolveMeetingResponse {
  meeting: Meeting;
  eligibleToJoin: boolean;
  reason?: string | undefined;
}

export interface JoinMeetingResponse {
  meeting: Meeting;
  participantToken: string;
  assignedRole: UserMeetingRole;
  requiresLobby: boolean;
  permissions: ParticipantPermissions;
}

export interface AttendanceResponse {
  records: AttendanceRecord[];
}

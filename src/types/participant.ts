import { AvatarId, ISODateTime } from './common';
import { ParticipantPermissions, UserMeetingRole } from './meeting';

export type ParticipantStatus = 'in_lobby' | 'in_meeting' | 'removed' | 'left';

export interface ParticipantMediaState {
  isMuted: boolean;
  isCameraOff: boolean;
  isSharingScreen: boolean;
  isHandRaised: boolean;
  handRaisedAt?: ISODateTime | undefined;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string | undefined;
  displayName: string;
  avatarId: AvatarId;
  role: UserMeetingRole;
  status: ParticipantStatus;
  permissions: ParticipantPermissions;
  media: ParticipantMediaState;
  joinedAt: ISODateTime;
  leftAt?: ISODateTime | undefined;
}

export interface AdmitParticipantPayload {
  meetingId: string;
  participantId: string;
  decision: 'admit' | 'deny';
}

export interface AdmitParticipantResponse {
  meetingId: string;
  participantId: string;
  status: 'in_meeting' | 'removed';
}

export interface RemoveParticipantPayload {
  meetingId: string;
  participantId: string;
  reason?: string | undefined;
}

export interface RemoveParticipantResponse {
  meetingId: string;
  participantId: string;
  status: 'removed';
}

export interface ChangeParticipantRolePayload {
  meetingId: string;
  participantId: string;
  newRole: 'co_host' | 'participant';
}

export interface ChangeParticipantRoleResponse {
  meetingId: string;
  participantId: string;
  role: UserMeetingRole;
}

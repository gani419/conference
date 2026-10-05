import { ISODateTime } from '../types/common';
import { ChatMessage } from '../types/chat';
import { ParticipantPermissions, UserMeetingRole } from '../types/meeting';
import { MeetingParticipant } from '../types/participant';
import { BulkPermissionAction, PermissionKind, PermissionRequest } from '../types/permission';

export const MEETING_EVENTS = {
  PARTICIPANT_JOINED_LOBBY: 'meeting:participant_joined_lobby',
  PARTICIPANT_ADMITTED: 'meeting:participant_admitted',
  PARTICIPANT_REMOVED: 'meeting:participant_removed',
  PARTICIPANT_ROLE_CHANGED: 'meeting:participant_role_changed',
  PARTICIPANT_MEDIA_CHANGED: 'meeting:participant_media_changed',
  PERMISSION_REQUESTED: 'meeting:permission_requested',
  PERMISSION_DECIDED: 'meeting:permission_decided',
  PERMISSIONS_UPDATED: 'meeting:permissions_updated',
  BULK_PERMISSIONS_APPLIED: 'meeting:bulk_permissions_applied',
  CHAT_MESSAGE_RECEIVED: 'meeting:chat_message_received',
  HAND_RAISE_TOGGLED: 'meeting:hand_raise_toggled',
  MEETING_CANCELLED: 'meeting:cancelled',
  MEETING_ENDED: 'meeting:ended',
} as const;

export type MeetingEventPayload =
  | {
      type: typeof MEETING_EVENTS.PARTICIPANT_JOINED_LOBBY;
      meetingId: string;
      participant: MeetingParticipant;
    }
  | {
      type: typeof MEETING_EVENTS.PARTICIPANT_ADMITTED;
      meetingId: string;
      participantId: string;
      role: UserMeetingRole;
      permissions: ParticipantPermissions;
    }
  | {
      type: typeof MEETING_EVENTS.PARTICIPANT_REMOVED;
      meetingId: string;
      participantId: string;
      reason?: string | undefined;
    }
  | {
      type: typeof MEETING_EVENTS.PARTICIPANT_ROLE_CHANGED;
      meetingId: string;
      participantId: string;
      newRole: UserMeetingRole;
    }
  | {
      type: typeof MEETING_EVENTS.PARTICIPANT_MEDIA_CHANGED;
      meetingId: string;
      participantId: string;
      media: {
        isMuted: boolean;
        isCameraOff: boolean;
        isSharingScreen: boolean;
      };
    }
  | {
      type: typeof MEETING_EVENTS.PERMISSION_REQUESTED;
      meetingId: string;
      request: PermissionRequest;
    }
  | {
      type: typeof MEETING_EVENTS.PERMISSION_DECIDED;
      meetingId: string;
      requestId: string;
      participantId: string;
      permission: PermissionKind;
      decision: 'approve' | 'deny';
      updatedPermissions: ParticipantPermissions;
    }
  | {
      type: typeof MEETING_EVENTS.PERMISSIONS_UPDATED;
      meetingId: string;
      participantId: string;
      permissions: ParticipantPermissions;
    }
  | {
      type: typeof MEETING_EVENTS.BULK_PERMISSIONS_APPLIED;
      meetingId: string;
      action: BulkPermissionAction;
    }
  | {
      type: typeof MEETING_EVENTS.CHAT_MESSAGE_RECEIVED;
      meetingId: string;
      message: ChatMessage;
    }
  | {
      type: typeof MEETING_EVENTS.HAND_RAISE_TOGGLED;
      meetingId: string;
      participantId: string;
      isHandRaised: boolean;
      timestamp: ISODateTime;
    }
  | {
      type: typeof MEETING_EVENTS.MEETING_CANCELLED;
      meetingId: string;
      cancelledAt: ISODateTime;
    }
  | {
      type: typeof MEETING_EVENTS.MEETING_ENDED;
      meetingId: string;
      endedAt: ISODateTime;
    };

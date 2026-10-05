import { AvatarId, ISODateTime } from './common';
import { ParticipantPermissions } from './meeting';

export type PermissionKind = 'microphone' | 'camera' | 'screenShare' | 'chat';

export type PermissionRequestStatus = 'pending' | 'approved' | 'denied';

export interface PermissionRequest {
  id: string;
  meetingId: string;
  participantId: string;
  participantName: string;
  participantAvatarId: AvatarId;
  permission: PermissionKind;
  status: PermissionRequestStatus;
  requestedAt: ISODateTime;
  decidedAt?: ISODateTime;
  decidedBy?: string;
}

export interface RequestPermissionPayload {
  meetingId: string;
  permission: PermissionKind;
}

export interface RequestPermissionResponse {
  request: PermissionRequest;
}

export interface DecidePermissionRequestPayload {
  meetingId: string;
  requestId: string;
  decision: 'approve' | 'deny';
}

export interface DecidePermissionRequestResponse {
  requestId: string;
  participantId: string;
  permission: PermissionKind;
  decision: 'approve' | 'deny';
  updatedPermissions: ParticipantPermissions;
}

export interface UpdateParticipantPermissionsPayload {
  meetingId: string;
  participantId: string;
  permissions: Partial<ParticipantPermissions>;
}

export interface UpdateParticipantPermissionsResponse {
  meetingId: string;
  participantId: string;
  permissions: ParticipantPermissions;
}

export type BulkPermissionAction =
  | { kind: 'mute_all' }
  | { kind: 'stop_all_cameras' }
  | { kind: 'disable_all_chat' }
  | { kind: 'enable_all_chat' }
  | { kind: 'lock_meeting'; locked: boolean };

export interface BulkUpdatePermissionsPayload {
  meetingId: string;
  action: BulkPermissionAction;
}

export interface BulkUpdatePermissionsResponse {
  meetingId: string;
  action: BulkPermissionAction;
  affectedParticipantCount: number;
}

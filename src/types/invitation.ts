import { ISODateTime } from './common';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface MeetingInvitation {
  id: string;
  meetingId: string;
  meetingTitle: string;
  organizerName: string;
  scheduledStartTime: ISODateTime;
  role: 'guest' | 'co_host';
  status: InvitationStatus;
  inviteeEmail?: string;
  inviteePhoneE164?: string;
  createdAt: ISODateTime;
  respondedAt?: ISODateTime;
}

export interface AcceptInvitationPayload {
  invitationId: string;
}

export interface AcceptInvitationResponse {
  invitation: MeetingInvitation;
  meetingId: string;
  assignedRole: 'guest' | 'co_host';
}

export interface DeclineInvitationPayload {
  invitationId: string;
  reason?: string;
}

export interface DeclineInvitationResponse {
  invitationId: string;
  status: 'declined';
}

export interface SaveGuestSchedulePayload {
  meetingId: string;
  reminderMinutes?: number;
}

export interface SaveGuestScheduleResponse {
  success: boolean;
  meetingId: string;
  savedLocally: boolean;
}

export interface SendInvitationsPayload {
  meetingId: string;
  inviteeIds?: string[];
  channels: ('email' | 'sms' | 'link')[];
}

export interface SendInvitationsResponse {
  meetingId: string;
  sentCount: number;
  simulated: boolean;
  message: string;
}

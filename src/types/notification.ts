import { ISODateTime } from './common';

export type NotificationKind =
  | 'meeting_invitation'
  | 'cohost_request'
  | 'meeting_reminder'
  | 'schedule_changed'
  | 'meeting_cancelled';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  meetingId: string;
  invitationId?: string;
  timestamp: ISODateTime;
  createdAt?: ISODateTime;
  isRead: boolean;
  read?: boolean;
  actionRequired?: boolean;
}

export interface RegisterPushTokenPayload {
  token: string;
  platform: 'android' | 'ios';
  deviceId: string;
}

export interface RegisterPushTokenResponse {
  success: boolean;
  registeredAt: ISODateTime;
}

export interface NotificationPreferences {
  meetingInvites: boolean;
  cohostRequests: boolean;
  meetingReminders: boolean;
  scheduleChanges: boolean;
  cancellations: boolean;
}

export interface UpdateNotificationPreferencesPayload {
  preferences: Partial<NotificationPreferences>;
}

export interface UpdateNotificationPreferencesResponse {
  preferences: NotificationPreferences;
}

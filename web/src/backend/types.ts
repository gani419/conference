export type Permission = 'microphone' | 'camera' | 'screenShare' | 'chat';
export type Permissions = Record<Permission, boolean>;
export const permissionNames: Record<Permission, string> = {
  microphone: 'Microphone',
  camera: 'Camera',
  screenShare: 'Screen sharing',
  chat: 'Chat',
};
export const permissionKeys: Permission[] = [
  'microphone',
  'camera',
  'screenShare',
  'chat',
];
export interface Identity {
  id: string;
  name: string;
  guest: boolean;
  avatarId?: string;
  email?: string;
}
export interface Invitation {
  id: string;
  meeting_id: string;
  email: string;
  display_name: string;
  role: 'guest' | 'co_host';
  status: string;
  meeting_title?: string;
  scheduled_start_time?: string;
  organizer_name?: string;
}
export interface Meeting {
  id: string;
  code: string;
  title: string;
  description: string;
  organizer_id?: string;
  organizer_name?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  timing_kind?: 'instant' | 'scheduled';
  starts_at: string;
  expires_at?: string;
  actual_start_time?: string;
  ended_at?: string;
  timezone?: string;
  version: number;
  guest_access: boolean;
  is_locked: boolean;
  default_permissions: Permissions;
  invitees?: Invitation[];
  active_participant_count?: number;
  eligible_to_join?: boolean;
}
export interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  role: 'host' | 'co_host' | 'guest' | 'participant';
  status: 'in_lobby' | 'in_meeting' | 'left' | 'removed';
  permissions: Permissions;
  is_hand_raised: boolean;
  hand_raised_at?: string;
}
export interface ChatMessage {
  id: string;
  content: string;
  type: 'message' | 'announcement';
  sender_name?: string;
  sender_id: string;
  created_at: string;
}
export interface PermissionRequest {
  id: string;
  participant_name: string;
  participant_id: string;
  permission: Permission;
  status: string;
}
export interface Attendance {
  id: string;
  display_name: string;
  role: string;
  joined_at: string;
  left_at?: string;
}
export interface Notification {
  id: string;
  title?: string;
  body?: string;
  kind: string;
  is_read: boolean;
  created_at: string;
  meeting_id?: string;
}
export interface MeetingDraft {
  expiresAt?: string;
  title: string;
  description: string;
  timing: {
    kind: 'instant' | 'scheduled';
    startsAt?: string;
    timezone: string;
  };
  guestAccess: boolean;
  defaultPermissions: Permissions;
  invitees: {
    clientId: string;
    displayName: string;
    email: string;
    role: 'guest' | 'co_host';
  }[];
}
export interface ConferenceBackend {
  restore(): Promise<Identity | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string, avatarId?: string): Promise<void>;
  guest(name: string): Promise<void>;
  signOut(): Promise<void>;
  onIdentityChange(callback: () => void): () => void;
  read<T>(action: string, payload?: object, signal?: AbortSignal): Promise<T>;
  command<T>(action: string, payload: object): Promise<T>;
  mediaToken(meetingId: string): Promise<{ token: string; serverUrl: string }>;
  subscribe(
    callback: () => void,
    userId: string,
    meetingId?: string,
  ): () => void;
}

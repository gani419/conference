import { RegisteredUser, GuestUser, AppUser } from '../../types/user';
import { Meeting, AttendanceRecord } from '../../types/meeting';
import { MeetingParticipant } from '../../types/participant';
import { PermissionRequest } from '../../types/permission';
import { ChatMessage } from '../../types/chat';
import { MeetingInvitation } from '../../types/invitation';
import {
  SEEDED_ATTENDANCE,
  SEEDED_CHAT_MESSAGES,
  SEEDED_INVITATIONS,
  SEEDED_MEETINGS,
  SEEDED_PARTICIPANTS,
  SEEDED_PERMISSION_REQUESTS,
  SEEDED_USERS,
} from './seed';

class MockDatabase {
  public users: Map<string, AppUser> = new Map();
  public meetings: Map<string, Meeting> = new Map();
  public participants: Map<string, MeetingParticipant[]> = new Map();
  public permissionRequests: Map<string, PermissionRequest[]> = new Map();
  public chatMessages: Map<string, ChatMessage[]> = new Map();
  public invitations: Map<string, MeetingInvitation> = new Map();
  public attendance: Map<string, AttendanceRecord[]> = new Map();
  public verificationCodes: Map<string, { code: string; userId: string; expiresAt: number }> = new Map();
  public resetTokens: Map<string, { userId: string; expiresAt: number }> = new Map();

  constructor() {
    this.resetToSeed();
  }

  resetToSeed(): void {
    this.users.clear();
    this.meetings.clear();
    this.participants.clear();
    this.permissionRequests.clear();
    this.chatMessages.clear();
    this.invitations.clear();
    this.attendance.clear();
    this.verificationCodes.clear();
    this.resetTokens.clear();

    // Populate seeded users
    Object.values(SEEDED_USERS).forEach((u) => {
      this.users.set(u.id, { ...u });
    });

    // Populate seeded meetings
    SEEDED_MEETINGS.forEach((m) => {
      this.meetings.set(m.id, JSON.parse(JSON.stringify(m)) as Meeting);
    });

    // Populate seeded participants
    SEEDED_PARTICIPANTS.forEach((p) => {
      const list = this.participants.get(p.meetingId) ?? [];
      list.push(JSON.parse(JSON.stringify(p)) as MeetingParticipant);
      this.participants.set(p.meetingId, list);
    });

    // Populate seeded requests
    SEEDED_PERMISSION_REQUESTS.forEach((r) => {
      const list = this.permissionRequests.get(r.meetingId) ?? [];
      list.push(JSON.parse(JSON.stringify(r)) as PermissionRequest);
      this.permissionRequests.set(r.meetingId, list);
    });

    // Populate chat messages
    SEEDED_CHAT_MESSAGES.forEach((msg) => {
      const list = this.chatMessages.get(msg.meetingId) ?? [];
      list.push(JSON.parse(JSON.stringify(msg)) as ChatMessage);
      this.chatMessages.set(msg.meetingId, list);
    });

    // Populate invitations
    SEEDED_INVITATIONS.forEach((inv) => {
      this.invitations.set(inv.id, { ...inv });
    });

    // Populate attendance
    this.attendance.set('meet-seed-ended', JSON.parse(JSON.stringify(SEEDED_ATTENDANCE)) as AttendanceRecord[]);
  }
}

export const mockDatabase = new MockDatabase();

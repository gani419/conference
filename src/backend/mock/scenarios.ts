import { mockDatabase } from './database';
import { mockEventBus } from './eventBus';
import { MEETING_EVENTS } from '../../constants/meetingEvents';
import { SEEDED_USERS } from './seed';
import { AppUser } from '../../types/user';
import { notificationService } from '../../services/notificationService';
import { ENV } from '../../config/environment';

export interface DeveloperScenarioControls {
  switchUser(user: AppUser): void;
  simulateHostApproval(meetingId: string, participantId: string): void;
  simulateHostDenial(meetingId: string, participantId: string): void;
  simulatePermissionRevocation(meetingId: string, participantId: string): void;
  simulateMeetingCancellation(meetingId: string): void;
  simulateMeetingEnded(meetingId: string): void;
  simulateIncomingChatMessage(meetingId: string, text: string): void;
  simulateNotification(): void;
  toggleNetworkFailure(fail: boolean): void;
  resetDatabase(): void;
}

export const mockScenarioControls: DeveloperScenarioControls = {
  switchUser(_user: AppUser): void {
    // Handled in Redux/Auth
  },

  simulateHostApproval(meetingId: string, participantId: string): void {
    const participants = mockDatabase.participants.get(meetingId) ?? [];
    const p = participants.find((item) => item.id === participantId);
    if (p) {
      p.status = 'in_meeting';
      mockEventBus.emit({
        type: MEETING_EVENTS.PARTICIPANT_ADMITTED,
        meetingId,
        participantId,
        role: p.role,
        permissions: p.permissions,
      });
    }
  },

  simulateHostDenial(meetingId: string, participantId: string): void {
    mockEventBus.emit({
      type: MEETING_EVENTS.PARTICIPANT_REMOVED,
      meetingId,
      participantId,
      reason: 'Host denied entry',
    });
  },

  simulatePermissionRevocation(meetingId: string, participantId: string): void {
    const participants = mockDatabase.participants.get(meetingId) ?? [];
    const p = participants.find((item) => item.id === participantId);
    if (p) {
      p.permissions = {
        microphone: false,
        camera: false,
        screenShare: false,
        chat: false,
      };
      mockEventBus.emit({
        type: MEETING_EVENTS.PERMISSIONS_UPDATED,
        meetingId,
        participantId,
        permissions: p.permissions,
      });
    }
  },

  simulateMeetingCancellation(meetingId: string): void {
    const meeting = mockDatabase.meetings.get(meetingId);
    if (meeting) {
      meeting.status = 'cancelled';
      meeting.updatedAt = new Date().toISOString();
      mockEventBus.emit({
        type: MEETING_EVENTS.MEETING_CANCELLED,
        meetingId,
        cancelledAt: meeting.updatedAt,
      });
    }
  },

  simulateMeetingEnded(meetingId: string): void {
    const meeting = mockDatabase.meetings.get(meetingId);
    if (meeting) {
      meeting.status = 'ended';
      meeting.endedAt = new Date().toISOString();
      mockEventBus.emit({
        type: MEETING_EVENTS.MEETING_ENDED,
        meetingId,
        endedAt: meeting.endedAt,
      });
    }
  },

  simulateIncomingChatMessage(meetingId: string, text: string): void {
    const msg = {
      id: `sim-msg-${Date.now()}`,
      meetingId,
      senderId: 'part-host-taylor',
      senderName: 'Taylor Kim (Host)',
      senderAvatarId: 'avatar-1',
      isHostOrCoHost: true,
      type: 'message' as const,
      content: text,
      timestamp: new Date().toISOString(),
    };
    const list = mockDatabase.chatMessages.get(meetingId) ?? [];
    list.push(msg);
    mockDatabase.chatMessages.set(meetingId, list);

    mockEventBus.emit({
      type: MEETING_EVENTS.CHAT_MESSAGE_RECEIVED,
      meetingId,
      message: msg,
    });
  },

  simulateNotification(): void {
    notificationService.simulateIncomingNotification({
      id: `sim-notif-${Date.now()}`,
      kind: 'meeting_invitation',
      title: 'Incoming Meeting Invitation',
      body: 'Taylor Kim invited you to Design workshop',
      meetingId: 'meet-seed-live',
      timestamp: new Date().toISOString(),
      isRead: false,
      actionRequired: true,
    });
  },

  toggleNetworkFailure(fail: boolean): void {
    ENV.mockFailureRate = fail ? 1.0 : 0.0;
  },

  resetDatabase(): void {
    mockDatabase.resetToSeed();
  },
};

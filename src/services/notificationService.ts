import { AppNotification } from '../types/notification';
import { storageService } from './storageService';

type NotificationListener = (notification: AppNotification) => void;

let listeners: NotificationListener[] = [];
let inMemoryNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    kind: 'meeting_invitation',
    title: 'Meeting invitation',
    body: 'Taylor Kim invited you to Product review',
    meetingId: 'meet-seed-live',
    invitationId: 'inv-seed-1',
    timestamp: new Date().toISOString(),
    isRead: false,
    actionRequired: true,
  },
  {
    id: 'notif-2',
    kind: 'cohost_request',
    title: 'Co-host request',
    body: 'Jordan Lee requested you to co-host Marketing sync',
    meetingId: 'meet-seed-scheduled',
    invitationId: 'inv-seed-2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    actionRequired: true,
  },
  {
    id: 'notif-3',
    kind: 'meeting_reminder',
    title: 'Meeting reminder',
    body: 'Design workshop starts in 10 minutes',
    meetingId: 'meet-seed-live',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isRead: true,
  },
];

export const notificationService = {
  subscribe(listener: NotificationListener): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  getAll(): AppNotification[] {
    return [...inMemoryNotifications];
  },

  markAsRead(notificationId: string): void {
    inMemoryNotifications = inMemoryNotifications.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n,
    );
  },

  markAllAsRead(): void {
    inMemoryNotifications = inMemoryNotifications.map((n) => ({ ...n, isRead: true }));
  },

  simulateIncomingNotification(notification: AppNotification): void {
    const prefs = storageService.getNotificationPreferences();
    if (notification.kind === 'meeting_invitation' && !prefs.meetingInvites) return;
    if (notification.kind === 'cohost_request' && !prefs.cohostRequests) return;
    if (notification.kind === 'meeting_reminder' && !prefs.meetingReminders) return;
    if (notification.kind === 'schedule_changed' && !prefs.scheduleChanges) return;
    if (notification.kind === 'meeting_cancelled' && !prefs.cancellations) return;

    inMemoryNotifications = [notification, ...inMemoryNotifications];
    listeners.forEach((l) => l(notification));
  },

  cleanupOnLogout(): void {
    listeners = [];
  },
};

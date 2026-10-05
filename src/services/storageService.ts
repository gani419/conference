import { createMMKV, MMKV } from 'react-native-mmkv';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { GuestUser } from '../types/user';
import { ThemePreference } from '../hooks/useResolvedTheme';
import { NotificationPreferences } from '../types/notification';

// Robust MMKV instance with in-memory fallback for environments without native modules
class SafeStorage {
  private mmkvInstance: MMKV | null = null;
  private memoryStore: Map<string, string> = new Map();

  constructor() {
    try {
      this.mmkvInstance = createMMKV({ id: 'conference-app-storage' });
    } catch {
      this.mmkvInstance = null;
    }
  }

  getString(key: string): string | undefined {
    if (this.mmkvInstance) {
      try {
        const val = this.mmkvInstance.getString(key);
        return val ?? undefined;
      } catch {
        return this.memoryStore.get(key);
      }
    }
    return this.memoryStore.get(key);
  }

  set(key: string, value: string): void {
    if (this.mmkvInstance) {
      try {
        this.mmkvInstance.set(key, value);
        return;
      } catch {
        this.memoryStore.set(key, value);
        return;
      }
    }
    this.memoryStore.set(key, value);
  }

  delete(key: string): void {
    if (this.mmkvInstance) {
      try {
        this.mmkvInstance.remove(key);
        return;
      } catch {
        this.memoryStore.delete(key);
        return;
      }
    }
    this.memoryStore.delete(key);
  }
}

export const storage = new SafeStorage();

export const storageService = {
  getString(key: string): string | undefined {
    return storage.getString(key);
  },

  get<T>(key: string): T | null {
    const val = storage.getString(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  },

  set(key: string, value: unknown): void {
    if (typeof value === 'string') {
      storage.set(key, value);
    } else {
      storage.set(key, JSON.stringify(value));
    }
  },

  remove(key: string): void {
    storage.delete(key);
  },

  getThemePreference(): ThemePreference {
    const val = storage.getString(STORAGE_KEYS.THEME_PREFERENCE);
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
    return 'system';
  },

  setThemePreference(pref: ThemePreference): void {
    storage.set(STORAGE_KEYS.THEME_PREFERENCE, pref);
  },

  getGuestUser(): GuestUser | null {
    const val = storage.getString(STORAGE_KEYS.GUEST_USER);
    if (!val) {
      return null;
    }
    try {
      return JSON.parse(val) as GuestUser;
    } catch {
      return null;
    }
  },

  setGuestUser(guest: GuestUser | null): void {
    if (!guest) {
      storage.delete(STORAGE_KEYS.GUEST_USER);
    } else {
      storage.set(STORAGE_KEYS.GUEST_USER, JSON.stringify(guest));
    }
  },

  getGuestSchedules(): string[] {
    const val = storage.getString(STORAGE_KEYS.GUEST_SCHEDULES);
    if (!val) {
      return [];
    }
    try {
      return JSON.parse(val) as string[];
    } catch {
      return [];
    }
  },

  saveGuestSchedule(meetingId: string): void {
    const current = this.getGuestSchedules();
    if (!current.includes(meetingId)) {
      current.push(meetingId);
      storage.set(STORAGE_KEYS.GUEST_SCHEDULES, JSON.stringify(current));
    }
  },

  getNotificationPreferences(): NotificationPreferences {
    const val = storage.getString(STORAGE_KEYS.NOTIFICATION_PREFERENCES);
    if (!val) {
      return {
        meetingInvites: true,
        cohostRequests: true,
        meetingReminders: true,
        scheduleChanges: true,
        cancellations: true,
      };
    }
    try {
      return JSON.parse(val) as NotificationPreferences;
    } catch {
      return {
        meetingInvites: true,
        cohostRequests: true,
        meetingReminders: true,
        scheduleChanges: true,
        cancellations: true,
      };
    }
  },

  setNotificationPreferences(prefs: NotificationPreferences): void {
    storage.set(STORAGE_KEYS.NOTIFICATION_PREFERENCES, JSON.stringify(prefs));
  },

  getAuthIdentifierDraft(): string {
    return storage.getString(STORAGE_KEYS.AUTH_IDENTIFIER_DRAFT) ?? '';
  },

  setAuthIdentifierDraft(identifier: string): void {
    storage.set(STORAGE_KEYS.AUTH_IDENTIFIER_DRAFT, identifier);
  },

  clearAllGuestData(): void {
    storage.delete(STORAGE_KEYS.GUEST_USER);
    storage.delete(STORAGE_KEYS.GUEST_SCHEDULES);
  },
};

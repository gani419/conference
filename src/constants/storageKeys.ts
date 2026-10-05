export const STORAGE_KEYS = {
  THEME_PREFERENCE: 'app:theme_preference',
  GUEST_USER: 'app:guest_user',
  GUEST_PROFILE: 'app:guest_user',
  AUTH_SESSION: 'app:auth_session',
  GUEST_SCHEDULES: 'app:guest_schedules',
  MOCK_DB: 'app:mock_database_v1',
  NOTIFICATION_PREFERENCES: 'app:notification_preferences',
  RECENT_MEETINGS_CACHE: 'app:recent_meetings_cache',
  AUTH_IDENTIFIER_DRAFT: 'app:auth_identifier_draft',
} as const;

export const SECURE_STORAGE_KEYS = {
  SESSION_TOKENS: 'secure:session_tokens',
  USER_SESSION: 'secure:user_session',
} as const;

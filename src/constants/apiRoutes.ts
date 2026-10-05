export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    GUEST_LOGIN: '/api/v1/auth/guest',
    VERIFY_CONTACT: '/api/v1/auth/verify',
    RESEND_CODE: '/api/v1/auth/resend-code',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    ME: '/api/v1/auth/me',
  },
  MEETINGS: {
    LIST: '/api/v1/meetings',
    UPCOMING: '/api/v1/meetings/upcoming',
    RECENT: '/api/v1/meetings/recent',
    CREATE: '/api/v1/meetings',
    DETAILS: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}`,
    UPDATE: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}`,
    CANCEL: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/cancel`,
    RESOLVE: '/api/v1/meetings/resolve',
    JOIN: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/join`,
    START: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/start`,
    END: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/end`,
    SUMMARY: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/summary`,
  },
  INVITATIONS: {
    LIST: '/api/v1/invitations',
    ACCEPT: (invitationId: string): string => `/api/v1/invitations/${encodeURIComponent(invitationId)}/accept`,
    DECLINE: (invitationId: string): string => `/api/v1/invitations/${encodeURIComponent(invitationId)}/decline`,
    SAVE_GUEST: '/api/v1/invitations/save-guest',
    SEND: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/send-invitations`,
  },
  PARTICIPANTS: {
    LIST: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/participants`,
    ADMIT: (meetingId: string, participantId: string): string =>
      `/api/v1/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(participantId)}/admit`,
    REMOVE: (meetingId: string, participantId: string): string =>
      `/api/v1/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(participantId)}/remove`,
    CHANGE_ROLE: (meetingId: string, participantId: string): string =>
      `/api/v1/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(participantId)}/role`,
  },
  PERMISSIONS: {
    REQUEST: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/permissions/request`,
    DECIDE: (meetingId: string, requestId: string): string =>
      `/api/v1/meetings/${encodeURIComponent(meetingId)}/permissions/requests/${encodeURIComponent(requestId)}/decide`,
    UPDATE: (meetingId: string, participantId: string): string =>
      `/api/v1/meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(participantId)}/permissions`,
    BULK_UPDATE: (meetingId: string): string =>
      `/api/v1/meetings/${encodeURIComponent(meetingId)}/permissions/bulk`,
  },
  CHAT: {
    MESSAGES: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/chat`,
    SEND: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/chat`,
    ANNOUNCE: (meetingId: string): string => `/api/v1/meetings/${encodeURIComponent(meetingId)}/chat/announce`,
  },
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    MARK_READ: (notificationId: string): string => `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
    MARK_ALL_READ: '/api/v1/notifications/mark-all-read',
    REGISTER_TOKEN: '/api/v1/notifications/token',
    PREFERENCES: '/api/v1/notifications/preferences',
  },
} as const;

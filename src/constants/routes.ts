export const ROUTES = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  VERIFY_CONTACT: 'VerifyContact',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  GUEST_SETUP: 'GuestSetup',
  HOME: 'Home',
  DASHBOARD: 'Home',
  CREATE_MEETING: 'CreateMeeting',
  MEETING_DETAILS: 'MeetingDetails',
  EDIT_MEETING: 'EditMeeting',
  LOBBY: 'Lobby',
  JOIN_LINK: 'JoinLink',
  MEETING_ROOM: 'MeetingRoom',
  MEETING_SUMMARY: 'MeetingSummary',
  SETTINGS: 'Settings',
  NOTIFICATIONS: 'Notifications',
} as const;

export type RouteNames = typeof ROUTES[keyof typeof ROUTES];

import { ROUTES } from '../constants/routes';

export type RootStackParamList = {
  [ROUTES.LOGIN]: { pendingMeetingId?: string | undefined } | undefined;
  [ROUTES.REGISTER]: { pendingMeetingId?: string | undefined } | undefined;
  [ROUTES.VERIFY_CONTACT]: { verificationId: string; contactDestination: string; pendingMeetingId?: string | undefined };
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.RESET_PASSWORD]: { resetToken: string };
  [ROUTES.GUEST_SETUP]: { pendingMeetingId?: string | undefined } | undefined;
  [ROUTES.HOME]: undefined;
  [ROUTES.CREATE_MEETING]: undefined;
  [ROUTES.MEETING_DETAILS]: { meetingId: string; invitationId?: string | undefined };
  [ROUTES.EDIT_MEETING]: { meetingId: string };
  [ROUTES.LOBBY]: { meetingId: string };
  [ROUTES.MEETING_ROOM]: { meetingId: string };
  [ROUTES.MEETING_SUMMARY]: { meetingId: string };
  [ROUTES.SETTINGS]: undefined;
  [ROUTES.NOTIFICATIONS]: undefined;
};

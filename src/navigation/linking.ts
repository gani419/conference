import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { ROUTES } from '../constants/routes';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['meet.app://', 'https://meet.app'],
  config: {
    screens: {
      [ROUTES.LOGIN]: 'login',
      [ROUTES.REGISTER]: 'register',
      [ROUTES.VERIFY_CONTACT]: 'verify',
      [ROUTES.FORGOT_PASSWORD]: 'forgot-password',
      [ROUTES.RESET_PASSWORD]: 'reset-password/:resetToken',
      [ROUTES.GUEST_SETUP]: 'guest',
      [ROUTES.HOME]: 'dashboard',
      [ROUTES.CREATE_MEETING]: 'meetings/create',
      [ROUTES.MEETING_DETAILS]: 'meetings/:meetingId',
      [ROUTES.EDIT_MEETING]: 'meetings/:meetingId/edit',
      [ROUTES.LOBBY]: 'lobby/:meetingId',
      [ROUTES.MEETING_ROOM]: 'room/:meetingId',
      [ROUTES.MEETING_SUMMARY]: 'summary/:meetingId',
      [ROUTES.SETTINGS]: 'settings',
      [ROUTES.NOTIFICATIONS]: 'notifications',
    },
  },
};

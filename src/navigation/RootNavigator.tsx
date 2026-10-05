import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ROUTES } from '../constants/routes';
import { useAppSelector } from '../store/hooks';

// Screens
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { VerifyContactScreen } from '../features/auth/VerifyContactScreen';
import { ForgotPasswordScreen } from '../features/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { GuestSetupScreen } from '../features/auth/GuestSetupScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { CreateMeetingScreen } from '../features/meetings/CreateMeetingScreen';
import { EditMeetingScreen } from '../features/meetings/EditMeetingScreen';
import { MeetingDetailsScreen } from '../features/invitations/MeetingDetailsScreen';
import { LobbyScreen } from '../features/lobby/LobbyScreen';
import { MeetingRoomScreen } from '../features/room/MeetingRoomScreen';
import { MeetingSummaryScreen } from '../features/history/MeetingSummaryScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const session = useAppSelector((state) => state.auth.session);
  const initialRouteName = session ? ROUTES.HOME : ROUTES.LOGIN;

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={ROUTES.VERIFY_CONTACT} component={VerifyContactScreen} />
      <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={ROUTES.RESET_PASSWORD} component={ResetPasswordScreen} />
      <Stack.Screen name={ROUTES.GUEST_SETUP} component={GuestSetupScreen} />
      <Stack.Screen name={ROUTES.HOME} component={DashboardScreen} />
      <Stack.Screen name={ROUTES.CREATE_MEETING} component={CreateMeetingScreen} />
      <Stack.Screen name={ROUTES.EDIT_MEETING} component={EditMeetingScreen} />
      <Stack.Screen name={ROUTES.MEETING_DETAILS} component={MeetingDetailsScreen} />
      <Stack.Screen name={ROUTES.LOBBY} component={LobbyScreen} />
      <Stack.Screen name={ROUTES.MEETING_ROOM} component={MeetingRoomScreen} />
      <Stack.Screen name={ROUTES.MEETING_SUMMARY} component={MeetingSummaryScreen} />
      <Stack.Screen name={ROUTES.SETTINGS} component={SettingsScreen} />
      <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
    </Stack.Navigator>
  );
};

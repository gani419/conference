import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import {
  useGetUpcomingMeetingsQuery,
  useGetRecentMeetingsQuery,
  useResolveMeetingMutation,
  useCreateMeetingMutation,
} from '../../api/appApi';
import { useAppSelector } from '../../store/hooks';

export function useDashboardController() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const session = useAppSelector((state) => state.auth.session);

  const [joinInput, setJoinInput] = useState('');
  const [devModalVisible, setDevModalVisible] = useState(false);

  const {
    data: upcomingMeetings = [],
    isLoading: isLoadingUpcoming,
    refetch: refetchUpcoming,
  } = useGetUpcomingMeetingsQuery();

  const {
    data: recentMeetings = [],
    isLoading: isLoadingRecent,
    refetch: refetchRecent,
  } = useGetRecentMeetingsQuery();

  const [resolveMeeting, { isLoading: isResolving }] = useResolveMeetingMutation();
  const [createMeeting, { isLoading: isCreatingInstant }] = useCreateMeetingMutation();

  const handleJoinMeeting = useCallback(
    async (codeOrLink?: string) => {
      const target = (codeOrLink || joinInput).trim();
      if (!target) {
        Alert.alert('Required', 'Please enter a meeting code or link');
        return;
      }

      try {
        const res = await resolveMeeting({ codeOrLink: target }).unwrap();
        if (res.meeting) {
          if (res.meeting.status === 'cancelled') {
            Alert.alert('Meeting Cancelled', 'This meeting has been cancelled by the host.');
            return;
          }
          if (res.meeting.status === 'ended') {
            navigation.navigate(ROUTES.MEETING_SUMMARY, { meetingId: res.meeting.id });
            return;
          }

          // If meeting is eligible to join, open Lobby, otherwise open Details
          if (res.eligibleToJoin) {
            navigation.navigate(ROUTES.LOBBY, { meetingId: res.meeting.id });
          } else {
            navigation.navigate(ROUTES.MEETING_DETAILS, { meetingId: res.meeting.id });
          }
        }
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' && err !== null && 'message' in err
            ? (err as { message: string }).message
            : 'Meeting could not be found';
        Alert.alert('Meeting Not Found', msg);
      }
    },
    [joinInput, navigation, resolveMeeting],
  );

  const handleCreateInstantMeeting = useCallback(async () => {
    if (session?.kind === 'guest') {
      Alert.alert('Action Restricted', 'Guests cannot create meetings. Please register an account.');
      return;
    }

    try {
      const res = await createMeeting({
        title: 'Instant Meeting',
        description: 'Instant meeting started from dashboard',
        timing: { kind: 'instant' },
        guestAccess: true,
        defaultPermissions: {
          microphone: false,
          camera: false,
          screenShare: false,
          chat: false,
        },
        invitees: [],
      }).unwrap();

      if (res.meeting) {
        navigation.navigate(ROUTES.MEETING_ROOM, { meetingId: res.meeting.id });
      }
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: string }).message
          : 'Could not create instant meeting';
      Alert.alert('Error', msg);
    }
  }, [createMeeting, navigation, session]);

  const handleRefresh = useCallback(() => {
    refetchUpcoming();
    refetchRecent();
  }, [refetchUpcoming, refetchRecent]);

  const scheduledMeetings = upcomingMeetings.filter((m) => m.status === 'scheduled');
  const liveMeetings = upcomingMeetings.filter((m) => m.status === 'live');

  return {
    session,
    joinInput,
    setJoinInput,
    devModalVisible,
    setDevModalVisible,
    upcomingMeetings,
    scheduledMeetings,
    liveMeetings,
    recentMeetings,
    isLoading: isLoadingUpcoming || isLoadingRecent,
    isResolving,
    isCreatingInstant,
    handleJoinMeeting,
    handleCreateInstantMeeting,
    handleRefresh,
    navigation,
  };
}

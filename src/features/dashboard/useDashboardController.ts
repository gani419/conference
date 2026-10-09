import { feedback } from '../../services/feedback';
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import {
  useGetUpcomingMeetingsQuery,
  useGetRecentMeetingsQuery,
  useResolveMeetingMutation,
} from '../../api/appApi';
import { useAppSelector } from '../../store/hooks';

export function useDashboardController() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const session = useAppSelector(state => state.auth.session);

  const focused = useIsFocused();
  const queryOptions = {
    pollingInterval: focused ? 4000 : 0,
    refetchOnMountOrArgChange: true,
  };
  const [joinInput, setJoinInput] = useState('');
  const [devModalVisible, setDevModalVisible] = useState(false);

  const {
    data: upcomingMeetings = [],
    isLoading: isLoadingUpcoming,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useGetUpcomingMeetingsQuery(undefined, queryOptions);

  const {
    data: recentMeetings = [],
    isLoading: isLoadingRecent,
    error: recentError,
    refetch: refetchRecent,
  } = useGetRecentMeetingsQuery(undefined, queryOptions);

  const [resolveMeeting, { isLoading: isResolving }] =
    useResolveMeetingMutation();


  const handleJoinMeeting = useCallback(
    async (codeOrLink?: string) => {
      const target = (codeOrLink || joinInput).trim();
      if (!target) {
        feedback.alert('Required', 'Please enter a meeting code or link');
        return;
      }

      try {
        const res = await resolveMeeting({ codeOrLink: target }).unwrap();
        if (res.meeting) {
          if (res.meeting.status === 'cancelled') {
            feedback.alert(
              'Meeting Cancelled',
              'This meeting has been cancelled by the host.',
            );
            return;
          }
          if (res.meeting.status === 'ended') {
            navigation.navigate(ROUTES.MEETING_SUMMARY, {
              meetingId: res.meeting.id,
            });
            return;
          }

          // If meeting is eligible to join, open Lobby, otherwise open Details
          if (res.eligibleToJoin) {
            navigation.navigate(ROUTES.LOBBY, { meetingId: res.meeting.id });
          } else {
            navigation.navigate(ROUTES.MEETING_DETAILS, {
              meetingId: res.meeting.id,
            });
          }
        }
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' && err !== null && 'message' in err
            ? (err as { message: string }).message
            : 'Meeting could not be found';
        feedback.alert('Meeting Not Found', msg);
      }
    },
    [joinInput, navigation, resolveMeeting],
  );

  const handleCreateInstantMeeting = useCallback(() => { navigation.navigate(ROUTES.CREATE_MEETING, { timingKind: 'instant' }); }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetchUpcoming();
    refetchRecent();
  }, [refetchUpcoming, refetchRecent]);

  const scheduledMeetings = upcomingMeetings.filter(
    m => m.status === 'scheduled',
  );
  const liveMeetings = upcomingMeetings.filter(m => m.status === 'live');

  return {
    session,
    queryError: upcomingError || recentError,
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
    isCreatingInstant: false,
    handleJoinMeeting,
    handleCreateInstantMeeting,
    handleRefresh,
    navigation,
  };
}

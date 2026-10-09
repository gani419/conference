import { feedback } from '../../services/feedback';
import { UserAvatar } from '../../components/feedback/UserAvatar';
import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createLocalVideoTrack, LocalVideoTrack } from 'livekit-client';
import { RTCView } from '@livekit/react-native-webrtc';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { HeaderBar } from '../../components/layout/HeaderBar';
import { AppButton } from '../../components/forms/AppButton';
import {
  useGetMeetingQuery,
  useJoinMeetingMutation,
  useGetParticipantsQuery,
  useStartMeetingMutation,
} from '../../api/appApi';
import { useAppSelector } from '../../store/hooks';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { requestDevicePermission } from '../../services/livekitMedia';
import { conferenceCommand } from '../../backend/SupabaseBackendAdapter';

export const LobbyScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, typeof ROUTES.LOBBY>>();
  const { meetingId } = route.params;
  const { tokens } = useResolvedTheme();
  const session = useAppSelector(state => state.auth.session);
  const { data: meeting } = useGetMeetingQuery(
    { meetingId },
    { pollingInterval: 3000 },
  );
  const { data: participants = [], refetch: refetchParticipants } = useGetParticipantsQuery(meetingId, {
    pollingInterval: 2000,
  });
  const [joinMeeting, { isLoading: isJoining }] = useJoinMeetingMutation();
  const [startMeeting, { isLoading: isStarting }] = useStartMeetingMutation();
  const [requested, setRequested] = useState(false);
  const [preview, setPreview] = useState<LocalVideoTrack | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewRef = useRef<LocalVideoTrack | null>(null);
  const mounted = useRef(true);
  const navigating = useRef(false);
  const me = participants.find(p => p.userId === session?.user.id);
  const isHost = meeting?.organizerId === session?.user.id;
  useEffect(
    () => () => {
      mounted.current = false;
      previewRef.current?.stop();
    },
    [],
  );
  const stopPreview = () => {
    previewRef.current?.stop();
    previewRef.current = null;
    setPreview(null);
  };
  useEffect(() => {
    if (navigating.current) return;
    if (me?.status === 'in_meeting' && meeting?.status === 'live') {
      navigating.current = true;
      previewRef.current?.stop();
      navigation.replace(ROUTES.MEETING_ROOM, { meetingId });
    } else if (
      me?.status === 'removed' ||
      meeting?.status === 'ended' ||
      meeting?.status === 'cancelled'
    ) {
      navigating.current = true;
      previewRef.current?.stop();
      feedback.alert(
        'Meeting unavailable',
        'Your entry was declined or the meeting has ended.',
      );
      navigation.replace(ROUTES.DASHBOARD);
    }
  }, [me?.status, meeting?.status, meetingId, navigation]);
  const togglePreview = async () => {
    if (previewBusy) return;
    if (preview) {
      stopPreview();
      return;
    }
    setPreviewBusy(true);
    try {
      await requestDevicePermission('camera');
      const track = await createLocalVideoTrack({ facingMode: 'user' });
      if (!mounted.current) {
        track.stop();
        return;
      }
      previewRef.current = track;
      setPreview(track);
    } catch (error) {
      feedback.alert(
        'Camera',
        error instanceof Error ? error.message : 'Camera preview unavailable',
      );
    } finally {
      if (mounted.current) setPreviewBusy(false);
    }
  };
  const askToJoin = async () => {
    try {
      if (isHost && meeting?.status === 'scheduled')
        await startMeeting({ meetingId }).unwrap();
      const joined = await joinMeeting({ meetingId }).unwrap();
      setRequested(true);
      if (!joined.requiresLobby && joined.meeting.status === 'live') {
        // The room must see the fresh admission, rather than a cached left record.
        const fresh = await refetchParticipants().unwrap();
        if (navigating.current || !mounted.current) return;
        if (!fresh.some(person => person.userId === session?.user.id && person.status === 'in_meeting')) return;
        navigating.current = true;
        stopPreview();
        navigation.replace(ROUTES.MEETING_ROOM, { meetingId });
      }
    } catch (error) {
      feedback.alert(
        'Join failed',
        typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Could not join meeting',
      );
    }
  };
  const leave = async () => {
    try {
      if (requested || me?.status === 'in_lobby')
        await conferenceCommand('leave_meeting', { meetingId });
      stopPreview();
      navigation.replace(ROUTES.DASHBOARD);
    } catch {
      feedback.alert('Error', 'Could not cancel your join request. Please retry.');
    }
  };
  const stream = preview?.mediaStream as unknown as
    | { toURL(): string }
    | undefined;
  const waiting = me?.status === 'in_lobby' || requested;
  return (
    <ScreenContainer scrollable={false} padded={false} testID="lobby-screen">
      <HeaderBar title="Meeting lobby" showBack onBack={leave} />
      <ScrollView contentContainerStyle={styles.content}>
        {!!meeting?.expiresAt && <Text style={{ color: tokens.textMuted }}>Active until {new Date(meeting.expiresAt).toLocaleString()}</Text>}
        <Text style={{ color: tokens.textMain }}>Active now: {participants.filter(person => person.status === 'in_meeting').length || meeting?.activeParticipantCount || 0}</Text>
        {participants.filter(person => person.status === 'in_meeting').map(person => <View key={person.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><UserAvatar avatarId={person.avatarId} size={32} /><Text style={{ color: tokens.textMain }}>{person.displayName}</Text></View>)}

        <Text style={[styles.title, { color: tokens.textMain }]}>
          {meeting?.title || 'Meeting'}
        </Text>
        <Text style={{ color: tokens.textMuted }}>
          Host: {meeting?.organizerName || 'Meeting host'}
        </Text>
        <View
          style={[styles.preview, { backgroundColor: tokens.surfaceSubtle }]}
        >
          {stream ? (
            <RTCView
              streamURL={stream.toURL()}
              style={StyleSheet.absoluteFill}
              mirror
              objectFit="cover"
            />
          ) : (
            <Text style={[styles.title, { color: tokens.textMain }]}>
              {session?.user.displayName || 'You'}
            </Text>
          )}
        </View>
        <Text style={{ color: tokens.textMuted }}>
          Your preview stays on this device. Audio and video are sent only after
          admission.
        </Text>
        <AppButton
          title={preview ? 'Stop camera preview' : 'Preview camera'}
          onPress={togglePreview}
          loading={previewBusy}
          variant="secondary"
        />
        {waiting && !isHost ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: tokens.textMain }}
          >
            {meeting?.status === 'scheduled'
              ? 'Waiting for the host to start the meeting and admit you.'
              : 'Waiting for host admission…'}
          </Text>
        ) : (
          <AppButton
            title={
              isHost && meeting?.status === 'scheduled'
                ? 'Start and join meeting'
                : isHost
                ? 'Join meeting'
                : 'Ask to join'
            }
            onPress={askToJoin}
            loading={isJoining || isStarting}
          />
        )}
        <AppButton
          title="Return to dashboard"
          variant="secondary"
          onPress={leave}
        />
      </ScrollView>
    </ScreenContainer>
  );
};
const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 900, alignSelf: 'center', padding: 24, gap: 18, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  preview: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

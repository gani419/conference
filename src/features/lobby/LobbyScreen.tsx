import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { HeaderBar } from '../../components/layout/HeaderBar';
import { AppButton } from '../../components/forms/AppButton';
import {
  useGetMeetingQuery,
  useJoinMeetingMutation,
  useGetParticipantsQuery,
  useAdmitParticipantMutation,
} from '../../api/appApi';
import { useAppSelector } from '../../store/hooks';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { mockEventBus } from '../../backend/mock/eventBus';
import { MEETING_EVENTS } from '../../constants/meetingEvents';

type LobbyRouteProp = RouteProp<RootStackParamList, typeof ROUTES.LOBBY>;

export const LobbyScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<LobbyRouteProp>();
  const { meetingId } = route.params;
  const { tokens } = useResolvedTheme();

  const session = useAppSelector((state) => state.auth.session);
  const currentUserId = session?.user.id;

  const { data: meeting } = useGetMeetingQuery({ meetingId });
  const { data: participants = [], refetch: refetchParticipants } = useGetParticipantsQuery(
    meetingId,
    { pollingInterval: 2000 },
  );

  const [joinMeeting, { isLoading: isJoining }] = useJoinMeetingMutation();
  const [admitParticipant] = useAdmitParticipantMutation();

  const [hasRequestedEntry, setHasRequestedEntry] = useState(false);
  const [isCameraPreviewOn, setIsCameraPreviewOn] = useState(false);
  const [speakerTestActive, setSpeakerTestActive] = useState(false);
  const [lobbyStatus, setLobbyStatus] = useState<'idle' | 'waiting' | 'admitted' | 'denied'>('idle');
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);

  const isNavigatingAway = useRef(false);

  // Check if current user is host or accepted co-host
  const isHost = (meeting?.hostId ?? meeting?.organizerId) === currentUserId;
  const isCoHost = meeting?.invitees.some(
    (inv) => (inv.userId === currentUserId || inv.id === currentUserId) && inv.role === 'co_host',
  );

  // Listen for real-time admission / denial events
  useEffect(() => {
    const unsub = mockEventBus.subscribe((event) => {
      if (event.meetingId !== meetingId) return;

      if (event.type === MEETING_EVENTS.PARTICIPANT_ADMITTED) {
        if (!myParticipantId || event.participantId === myParticipantId) {
          setLobbyStatus('admitted');
          if (!isNavigatingAway.current) {
            isNavigatingAway.current = true;
            navigation.replace(ROUTES.MEETING_ROOM, { meetingId });
          }
        }
      } else if (event.type === MEETING_EVENTS.PARTICIPANT_REMOVED) {
        if (event.participantId === myParticipantId) {
          setLobbyStatus('denied');
          Alert.alert('Entry Declined', 'The host did not admit you to this meeting.', [
            { text: 'OK', onPress: () => navigation.replace(ROUTES.DASHBOARD) },
          ]);
        }
      }
    });

    return () => unsub();
  }, [meetingId, myParticipantId, navigation]);

  // Check participants list polling
  useEffect(() => {
    if (myParticipantId) {
      const me = participants.find((p) => p.id === myParticipantId);
      if (me) {
        if (me.status === 'in_meeting') {
          setLobbyStatus('admitted');
          if (!isNavigatingAway.current) {
            isNavigatingAway.current = true;
            navigation.replace(ROUTES.MEETING_ROOM, { meetingId });
          }
        } else if (me.status === 'removed') {
          setLobbyStatus('denied');
        }
      }
    }
  }, [participants, myParticipantId, meetingId, navigation]);

  const handleAskToJoin = async () => {
    try {
      const res = await joinMeeting({ meetingId }).unwrap();
      if (!res.requiresLobby) {
        // Direct admission for host / co-host
        navigation.replace(ROUTES.MEETING_ROOM, { meetingId });
        return;
      }

      setHasRequestedEntry(true);
      setLobbyStatus('waiting');
      refetchParticipants();

      // Find our newly created participant ID from the latest list
      setTimeout(() => {
        refetchParticipants().then((pRes) => {
          const list = pRes.data ?? [];
          const found = list.find((p) => p.userId === currentUserId && p.status === 'in_lobby');
          if (found) {
            setMyParticipantId(found.id);
          }
        });
      }, 300);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: string }).message
          : 'Could not request to join';
      Alert.alert('Join Failed', msg);
    }
  };

  const handleSimulateApproval = async () => {
    if (!myParticipantId) {
      Alert.alert('Please Wait', 'Join request is still being registered...');
      return;
    }

    try {
      await admitParticipant({
        meetingId,
        participantId: myParticipantId,
        decision: 'admit',
      }).unwrap();
    } catch {
      // Direct navigate if simulate
      navigation.replace(ROUTES.MEETING_ROOM, { meetingId });
    }
  };

  const handleTestSpeaker = () => {
    setSpeakerTestActive(true);
    setTimeout(() => {
      setSpeakerTestActive(false);
      Alert.alert('Speaker Test', 'Speaker audio test completed successfully.');
    }, 1500);
  };

  return (
    <ScreenContainer scrollable={false} padded={false} testID="lobby-screen">
      <HeaderBar
        title="Meeting Lobby"
        showBack
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {/* Meeting Information */}
        <View style={styles.topInfo}>
          <Text style={[styles.meetingTitle, { color: tokens.textMain }]} numberOfLines={2}>
            {meeting?.title || 'Meeting'}
          </Text>
          <Text style={[styles.hostName, { color: tokens.textMuted }]}>
            Host: {meeting?.organizerName || 'Meeting Organizer'}
          </Text>
        </View>

        {/* Camera Preview Area */}
        <View
          style={[
            styles.previewBox,
            {
              backgroundColor: isCameraPreviewOn ? '#111827' : tokens.surfaceSubtle,
              borderColor: tokens.borderSubtle,
            },
          ]}
        >
          {isCameraPreviewOn ? (
            <View style={styles.activePreview}>
              <Text style={styles.previewActiveIcon}>📹</Text>
              <Text style={styles.previewActiveText}>Private Camera Preview</Text>
              <Text style={styles.previewActiveSub}>
                (Only you can see this preview until admitted)
              </Text>
            </View>
          ) : (
            <View style={styles.inactivePreview}>
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: tokens.primarySurface },
                ]}
              >
                <Text style={[styles.avatarText, { color: tokens.primary }]}>
                  {session?.user.displayName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <Text style={[styles.previewOffText, { color: tokens.textMain }]}>
                {session?.user.displayName || 'You'}
              </Text>
              <Text style={[styles.previewOffSub, { color: tokens.textMuted }]}>
                Camera preview is off
              </Text>
            </View>
          )}

          {/* Privacy Notice Pill */}
          <View style={[styles.privacyPill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Text style={styles.privacyPillText}>
              🔇 Mic broadcasting is strictly disabled in lobby
            </Text>
          </View>
        </View>

        {/* Preview Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.controlBtn,
              {
                backgroundColor: isCameraPreviewOn
                  ? tokens.surfaceActive
                  : tokens.surfaceSubtle,
                borderColor: isCameraPreviewOn ? tokens.primary : tokens.borderSubtle,
              },
            ]}
            onPress={() => setIsCameraPreviewOn((prev) => !prev)}
          >
            <Text style={styles.controlIcon}>{isCameraPreviewOn ? '📹' : '🚫'}</Text>
            <Text style={[styles.controlLabel, { color: tokens.textMain }]}>
              {isCameraPreviewOn ? 'Camera Preview ON' : 'Turn Preview ON'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlBtn,
              { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.borderSubtle },
            ]}
            onPress={handleTestSpeaker}
          >
            <Text style={styles.controlIcon}>{speakerTestActive ? '🔊' : '🔈'}</Text>
            <Text style={[styles.controlLabel, { color: tokens.textMain }]}>
              {speakerTestActive ? 'Testing Audio...' : 'Test Speaker'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lobby Status & Join Button */}
        <View style={styles.statusSection}>
          {lobbyStatus === 'waiting' ? (
            <View
              style={[
                styles.waitingBox,
                { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.borderSubtle },
              ]}
            >
              <ActivityIndicator size="small" color={tokens.primary} />
              <View style={styles.waitingTextWrap}>
                <Text style={[styles.waitingTitle, { color: tokens.textMain }]}>
                  Waiting for host admission...
                </Text>
                <Text style={[styles.waitingSub, { color: tokens.textMuted }]}>
                  The host has been notified that you are waiting in the lobby.
                </Text>
              </View>

              {/* Dev convenience button for single-device test */}
              <TouchableOpacity
                style={[styles.devAdmitBtn, { backgroundColor: tokens.primarySurface }]}
                onPress={handleSimulateApproval}
              >
                <Text style={[styles.devAdmitText, { color: tokens.primary }]}>
                  ⚡ Simulate Host Approval
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <AppButton
              title={
                isHost || isCoHost
                  ? 'Join Meeting (Host Bypass)'
                  : 'Ask to Join Meeting'
              }
              onPress={handleAskToJoin}
              variant="primary"
              loading={isJoining}
            />
          )}

          <TouchableOpacity
            style={styles.cancelLink}
            onPress={() => navigation.replace(ROUTES.DASHBOARD)}
          >
            <Text style={[styles.cancelLinkText, { color: tokens.textMuted }]}>
              Return to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  topInfo: {
    alignItems: 'center',
    gap: 4,
  },
  meetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  hostName: {
    fontSize: 14,
  },
  previewBox: {
    height: 260,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activePreview: {
    alignItems: 'center',
    gap: 6,
  },
  previewActiveIcon: {
    fontSize: 48,
  },
  previewActiveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewActiveSub: {
    color: '#9ca3af',
    fontSize: 12,
  },
  inactivePreview: {
    alignItems: 'center',
    gap: 8,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  previewOffText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewOffSub: {
    fontSize: 13,
  },
  privacyPill: {
    position: 'absolute',
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  privacyPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  controlIcon: {
    fontSize: 22,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusSection: {
    gap: 12,
  },
  waitingBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  waitingTextWrap: {
    alignItems: 'center',
    gap: 4,
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  waitingSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  devAdmitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 4,
  },
  devAdmitText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontSize: 14,
  },
});

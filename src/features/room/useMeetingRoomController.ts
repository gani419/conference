import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import {
  useGetMeetingDetailsQuery,
  useGetParticipantsQuery,
  useGetPermissionRequestsQuery,
  useGetChatMessagesQuery,
  useAdmitParticipantMutation,
  useRemoveParticipantMutation,
  useChangeParticipantRoleMutation,
  useUpdateParticipantPermissionsMutation,
  useBulkUpdatePermissionsMutation,
  useRequestPermissionMutation,
  useDecidePermissionRequestMutation,
  useSendChatMessageMutation,
  useEndMeetingMutation,
} from '../../api/appApi';
import { useAppSelector } from '../../store/hooks';
import { MeetingParticipant } from '../../types/participant';
import { UserMeetingRole, ParticipantPermissions } from '../../types/meeting';
import { mediaService } from '../../services/mediaService';
import { mockEventBus } from '../../backend/mock/eventBus';
import { MEETING_EVENTS } from '../../constants/meetingEvents';

export type RoomPanelTab = 'none' | 'chat' | 'participants' | 'lobby' | 'requests' | 'hands';

export function useMeetingRoomController(meetingId: string) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const session = useAppSelector((state) => state.auth.session);
  const currentUserId = session?.user.id;

  // Real-time / polling queries
  const { data: meeting, isLoading: isLoadingMeeting } = useGetMeetingDetailsQuery(meetingId, {
    pollingInterval: 5000,
  });

  const {
    data: participants = [],
    refetch: refetchParticipants,
  } = useGetParticipantsQuery(meetingId, {
    pollingInterval: 2000,
  });

  const {
    data: permissionRequests = [],
    refetch: refetchPermissions,
  } = useGetPermissionRequestsQuery(meetingId, {
    pollingInterval: 2000,
  });

  const { data: chatMessages = [] } = useGetChatMessagesQuery(meetingId, {
    pollingInterval: 1500,
  });

  // Mutations
  const [admitParticipant] = useAdmitParticipantMutation();
  const [removeParticipant] = useRemoveParticipantMutation();
  const [changeParticipantRole] = useChangeParticipantRoleMutation();
  const [updateParticipantPermissions] = useUpdateParticipantPermissionsMutation();
  const [bulkUpdatePermissions] = useBulkUpdatePermissionsMutation();
  const [requestPermission] = useRequestPermissionMutation();
  const [decidePermissionRequest] = useDecidePermissionRequestMutation();
  const [sendChatMessage] = useSendChatMessageMutation();
  const [endMeeting, { isLoading: isEnding }] = useEndMeetingMutation();

  // Local media & UI state
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);

  const [activePanel, setActivePanel] = useState<RoomPanelTab>('none');
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<MeetingParticipant | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Find current user's participant entry
  const myParticipant = useMemo(() => {
    return (
      participants.find((p) => p.userId === currentUserId && p.status === 'in_meeting') ||
      participants.find((p) => p.status === 'in_meeting')
    );
  }, [participants, currentUserId]);

  // Connect to mock/livekit media engine
  useEffect(() => {
    mediaService.connect(`token-${meetingId}`, meetingId);
    return () => {
      mediaService.disconnect();
    };
  }, [meetingId]);

  // Listen for real-time events (removed from room, meeting ended, etc.)
  useEffect(() => {
    const unsub = mockEventBus.subscribe((event) => {
      if (event.meetingId !== meetingId) return;

      if (event.type === MEETING_EVENTS.MEETING_ENDED) {
        Alert.alert('Meeting Ended', 'The host has ended this meeting.', [
          {
            text: 'OK',
            onPress: () => navigation.replace(ROUTES.MEETING_SUMMARY, { meetingId }),
          },
        ]);
      } else if (event.type === MEETING_EVENTS.PARTICIPANT_REMOVED) {
        if (myParticipant && event.participantId === myParticipant.id) {
          Alert.alert('Removed', 'You were removed from this meeting by the host.', [
            { text: 'OK', onPress: () => navigation.replace(ROUTES.DASHBOARD) },
          ]);
        }
      }
    });

    return () => unsub();
  }, [meetingId, navigation, myParticipant]);

  const isMeetingHost = (meeting?.hostId ?? meeting?.organizerId) === currentUserId;
  const isMeetingCoHost = myParticipant?.role === 'co_host';
  const isHostOrCoHost = isMeetingHost || isMeetingCoHost;

  const myRole: UserMeetingRole = isMeetingHost
    ? 'host'
    : isMeetingCoHost
    ? 'co_host'
    : (myParticipant?.role ?? 'participant');

  const myPermissions: ParticipantPermissions = useMemo(() => {
    if (isHostOrCoHost) {
      return { microphone: true, camera: true, screenShare: true, chat: true };
    }
    return (
      myParticipant?.permissions ?? {
        microphone: false,
        camera: false,
        screenShare: false,
        chat: false,
      }
    );
  }, [isHostOrCoHost, myParticipant]);

  // Filter participant subsets
  const inMeetingParticipants = useMemo(
    () => participants.filter((p) => p.status === 'in_meeting'),
    [participants],
  );

  const lobbyParticipants = useMemo(
    () => participants.filter((p) => p.status === 'in_lobby'),
    [participants],
  );

  const raisedHandParticipants = useMemo(
    () => inMeetingParticipants.filter((p) => p.media.isHandRaised),
    [inMeetingParticipants],
  );

  const pendingRequests = useMemo(
    () => permissionRequests.filter((r) => r.status === 'pending'),
    [permissionRequests],
  );

  // Request permission from host
  const handleRequestPermission = useCallback(
    async (permission: 'microphone' | 'camera' | 'screenShare' | 'chat') => {
      try {
        await requestPermission({ meetingId, permission }).unwrap();
        Alert.alert('Request Sent', `Your request for ${permission} permission has been sent to the host.`);
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' && err !== null && 'message' in err
            ? (err as { message: string }).message
            : 'Could not send permission request';
        Alert.alert('Request Failed', msg);
      }
    },
    [meetingId, requestPermission],
  );

  // Mic controls
  const handleToggleMic = useCallback(async () => {
    if (!myPermissions.microphone && !isHostOrCoHost) {
      Alert.alert(
        'Permission Required',
        'Microphone is disabled by host. Request permission to speak?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Mic',
            onPress: () => handleRequestPermission('microphone'),
          },
        ],
      );
      return;
    }
    const next = !isMicOn;
    setIsMicOn(next);
    await mediaService.toggleMicrophone(next);
  }, [isMicOn, myPermissions.microphone, isHostOrCoHost, handleRequestPermission]);

  // Camera controls
  const handleToggleCamera = useCallback(async () => {
    if (!myPermissions.camera && !isHostOrCoHost) {
      Alert.alert(
        'Permission Required',
        'Camera is disabled by host. Request permission to enable camera?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Camera',
            onPress: () => handleRequestPermission('camera'),
          },
        ],
      );
      return;
    }
    const next = !isCameraOn;
    setIsCameraOn(next);
    await mediaService.toggleCamera(next);
  }, [isCameraOn, myPermissions.camera, isHostOrCoHost, handleRequestPermission]);

  // Screen share controls
  const handleToggleScreenShare = useCallback(async () => {
    if (!myPermissions.screenShare && !isHostOrCoHost) {
      Alert.alert(
        'Permission Required',
        'Screen sharing requires host permission. Request permission to share screen?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Sharing',
            onPress: () => handleRequestPermission('screenShare'),
          },
        ],
      );
      return;
    }
    const next = !isScreenSharing;
    setIsScreenSharing(next);
    await mediaService.toggleScreenShare(next);
  }, [isScreenSharing, myPermissions.screenShare, isHostOrCoHost, handleRequestPermission]);

  // Raise hand
  const handleToggleRaiseHand = useCallback(() => {
    setIsHandRaised((prev) => !prev);
  }, []);

  // Send chat message
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!myPermissions.chat && !isHostOrCoHost) {
        Alert.alert('Chat Disabled', 'Chat is disabled for participants in this meeting.');
        return;
      }
      try {
        await sendChatMessage({ meetingId, content: text }).unwrap();
      } catch (err: unknown) {
        Alert.alert('Error', 'Failed to send message');
      }
    },
    [meetingId, myPermissions.chat, isHostOrCoHost, sendChatMessage],
  );

  // Host moderation: Admit / Deny
  const handleAdmit = useCallback(
    async (participantId: string) => {
      try {
        await admitParticipant({ meetingId, participantId, decision: 'admit' }).unwrap();
        refetchParticipants();
      } catch (err: unknown) {
        Alert.alert('Error', 'Could not admit participant');
      }
    },
    [meetingId, admitParticipant, refetchParticipants],
  );

  const handleDeny = useCallback(
    async (participantId: string) => {
      try {
        await admitParticipant({ meetingId, participantId, decision: 'deny' }).unwrap();
        refetchParticipants();
      } catch (err: unknown) {
        Alert.alert('Error', 'Could not deny participant');
      }
    },
    [meetingId, admitParticipant, refetchParticipants],
  );

  // Host moderation: Remove
  const handleRemoveParticipant = useCallback(
    async (participantId: string) => {
      Alert.alert('Remove Participant', 'Are you sure you want to remove this participant from the meeting?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeParticipant({ meetingId, participantId }).unwrap();
              setSelectedParticipant(null);
              refetchParticipants();
            } catch {
              Alert.alert('Error', 'Could not remove participant');
            }
          },
        },
      ]);
    },
    [meetingId, removeParticipant, refetchParticipants],
  );

  // Host moderation: Role promotion / demotion
  const handleChangeRole = useCallback(
    async (participantId: string, newRole: 'co_host' | 'participant') => {
      try {
        await changeParticipantRole({ meetingId, participantId, newRole }).unwrap();
        setSelectedParticipant(null);
        refetchParticipants();
        Alert.alert('Role Updated', `Participant role changed to ${newRole === 'co_host' ? 'Co-Host' : 'Participant'}.`);
      } catch {
        Alert.alert('Error', 'Could not change participant role');
      }
    },
    [meetingId, changeParticipantRole, refetchParticipants],
  );

  // Host moderation: Mute single participant
  const handleMuteParticipant = useCallback(
    async (participantId: string) => {
      try {
        await updateParticipantPermissions({
          meetingId,
          participantId,
          permissions: { microphone: false },
        }).unwrap();
        setSelectedParticipant(null);
        refetchParticipants();
      } catch {
        Alert.alert('Error', 'Could not mute participant');
      }
    },
    [meetingId, updateParticipantPermissions, refetchParticipants],
  );

  // Host moderation: Bulk mute all
  const handleMuteAll = useCallback(async () => {
    Alert.alert('Mute All', 'Mute microphones for all participants?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mute All',
        onPress: async () => {
          try {
            await bulkUpdatePermissions({
              meetingId,
              action: { kind: 'mute_all' },
            }).unwrap();
            refetchParticipants();
            Alert.alert('Success', 'All participants have been muted.');
          } catch {
            Alert.alert('Error', 'Failed to mute all');
          }
        },
      },
    ]);
  }, [meetingId, bulkUpdatePermissions, refetchParticipants]);

  // Host moderation: Bulk stop cameras
  const handleStopAllCameras = useCallback(async () => {
    Alert.alert('Disable All Cameras', 'Turn off cameras for all participants?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disable All',
        onPress: async () => {
          try {
            await bulkUpdatePermissions({
              meetingId,
              action: { kind: 'stop_all_cameras' },
            }).unwrap();
            refetchParticipants();
            Alert.alert('Success', 'All participant cameras disabled.');
          } catch {
            Alert.alert('Error', 'Failed to disable cameras');
          }
        },
      },
    ]);
  }, [meetingId, bulkUpdatePermissions, refetchParticipants]);

  // Host moderation: Permission approval / denial
  const handleDecidePermission = useCallback(
    async (requestId: string, decision: 'approved' | 'denied' | 'approve' | 'deny') => {
      try {
        const mappedDecision: 'approve' | 'deny' =
          decision === 'approved' || decision === 'approve' ? 'approve' : 'deny';
        await decidePermissionRequest({ meetingId, requestId, decision: mappedDecision }).unwrap();
        refetchPermissions();
        refetchParticipants();
      } catch {
        Alert.alert('Error', 'Could not update request decision');
      }
    },
    [meetingId, decidePermissionRequest, refetchPermissions, refetchParticipants],
  );

  // Host moderation: Toggle Lock
  const handleToggleLockMeeting = useCallback(() => {
    setIsLocked((prev) => !prev);
    Alert.alert('Meeting Locked', isLocked ? 'Meeting is now unlocked' : 'Meeting is now locked from new arrivals');
  }, [isLocked]);

  // Leave meeting (self)
  const handleLeaveMeeting = useCallback(() => {
    Alert.alert('Leave Meeting', 'Are you sure you want to leave this meeting?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          mediaService.disconnect();
          navigation.replace(ROUTES.DASHBOARD);
        },
      },
    ]);
  }, [navigation]);

  // End meeting for everyone (Host only)
  const handleEndMeetingForAll = useCallback(() => {
    Alert.alert(
      'End Meeting for All',
      'This will disconnect all participants and conclude the meeting.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Meeting',
          style: 'destructive',
          onPress: async () => {
            try {
              await endMeeting({ meetingId }).unwrap();
              mediaService.disconnect();
              navigation.replace(ROUTES.MEETING_SUMMARY, { meetingId });
            } catch (err: unknown) {
              const msg =
                typeof err === 'object' && err !== null && 'message' in err
                  ? (err as { message: string }).message
                  : 'Failed to end meeting';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  }, [meetingId, endMeeting, navigation]);

  return {
    meetingId,
    meeting,
    isLoadingMeeting,
    isEnding,
    session,
    myParticipant,
    myRole,
    isHostOrCoHost,
    myPermissions,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    isHandRaised,
    isLocked,
    participants,
    inMeetingParticipants,
    lobbyParticipants,
    raisedHandParticipants,
    pendingRequests,
    chatMessages,
    activePanel,
    setActivePanel,
    pinnedParticipantId,
    setPinnedParticipantId,
    selectedParticipant,
    setSelectedParticipant,
    handleToggleMic,
    handleToggleCamera,
    handleToggleScreenShare,
    handleToggleRaiseHand,
    handleRequestPermission,
    handleSendMessage,
    handleAdmit,
    handleDeny,
    handleRemoveParticipant,
    handleChangeRole,
    handleMuteParticipant,
    handleMuteAll,
    handleStopAllCameras,
    handleDecidePermission,
    handleToggleLockMeeting,
    handleLeaveMeeting,
    handleEndMeetingForAll,
    navigation,
  };
}

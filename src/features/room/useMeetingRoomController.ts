import { feedback } from '../../services/feedback';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { conferenceCommand } from '../../backend/SupabaseBackendAdapter';
import {
  MediaConnectionState,
  RemoteParticipantTrackState,
} from '../../services/mediaService';

export type RoomPanelTab =
  | 'none'
  | 'chat'
  | 'participants'
  | 'lobby'
  | 'requests'
  | 'hands';

export function useMeetingRoomController(meetingId: string) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const session = useAppSelector(state => state.auth.session);
  const currentUserId = session?.user.id;

  // Real-time / polling queries
  const {
    data: meeting,
    isLoading: isLoadingMeeting,
    refetch: refetchMeeting,
  } = useGetMeetingDetailsQuery(meetingId, {
    pollingInterval: 5000,
  });

  const { data: storedParticipants = [], refetch: refetchParticipants } =
    useGetParticipantsQuery(meetingId, {
      pollingInterval: 2000,
    });

  const { data: permissionRequests = [], refetch: refetchPermissions } =
    useGetPermissionRequestsQuery(meetingId, {
      pollingInterval: 2000,
    });

  const { data: chatMessages = [] } = useGetChatMessagesQuery(meetingId, {
    pollingInterval: 1500,
  });

  // Mutations
  const [admitParticipant] = useAdmitParticipantMutation();
  const [removeParticipant] = useRemoveParticipantMutation();
  const [changeParticipantRole] = useChangeParticipantRoleMutation();
  const [updateParticipantPermissions] =
    useUpdateParticipantPermissionsMutation();
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
  const [trackStates, setTrackStates] = useState<RemoteParticipantTrackState[]>(
    [],
  );
  const [connectionState, setConnectionState] =
    useState<MediaConnectionState>('disconnected');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const exitShown = useRef(false);
  const participants = useMemo(
    () =>
      storedParticipants.map(p => {
        const track = trackStates.find(t => t.participantId === p.userId);
        return {
          ...p,
          media: {
            ...p.media,
            isMuted: !track?.isAudioActive,
            isCameraOff: !track?.isVideoActive,
            isSharingScreen: !!track?.isScreenSharing,
          },
        };
      }),
    [storedParticipants, trackStates],
  );

  const [activePanel, setActivePanel] = useState<RoomPanelTab>('none');
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(
    null,
  );
  const [selectedParticipant, setSelectedParticipant] =
    useState<MeetingParticipant | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Find current user's participant entry
  const myParticipant = useMemo(() => {
    return participants.find(p => p.userId === currentUserId);
  }, [participants, currentUserId]);

  // A fresh server-issued token is fetched only after authoritative admission.
  useEffect(() => {
    if (myParticipant?.status !== 'in_meeting' || meeting?.status !== 'live')
      return;
    let disposed = false;
    setMediaError(null);
    mediaService.connect('', meetingId).catch(error => {
      if (!disposed)
        setMediaError(
          error instanceof Error
            ? error.message
            : 'Could not connect to the call',
        );
    });
    return () => {
      disposed = true;
      void mediaService.disconnect();
    };
  }, [meetingId, myParticipant?.status, meeting?.status]);

  // LiveKit reports actual track states; database queries remain authoritative for membership.
  useEffect(() => {
    const tracks = mediaService.onTrackStateChange(states => {
      setTrackStates(states);
      const local = mediaService.getLocalMediaState();
      setIsMicOn(local.isAudioEnabled);
      setIsCameraOn(local.isVideoEnabled);
      setIsScreenSharing(local.isScreenShareEnabled);
    });
    const connection = mediaService.onConnectionStateChange(setConnectionState);
    return () => {
      tracks();
      connection();
    };
  }, []);
  useEffect(() => {
    if (exitShown.current) return;
    const exit = (summary: boolean) => {
      if (exitShown.current) return;
      exitShown.current = true;
      void mediaService.disconnect();
      if (summary) {
        navigation.replace(ROUTES.MEETING_SUMMARY, { meetingId });
      } else {
        feedback.alert(
          'Meeting access ended',
          'You are no longer admitted to this meeting.',
        );
        navigation.replace(ROUTES.DASHBOARD);
      }
    };
    if (meeting?.status === 'ended' || meeting?.status === 'cancelled') {
      exit(true);
    } else if (myParticipant?.status === 'removed') {
      exit(false);
    } else if (myParticipant?.status === 'left') {
      // Membership polls faster than meeting details. Ending a meeting marks
      // participants left, so refresh its status before choosing an exit route.
      void mediaService.disconnect();
      let disposed = false;
      void refetchMeeting()
        .unwrap()
        .then(fresh => {
          if (!disposed)
            exit(fresh.status === 'ended' || fresh.status === 'cancelled');
        })
        .catch(() => {
          if (!disposed)
            setMediaError('Could not confirm the meeting status. Retrying?');
        });
      return () => {
        disposed = true;
      };
    }
  }, [
    meeting?.status,
    myParticipant?.status,
    meetingId,
    navigation,
    refetchMeeting,
  ]);
  useEffect(() => {
    setIsHandRaised(!!myParticipant?.media.isHandRaised);
  }, [myParticipant?.media.isHandRaised]);
  useEffect(() => {
    setIsLocked(!!meeting?.isLocked);
  }, [meeting?.isLocked]);

  const isMeetingHost =
    (meeting?.hostId ?? meeting?.organizerId) === currentUserId;
  const isMeetingCoHost = myParticipant?.role === 'co_host';
  const isHostOrCoHost = isMeetingHost || isMeetingCoHost;

  const myRole: UserMeetingRole = isMeetingHost
    ? 'host'
    : isMeetingCoHost
    ? 'co_host'
    : myParticipant?.role ?? 'participant';

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
  useEffect(() => {
    if (connectionState !== 'connected') return;
    const local = mediaService.getLocalMediaState();
    if (!myPermissions.microphone && local.isAudioEnabled)
      void mediaService.toggleMicrophone(false).catch(() => {});
    if (!myPermissions.camera && local.isVideoEnabled)
      void mediaService.toggleCamera(false).catch(() => {});
    if (!myPermissions.screenShare && local.isScreenShareEnabled)
      void mediaService.toggleScreenShare(false).catch(() => {});
  }, [myPermissions, connectionState]);

  // Filter participant subsets
  const inMeetingParticipants = useMemo(
    () => participants.filter(p => p.status === 'in_meeting'),
    [participants],
  );

  const lobbyParticipants = useMemo(
    () => participants.filter(p => p.status === 'in_lobby'),
    [participants],
  );

  const raisedHandParticipants = useMemo(
    () => inMeetingParticipants.filter(p => p.media.isHandRaised),
    [inMeetingParticipants],
  );

  const pendingRequests = useMemo(
    () => permissionRequests.filter(r => r.status === 'pending'),
    [permissionRequests],
  );

  // Request permission from host
  const handleRequestPermission = useCallback(
    async (permission: 'microphone' | 'camera' | 'screenShare' | 'chat') => {
      try {
        await requestPermission({ meetingId, permission }).unwrap();
        feedback.alert(
          'Request Sent',
          `Your request for ${permission} permission has been sent to the host.`,
        );
      } catch (err: unknown) {
        const msg =
          typeof err === 'object' && err !== null && 'message' in err
            ? (err as { message: string }).message
            : 'Could not send permission request';
        feedback.alert('Request Failed', msg);
      }
    },
    [meetingId, requestPermission],
  );

  // Mic controls
  const handleToggleMic = useCallback(async () => {
    if (!myPermissions.microphone && !isHostOrCoHost) {
      feedback.alert(
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
    try {
      if (await mediaService.toggleMicrophone(next)) setIsMicOn(next);
    } catch (error) {
      feedback.alert(
        'Microphone',
        error instanceof Error ? error.message : 'Could not enable microphone',
      );
    }
  }, [
    isMicOn,
    myPermissions.microphone,
    isHostOrCoHost,
    handleRequestPermission,
  ]);

  // Camera controls
  const handleToggleCamera = useCallback(async () => {
    if (!myPermissions.camera && !isHostOrCoHost) {
      feedback.alert(
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
    try {
      if (await mediaService.toggleCamera(next)) setIsCameraOn(next);
    } catch (error) {
      feedback.alert(
        'Camera',
        error instanceof Error ? error.message : 'Could not enable camera',
      );
    }
  }, [
    isCameraOn,
    myPermissions.camera,
    isHostOrCoHost,
    handleRequestPermission,
  ]);

  // Screen share controls
  const handleToggleScreenShare = useCallback(async () => {
    if (!myPermissions.screenShare && !isHostOrCoHost) {
      feedback.alert(
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
    try {
      if (await mediaService.toggleScreenShare(next)) setIsScreenSharing(next);
    } catch (error) {
      feedback.alert(
        'Screen sharing',
        error instanceof Error ? error.message : 'Could not share the screen',
      );
    }
  }, [
    isScreenSharing,
    myPermissions.screenShare,
    isHostOrCoHost,
    handleRequestPermission,
  ]);

  // Raise hand
  const handleToggleRaiseHand = useCallback(async () => {
    try {
      await conferenceCommand('raise_hand', {
        meetingId,
        raised: !isHandRaised,
      });
      setIsHandRaised(!isHandRaised);
      void refetchParticipants();
    } catch {
      feedback.alert('Error', 'Could not update raised hand');
    }
  }, [meetingId, isHandRaised, refetchParticipants]);
  const handleLowerHand = useCallback(
    async (participantId: string) => {
      try {
        await conferenceCommand('lower_hand', { meetingId, participantId });
        void refetchParticipants();
      } catch {
        feedback.alert('Error', 'Could not lower the raised hand');
      }
    },
    [meetingId, refetchParticipants],
  );

  // Send chat message
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!myPermissions.chat && !isHostOrCoHost) {
        feedback.alert(
          'Chat Disabled',
          'Chat is disabled for participants in this meeting.',
        );
        return false;
      }
      try {
        await sendChatMessage({ meetingId, content: text }).unwrap();
        return true;
      } catch {
        feedback.alert('Error', 'Failed to send message');
        return false;
      }
    },
    [meetingId, myPermissions.chat, isHostOrCoHost, sendChatMessage],
  );

  // Host moderation: Admit / Deny
  const handleSendAnnouncement = useCallback(
    async (content: string) => {
      try {
        await conferenceCommand('send_announcement', { meetingId, content });
        return true;
      } catch {
        feedback.alert('Error', 'Could not send announcement');
        return false;
      }
    },
    [meetingId],
  );
  const handleAdmit = useCallback(
    async (participantId: string) => {
      try {
        await admitParticipant({
          meetingId,
          participantId,
          decision: 'admit',
        }).unwrap();
        refetchParticipants();
      } catch (err: unknown) {
        feedback.alert('Error', 'Could not admit participant');
      }
    },
    [meetingId, admitParticipant, refetchParticipants],
  );

  const handleDeny = useCallback(
    async (participantId: string) => {
      try {
        await admitParticipant({
          meetingId,
          participantId,
          decision: 'deny',
        }).unwrap();
        refetchParticipants();
      } catch (err: unknown) {
        feedback.alert('Error', 'Could not deny participant');
      }
    },
    [meetingId, admitParticipant, refetchParticipants],
  );

  // Host moderation: Remove
  const handleRemoveParticipant = useCallback(
    async (participantId: string) => {
      feedback.alert(
        'Remove Participant',
        'Are you sure you want to remove this participant from the meeting?',
        [
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
                feedback.alert('Error', 'Could not remove participant');
              }
            },
          },
        ],
      );
    },
    [meetingId, removeParticipant, refetchParticipants],
  );

  // Host moderation: Role promotion / demotion
  const handleChangeRole = useCallback(
    async (participantId: string, newRole: 'co_host' | 'participant') => {
      try {
        await changeParticipantRole({
          meetingId,
          participantId,
          newRole,
        }).unwrap();
        setSelectedParticipant(null);
        refetchParticipants();
        feedback.alert(
          'Role Updated',
          `Participant role changed to ${
            newRole === 'co_host' ? 'Co-Host' : 'Participant'
          }.`,
        );
      } catch {
        feedback.alert('Error', 'Could not change participant role');
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
        feedback.alert('Error', 'Could not mute participant');
      }
    },
    [meetingId, updateParticipantPermissions, refetchParticipants],
  );

  // Host moderation: Bulk mute all
  const handleMuteAll = useCallback(async () => {
    feedback.alert('Mute All', 'Mute microphones for all participants?', [
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
            feedback.alert('Success', 'All participants have been muted.');
          } catch {
            feedback.alert('Error', 'Failed to mute all');
          }
        },
      },
    ]);
  }, [meetingId, bulkUpdatePermissions, refetchParticipants]);

  // Host moderation: Bulk stop cameras
  const handleStopAllCameras = useCallback(async () => {
    feedback.alert(
      'Disable All Cameras',
      'Turn off cameras for all participants?',
      [
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
              feedback.alert('Success', 'All participant cameras disabled.');
            } catch {
              feedback.alert('Error', 'Failed to disable cameras');
            }
          },
        },
      ],
    );
  }, [meetingId, bulkUpdatePermissions, refetchParticipants]);

  // Host moderation: Permission approval / denial
  const handleDecidePermission = useCallback(
    async (
      requestId: string,
      decision: 'approved' | 'denied' | 'approve' | 'deny',
    ) => {
      try {
        const mappedDecision: 'approve' | 'deny' =
          decision === 'approved' || decision === 'approve'
            ? 'approve'
            : 'deny';
        await decidePermissionRequest({
          meetingId,
          requestId,
          decision: mappedDecision,
        }).unwrap();
        refetchPermissions();
        refetchParticipants();
      } catch {
        feedback.alert('Error', 'Could not update request decision');
      }
    },
    [
      meetingId,
      decidePermissionRequest,
      refetchPermissions,
      refetchParticipants,
    ],
  );

  // Host moderation: Toggle Lock
  const handleToggleLockMeeting = useCallback(async () => {
    try {
      await bulkUpdatePermissions({
        meetingId,
        action: { kind: 'lock_meeting', locked: !isLocked },
      }).unwrap();
      setIsLocked(!isLocked);
    } catch {
      feedback.alert('Error', 'Could not change the meeting lock');
    }
  }, [isLocked, meetingId, bulkUpdatePermissions]);

  // Leave meeting (self)
  const handleLeaveMeeting = useCallback(() => {
    feedback.alert(
      'Leave Meeting',
      'Are you sure you want to leave this meeting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await conferenceCommand('leave_meeting', { meetingId });
              await mediaService.disconnect();
              navigation.replace(ROUTES.DASHBOARD);
            } catch {
              feedback.alert(
                'Error',
                'Could not leave the meeting. Please retry.',
              );
            }
          },
        },
      ],
    );
  }, [navigation, meetingId]);

  // End meeting for everyone (Host only)
  const handleEndMeetingForAll = useCallback(() => {
    feedback.alert(
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
              feedback.alert('Error', msg);
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
    connectionState,
    mediaError,
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
    handleLowerHand,
    handleRequestPermission,
    handleSendMessage,
    handleSendAnnouncement,
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

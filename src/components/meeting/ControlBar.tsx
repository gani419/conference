import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { UserMeetingRole, ParticipantPermissions } from '../../types/meeting';

export interface ControlBarProps {
  userRole: UserMeetingRole;
  myPermissions: ParticipantPermissions;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  activePanelTab: string;
  onToggleMic: () => void | Promise<void>;
  onRequestMicPermission: () => void | Promise<void>;
  onToggleCamera: () => void | Promise<void>;
  onRequestCameraPermission: () => void | Promise<void>;
  onToggleScreenShare: () => void | Promise<void>;
  onRequestScreenSharePermission: () => void | Promise<void>;
  onToggleChatPanel: () => void | Promise<void>;
  onToggleParticipantsPanel: () => void | Promise<void>;
  onToggleRaiseHand: () => void | Promise<void>;
  onLeavePress: () => void | Promise<void>;

  // Host bulk actions
  onMuteAll?: (() => void) | (() => Promise<void>) | undefined;
  onStopCameras?: (() => void) | (() => Promise<void>) | undefined;
  onToggleLockEntry?: (() => void) | (() => Promise<void>) | undefined;
  isLocked?: boolean | undefined;
  onBroadcastAnnouncement?: (() => void) | (() => Promise<void>) | undefined;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  userRole,
  myPermissions,
  isMicOn,
  isCameraOn,
  isScreenSharing,
  isHandRaised,
  activePanelTab,
  onToggleMic,
  onRequestMicPermission,
  onToggleCamera,
  onRequestCameraPermission,
  onToggleScreenShare,
  onRequestScreenSharePermission,
  onToggleChatPanel,
  onToggleParticipantsPanel,
  onToggleRaiseHand,
  onLeavePress,
  onMuteAll,
  onStopCameras,
  onToggleLockEntry,
  isLocked = false,
  onBroadcastAnnouncement,
}) => {
  const { tokens } = useResolvedTheme();
  const isHost = userRole === 'host' || userRole === 'co_host';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.surface,
          borderTopColor: tokens.border,
        },
      ]}
    >
      {/* Mic Button */}
      <TouchableOpacity
        onPress={myPermissions.microphone ? onToggleMic : onRequestMicPermission}
        style={[
          styles.actionItem,
          !myPermissions.microphone && styles.actionItemRestricted,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Microphone"
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: !myPermissions.microphone
                ? tokens.surfaceSubtle
                : isMicOn
                ? tokens.primaryLight
                : tokens.dangerBg,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>
            {!myPermissions.microphone ? '🔒' : isMicOn ? '🎙️' : '🔇'}
          </Text>
        </View>
        <Text style={[styles.actionLabel, { color: tokens.textMain }]}>
          {!myPermissions.microphone ? 'Request Mic' : isMicOn ? 'Mute' : 'Unmute'}
        </Text>
      </TouchableOpacity>

      {/* Camera Button */}
      <TouchableOpacity
        onPress={myPermissions.camera ? onToggleCamera : onRequestCameraPermission}
        style={[
          styles.actionItem,
          !myPermissions.camera && styles.actionItemRestricted,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Camera"
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: !myPermissions.camera
                ? tokens.surfaceSubtle
                : isCameraOn
                ? tokens.primaryLight
                : tokens.dangerBg,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>
            {!myPermissions.camera ? '🔒' : isCameraOn ? '📹' : '🚫'}
          </Text>
        </View>
        <Text style={[styles.actionLabel, { color: tokens.textMain }]}>
          {!myPermissions.camera ? 'Request Cam' : isCameraOn ? 'Stop Video' : 'Start Video'}
        </Text>
      </TouchableOpacity>

      {/* Screen Share Button */}
      <TouchableOpacity
        onPress={myPermissions.screenShare ? onToggleScreenShare : onRequestScreenSharePermission}
        style={styles.actionItem}
        accessibilityRole="button"
        accessibilityLabel="Screen share"
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isScreenSharing ? tokens.primary : tokens.surfaceSubtle,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>🖥️</Text>
        </View>
        <Text style={[styles.actionLabel, { color: tokens.textMain }]}>
          {isScreenSharing ? 'Sharing' : 'Share'}
        </Text>
      </TouchableOpacity>

      {/* Chat Button */}
      <TouchableOpacity
        onPress={onToggleChatPanel}
        style={styles.actionItem}
        accessibilityRole="button"
        accessibilityLabel="Chat"
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: activePanelTab === 'chat' ? tokens.primaryLight : tokens.surfaceSubtle,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>💬</Text>
        </View>
        <Text style={[styles.actionLabel, { color: tokens.textMain }]}>Chat</Text>
      </TouchableOpacity>

      {/* Participants Button */}
      <TouchableOpacity
        onPress={onToggleParticipantsPanel}
        style={styles.actionItem}
        accessibilityRole="button"
        accessibilityLabel="Participants"
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor:
                activePanelTab === 'participants' || activePanelTab === 'requests'
                  ? tokens.primaryLight
                  : tokens.surfaceSubtle,
            },
          ]}
        >
          <Text style={styles.iconEmoji}>👥</Text>
        </View>
        <Text style={[styles.actionLabel, { color: tokens.textMain }]}>People</Text>
      </TouchableOpacity>

      {/* Raise Hand (Participants) or Host Actions (Mute all / Lock / Broadcast) */}
      {!isHost ? (
        <TouchableOpacity
          onPress={onToggleRaiseHand}
          style={styles.actionItem}
          accessibilityRole="button"
          accessibilityLabel="Raise hand"
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isHandRaised ? '#FEF08A' : tokens.surfaceSubtle,
              },
            ]}
          >
            <Text style={styles.iconEmoji}>✋</Text>
          </View>
          <Text style={[styles.actionLabel, { color: tokens.textMain }]}>
            {isHandRaised ? 'Lower' : 'Raise'}
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          {onMuteAll && (
            <TouchableOpacity
              onPress={onMuteAll}
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="Mute all"
            >
              <View style={[styles.iconCircle, { backgroundColor: tokens.surfaceSubtle }]}>
                <Text style={styles.iconEmoji}>🔇</Text>
              </View>
              <Text style={[styles.actionLabel, { color: tokens.textMain }]}>Mute all</Text>
            </TouchableOpacity>
          )}

          {onBroadcastAnnouncement && (
            <TouchableOpacity
              onPress={onBroadcastAnnouncement}
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="Broadcast announcement"
            >
              <View style={[styles.iconCircle, { backgroundColor: tokens.surfaceSubtle }]}>
                <Text style={styles.iconEmoji}>📢</Text>
              </View>
              <Text style={[styles.actionLabel, { color: tokens.textMain }]}>Broadcast</Text>
            </TouchableOpacity>
          )}
          {onStopCameras&&<TouchableOpacity onPress={onStopCameras} style={styles.actionItem} accessibilityRole="button" accessibilityLabel="Stop all cameras">
            <Text style={[styles.actionLabel,{color:tokens.textMain}]}>Stop cameras</Text>
          </TouchableOpacity>}
          {onToggleLockEntry&&<TouchableOpacity onPress={onToggleLockEntry} style={styles.actionItem} accessibilityRole="button" accessibilityLabel={isLocked?'Unlock meeting':'Lock meeting'}>
            <Text style={[styles.actionLabel,{color:tokens.textMain}]}>{isLocked?'Unlock':'Lock'}</Text>
          </TouchableOpacity>}
        </>
      )}

      {/* Leave / End Button */}
      <TouchableOpacity
        onPress={onLeavePress}
        style={styles.actionItem}
        accessibilityRole="button"
        accessibilityLabel={isHost ? 'End meeting' : 'Leave meeting'}
      >
        <View style={[styles.iconCircle, { backgroundColor: tokens.danger }]}>
          <Text style={styles.leaveIcon}>📞</Text>
        </View>
        <Text style={[styles.actionLabel, { color: tokens.danger }]}>
          {isHost ? 'End' : 'Leave'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 78,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  actionItemRestricted: {
    opacity: 0.85,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconEmoji: {
    fontSize: 20,
  },
  leaveIcon: {
    fontSize: 20,
    transform: [{ rotate: '135deg' }],
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});

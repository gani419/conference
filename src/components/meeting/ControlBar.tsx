import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { UserMeetingRole, ParticipantPermissions } from '../../types/meeting';
import { AppIcon } from '../icons/AppIcon';
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
  onEndMeetingPress?: (() => void | Promise<void>) | undefined;
  onLeavePress: () => void | Promise<void>;

  // Host bulk actions
  onMuteAll?: (() => void) | (() => Promise<void>) | undefined;
  onStopCameras?: (() => void) | (() => Promise<void>) | undefined;
  onToggleLockEntry?: (() => void) | (() => Promise<void>) | undefined;
  isLocked?: boolean | undefined;
  onBroadcastAnnouncement?: (() => void) | (() => Promise<void>) | undefined;
}


export const ControlBar: React.FC<ControlBarProps> = props => {
  const { tokens } = useResolvedTheme();
  const { width } = useLayoutMode();
  const compact = width < 600;
  const host = props.userRole === 'host' || props.userRole === 'co_host';
  type Action = { label: string; icon: string; onPress: () => void | Promise<void>; active?: boolean; danger?: boolean };
  const actions: Action[] = [
    { label: !props.myPermissions.microphone ? 'Request microphone' : props.isMicOn ? 'Mute microphone' : 'Unmute microphone', icon: props.isMicOn ? 'mic' : 'mic-off', onPress: props.myPermissions.microphone ? props.onToggleMic : props.onRequestMicPermission, active: props.isMicOn },
    { label: !props.myPermissions.camera ? 'Request camera' : props.isCameraOn ? 'Stop camera' : 'Start camera', icon: props.isCameraOn ? 'video' : 'video-off', onPress: props.myPermissions.camera ? props.onToggleCamera : props.onRequestCameraPermission, active: props.isCameraOn },
    { label: props.isScreenSharing ? 'Stop sharing' : 'Share screen', icon: 'monitor-up', onPress: props.myPermissions.screenShare ? props.onToggleScreenShare : props.onRequestScreenSharePermission, active: props.isScreenSharing },
    { label: 'Chat', icon: 'message-circle', onPress: props.onToggleChatPanel, active: props.activePanelTab === 'chat' },
    { label: 'Participants', icon: 'users', onPress: props.onToggleParticipantsPanel, active: props.activePanelTab === 'participants' },
    { label: props.isHandRaised ? 'Lower hand' : 'Raise hand', icon: 'hand', onPress: props.onToggleRaiseHand, active: props.isHandRaised },
  ];
  if (host) {
    if (props.onMuteAll) actions.push({ label: 'Mute all', icon: 'mic-off', onPress: props.onMuteAll });
    if (props.onStopCameras) actions.push({ label: 'Stop all cameras', icon: 'video-off', onPress: props.onStopCameras });
    if (props.onToggleLockEntry) actions.push({ label: props.isLocked ? 'Unlock meeting' : 'Lock meeting', icon: props.isLocked ? 'unlock' : 'lock', onPress: props.onToggleLockEntry });
    if (props.onBroadcastAnnouncement) actions.push({ label: 'Announcement', icon: 'megaphone', onPress: props.onBroadcastAnnouncement });
  }
  actions.push({ label: 'Leave meeting', icon: 'phone-off', onPress: props.onLeavePress, danger: true });
  if (host && props.onEndMeetingPress) actions.push({ label: 'End for everyone', icon: 'circle-stop', onPress: props.onEndMeetingPress, danger: true });
  return <View style={[styles.container, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
    {actions.map(action => <TouchableOpacity key={action.label} accessibilityRole="button" accessibilityLabel={action.label} accessibilityState={{ selected: !!action.active }} onPress={action.onPress} style={[styles.item, compact ? styles.compactItem : styles.wideItem]}>
      <View style={[styles.icon, { backgroundColor: action.danger ? tokens.dangerBg : action.active ? tokens.primaryLight : tokens.surfaceSubtle }]}><AppIcon name={action.icon} size={23} color={action.danger ? tokens.danger : action.active ? tokens.primary : tokens.textMain} /></View>
      {!compact && <Text style={[styles.label, { color: action.danger ? tokens.danger : tokens.textMain }]}>{action.label}</Text>}
    </TouchableOpacity>)}
  </View>;
};
const styles = StyleSheet.create({ container: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, rowGap: 8 }, item: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: 4 }, compactItem: { width: '25%' }, wideItem: { minWidth: 90, flexGrow: 1, flexBasis: 90 }, icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, label: { fontSize: 11, fontWeight: '600', textAlign: 'center' } });

import { AppIcon } from '../icons/AppIcon';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MeetingParticipant } from '../../types/participant';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { getAvatarDefinition } from '../../constants/avatars';
import { LiveVideo } from './LiveVideo';

export interface ParticipantTileProps {
  participant: MeetingParticipant;
  isSpeaking?: boolean;
  isSelf?: boolean;
  isPinned?: boolean;
  onPinPress?: () => void;
  onParticipantPress?: () => void;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isSpeaking = false,
  isSelf = false,
  isPinned = false,
  onPinPress,
  onParticipantPress,
}) => {
  const { tokens } = useResolvedTheme();
  const avatarDef = getAvatarDefinition(participant.avatarId);

  const tileContent = (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: tokens.surface,
          borderColor: isSpeaking ? tokens.success : isPinned ? tokens.primary : tokens.border,
          borderWidth: isSpeaking || isPinned ? 2 : 1,
        },
      ]}
    >
      {/* Pin button / badge */}
      {onPinPress && (
        <TouchableOpacity
          onPress={onPinPress}
          style={[styles.pinBadge, { backgroundColor: isPinned ? tokens.primary : 'rgba(0,0,0,0.5)' }]}
          accessibilityLabel={isPinned ? 'Unpin participant' : 'Pin participant'}
        >
          <AppIcon style={styles.pinIcon} name={isPinned ? 'pin' : 'pin-off'} />
        </TouchableOpacity>
      )}
      {/* Video preview / Avatar Fallback */}
      <View
        style={[
          styles.avatarContainer,
          {
            backgroundColor: avatarDef.backgroundColor,
          },
        ]}
      >
        <AppIcon name="user" color={avatarDef.textColor} size={44} />
      </View>

      {/* Hand Raised Badge */}
      <LiveVideo userId={participant.userId} />
      {participant.media.isHandRaised && (
        <View style={styles.handBadge}>
          <AppIcon style={styles.handIcon} name="hand" />
        </View>
      )}

      {/* Name and Mic Status Tag */}
      <View style={styles.bottomBar}>
        <View style={styles.nameTag}>
          <Text style={styles.nameText} numberOfLines={1}>
            {participant.displayName}
            {isSelf ? ' (You)' : ''}
          </Text>
          {participant.role === 'host' && <Text style={styles.roleTag}>Host</Text>}
          {participant.role === 'co_host' && <Text style={styles.roleTag}>Co-host</Text>}
        </View>
        <View style={styles.micBadge}>
          <AppIcon style={styles.micIcon} name={participant.media.isMuted ? 'mic-off' : 'mic'} />
        </View>
      </View>
    </View>
  );

  if (onParticipantPress) {
    return (
      <TouchableOpacity
        onPress={onParticipantPress}
        activeOpacity={0.85}
        style={{ flex: 1 }}
      >
        {tileContent}
      </TouchableOpacity>
    );
  }

  return tileContent;
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    minWidth: 120,
    flex: 1,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  handBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FEF08A',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  handIcon: {
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '80%',
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  roleTag: {
    color: '#A5B4FC',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  micBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    fontSize: 10,
  },
  pinBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pinIcon: {
    fontSize: 12,
  },
});

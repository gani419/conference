import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MeetingParticipant } from '../../types/participant';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { getAvatarDefinition } from '../../constants/avatars';

export interface RaisedHandsQueueProps {
  participants?: MeetingParticipant[];
  participantsWithHandsRaised?: MeetingParticipant[];
  onInviteToSpeak?: (participantId: string) => void | Promise<void>;
  onLowerHand: (participantId: string) => void | Promise<void>;
}

export const RaisedHandsQueue: React.FC<RaisedHandsQueueProps> = ({
  participants,
  participantsWithHandsRaised,
  onInviteToSpeak,
  onLowerHand,
}) => {
  const { tokens } = useResolvedTheme();

  const handsRaised =
    participantsWithHandsRaised ??
    (participants ?? []).filter((p) => p.media.isHandRaised && p.status === 'in_meeting');

  if (handsRaised.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: tokens.textMuted }]}>No raised hands.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: tokens.textMuted }]}>
        Raised Hands In Order ({handsRaised.length})
      </Text>
      {handsRaised.map((p, index) => {
        const avatarDef = getAvatarDefinition(p.avatarId);
        return (
          <View
            key={p.id}
            style={[
              styles.itemRow,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.border,
              },
            ]}
          >
            <View style={[styles.orderBadge, { backgroundColor: tokens.primaryLight }]}>
              <Text style={[styles.orderText, { color: tokens.primary }]}>#{index + 1}</Text>
            </View>
            <View style={[styles.avatarCircle, { backgroundColor: avatarDef.backgroundColor }]}>
              <Text style={[styles.avatarText, { color: avatarDef.textColor }]}>
                {avatarDef.initials}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: tokens.textMain }]} numberOfLines={1}>
                {p.displayName}
              </Text>
              <Text style={[styles.statusText, { color: tokens.textMuted }]}>
                Wants to speak
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => onLowerHand(p.id)}
                style={[styles.lowerBtn, { borderColor: tokens.border }]}
              >
                <Text style={[styles.lowerText, { color: tokens.textMuted }]}>Lower</Text>
              </TouchableOpacity>
              {onInviteToSpeak && (
                <TouchableOpacity
                  onPress={() => onInviteToSpeak(p.id)}
                  style={[styles.inviteBtn, { backgroundColor: tokens.primary }]}
                >
                  <Text style={styles.inviteText}>Invite</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  orderText: {
    fontSize: 11,
    fontWeight: '800',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  lowerBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lowerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inviteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inviteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

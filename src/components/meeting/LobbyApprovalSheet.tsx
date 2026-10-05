import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MeetingParticipant } from '../../types/participant';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { getAvatarDefinition } from '../../constants/avatars';

export interface LobbyApprovalSheetProps {
  lobbyParticipants: MeetingParticipant[];
  onAdmit: (participantId: string) => void;
  onDeny: (participantId: string) => void;
}

export const LobbyApprovalSheet: React.FC<LobbyApprovalSheetProps> = ({
  lobbyParticipants,
  onAdmit,
  onDeny,
}) => {
  const { tokens } = useResolvedTheme();

  if (lobbyParticipants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
          No one is waiting in the lobby.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: tokens.textMuted }]}>
        People in lobby ({lobbyParticipants.length})
      </Text>
      {lobbyParticipants.map((p) => {
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
                Waiting to join
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => onDeny(p.id)}
                style={[styles.denyBtn, { borderColor: tokens.border }]}
              >
                <Text style={[styles.denyText, { color: tokens.danger }]}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAdmit(p.id)}
                style={[styles.approveBtn, { backgroundColor: tokens.primary }]}
              >
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
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
  denyBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  denyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

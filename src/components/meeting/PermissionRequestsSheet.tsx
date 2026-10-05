import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PermissionRequest, PermissionKind } from '../../types/permission';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { getAvatarDefinition } from '../../constants/avatars';

export interface PermissionRequestsSheetProps {
  requests: PermissionRequest[];
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
}

export const PermissionRequestsSheet: React.FC<PermissionRequestsSheetProps> = ({
  requests,
  onApprove,
  onDeny,
}) => {
  const { tokens } = useResolvedTheme();
  const [filter, setFilter] = useState<'all' | PermissionKind>('all');

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const filtered = pendingRequests.filter((r) => (filter === 'all' ? true : r.permission === filter));

  const filterTabs: { label: string; value: 'all' | PermissionKind }[] = [
    { label: `All (${pendingRequests.length})`, value: 'all' },
    { label: 'Mic', value: 'microphone' },
    { label: 'Camera', value: 'camera' },
    { label: 'Screen', value: 'screenShare' },
    { label: 'Chat', value: 'chat' },
  ];

  if (pendingRequests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
          No pending permission requests.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: tokens.textMuted }]}>
        Permission Requests ({pendingRequests.length})
      </Text>

      {/* Filter Chips */}
      <View style={styles.chipRow}>
        {filterTabs.map((tab) => {
          const isSelected = filter === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              onPress={() => setFilter(tab.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? tokens.primary : tokens.surfaceSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#FFFFFF' : tokens.textMain },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Requests List */}
      {filtered.map((req) => {
        const avatarDef = getAvatarDefinition(req.participantAvatarId);
        const permissionLabel =
          req.permission === 'microphone'
            ? 'wants to speak'
            : req.permission === 'camera'
            ? 'wants to turn on camera'
            : req.permission === 'screenShare'
            ? 'wants to share screen'
            : 'wants to send chat messages';

        const permissionIcon =
          req.permission === 'microphone'
            ? '🎙️'
            : req.permission === 'camera'
            ? '📹'
            : req.permission === 'screenShare'
            ? '🖥️'
            : '💬';

        return (
          <View
            key={req.id}
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
                {req.participantName}
              </Text>
              <View style={styles.permRow}>
                <Text style={styles.permIcon}>{permissionIcon}</Text>
                <Text style={[styles.permText, { color: tokens.textMuted }]}>
                  {permissionLabel}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => onDeny(req.id)}
                style={[styles.denyBtn, { borderColor: tokens.border }]}
              >
                <Text style={[styles.denyText, { color: tokens.danger }]}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onApprove(req.id)}
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
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
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
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  permIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  permText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  denyBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  denyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export type BadgeVariant =
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'cancelled'
  | 'host'
  | 'co_host'
  | 'guest'
  | 'participant';

export interface StatusBadgeProps {
  variant?: BadgeVariant;
  status?: BadgeVariant;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, status, label }) => {
  const { tokens } = useResolvedTheme();
  const effectiveVariant = (status || variant || 'scheduled') as BadgeVariant;

  const getBadgeStyle = (): { bg: string; text: string; defaultLabel: string } => {
    switch (effectiveVariant) {
      case 'live':
        return { bg: tokens.dangerBg, text: tokens.danger, defaultLabel: '● Live' };
      case 'scheduled':
        return { bg: tokens.primaryLight, text: tokens.primary, defaultLabel: 'Scheduled' };
      case 'ended':
        return { bg: tokens.surfaceSubtle, text: tokens.textMuted, defaultLabel: 'Ended' };
      case 'cancelled':
        return { bg: tokens.dangerBg, text: tokens.danger, defaultLabel: 'Cancelled' };
      case 'host':
        return { bg: tokens.primaryLight, text: tokens.primary, defaultLabel: 'Host' };
      case 'co_host':
        return { bg: '#FDF2F8', text: '#DB2777', defaultLabel: 'Co-host' };
      case 'guest':
        return { bg: '#F0FDF4', text: '#16A34A', defaultLabel: 'Guest' };
      case 'participant':
        return { bg: tokens.surfaceSubtle, text: tokens.textMuted, defaultLabel: 'Participant' };
      default:
        return { bg: tokens.surfaceSubtle, text: tokens.textMuted, defaultLabel: effectiveVariant || 'Status' };
    }
  };

  const config = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{label || config.defaultLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});

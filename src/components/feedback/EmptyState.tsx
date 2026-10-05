import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { AppButton } from '../forms/AppButton';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  description,
  actionText,
  onAction,
}) => {
  const { tokens } = useResolvedTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: tokens.textMain }]}>{title}</Text>
      <Text style={[styles.description, { color: tokens.textMuted }]}>{description}</Text>
      {actionText && onAction && (
        <View style={styles.actionContainer}>
          <AppButton title={actionText} onPress={onAction} size="sm" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 44,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  actionContainer: {
    marginTop: 16,
    minWidth: 140,
  },
});

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => {
  const { tokens } = useResolvedTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: tokens.surface }]}>
        <ActivityIndicator size="large" color={tokens.primary} />
        {message && (
          <Text style={[styles.message, { color: tokens.textMain }]}>{message}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});

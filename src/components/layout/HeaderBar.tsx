import { AppIcon } from '../icons/AppIcon';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export type HeaderRightAction =
  | React.ReactNode
  | {
      label: string;
      onPress: () => void;
      disabled?: boolean;
    };

export interface HeaderBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: HeaderRightAction;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const navigation = useNavigation();
  const { tokens } = useResolvedTheme();

  const renderRightAction = () => {
    if (!rightAction) return null;
    if (React.isValidElement(rightAction)) {
      return rightAction;
    }
    if (typeof rightAction === 'object' && 'label' in rightAction && 'onPress' in rightAction) {
      const action = rightAction as { label: string; onPress: () => void; disabled?: boolean };
      return (
        <TouchableOpacity
          onPress={action.onPress}
          disabled={action.disabled}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={[styles.actionText, { color: tokens.primary }]}>{action.label}</Text>
        </TouchableOpacity>
      );
    }
    return rightAction as React.ReactNode;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.surface,
          borderBottomColor: tokens.border,
        },
      ]}
    >
      <View style={styles.leftSection}>
        {showBack && (
          <TouchableOpacity
            onPress={() => (onBack ? onBack() : navigation.goBack())}
            style={[styles.backButton, { backgroundColor: tokens.surfaceHover }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppIcon style={[styles.backIcon, { color: tokens.textMain }]} name="chevron-left" />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: tokens.textMain }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: tokens.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction ? <View style={styles.rightSection}>{renderRightAction()}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 26,
    fontWeight: '300',
    marginTop: -2,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  testID,
}) => {
  const { tokens } = useResolvedTheme();

  const getBackgroundColor = (): string => {
    if (disabled) {
      return tokens.surfaceSubtle;
    }
    switch (variant) {
      case 'primary':
        return tokens.primary;
      case 'secondary':
        return tokens.primaryLight;
      case 'danger':
        return tokens.danger;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return tokens.primary;
    }
  };

  const getTextColor = (): string => {
    if (disabled) {
      return tokens.textSubtle;
    }
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
      case 'outline':
      case 'ghost':
        return tokens.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getHeight = (): number => {
    switch (size) {
      case 'sm':
        return 36;
      case 'lg':
        return 52;
      case 'md':
      default:
        return 46;
    }
  };

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          height: getHeight(),
          borderColor: variant === 'outline' ? tokens.border : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <Text style={[styles.icon, { marginRight: 8 }]}>{icon}</Text>}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: size === 'sm' ? 13 : 15,
                fontWeight: size === 'sm' ? '600' : '700',
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  icon: {
    fontSize: 16,
  },
  text: {
    textAlign: 'center',
  },
});

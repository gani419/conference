import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AVATARS } from '../../constants/avatars';
import { AvatarId } from '../../types/common';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export interface AvatarPickerProps {
  selectedAvatarId: AvatarId;
  onSelectAvatar: (avatarId: AvatarId) => void;
  label?: string;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  selectedAvatarId,
  onSelectAvatar,
  label = 'Choose an avatar',
}) => {
  const { tokens } = useResolvedTheme();

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: tokens.textMain }]}>{label}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {AVATARS.map((avatar) => {
          const isSelected = avatar.id === selectedAvatarId;
          return (
            <TouchableOpacity
              key={avatar.id}
              onPress={() => onSelectAvatar(avatar.id)}
              style={[
                styles.avatarWrapper,
                isSelected && {
                  borderColor: tokens.primary,
                  backgroundColor: tokens.primaryLight,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select avatar ${avatar.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={[styles.avatarCircle, { backgroundColor: avatar.backgroundColor }]}>
                <Text style={[styles.initials, { color: avatar.textColor }]}>
                  {avatar.initials}
                </Text>
              </View>
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: tokens.primary }]}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  scrollList: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  avatarWrapper: {
    padding: 3,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 16,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});

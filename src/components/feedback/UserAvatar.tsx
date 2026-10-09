import React from 'react';
import { View } from 'react-native';
import { getAvatarDefinition } from '../../constants/avatars';
import { AppIcon } from '../icons/AppIcon';
export function UserAvatar({ avatarId, size = 48 }: { avatarId?: string | undefined; size?: number }) {
  const avatar = getAvatarDefinition(avatarId);
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.backgroundColor, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="user" size={size * 0.55} color={avatar.textColor} /></View>;
}
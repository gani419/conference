import { AvatarId } from '../types/common';

export interface AvatarDefinition {
  id: AvatarId;
  label: string;
  initials: string;
  emoji: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

export const AVATARS: AvatarDefinition[] = [
  {
    id: 'avatar-1',
    label: 'Taylor (Purple)',
    initials: 'TK',
    emoji: '👤',
    backgroundColor: '#8B5CF6',
    textColor: '#FFFFFF',
    accentColor: '#DDD6FE',
  },
  {
    id: 'avatar-2',
    label: 'Jordan (Blue)',
    initials: 'JL',
    emoji: '👤',
    backgroundColor: '#3B82F6',
    textColor: '#FFFFFF',
    accentColor: '#BFDBFE',
  },
  {
    id: 'avatar-3',
    label: 'Priya (Amber)',
    initials: 'PS',
    emoji: '👤',
    backgroundColor: '#F59E0B',
    textColor: '#FFFFFF',
    accentColor: '#FDE68A',
  },
  {
    id: 'avatar-4',
    label: 'Alex (Indigo)',
    initials: 'AC',
    emoji: '👤',
    backgroundColor: '#4F46E5',
    textColor: '#FFFFFF',
    accentColor: '#C7D2FE',
  },
  {
    id: 'avatar-5',
    label: 'Casey (Emerald)',
    initials: 'CP',
    emoji: '👤',
    backgroundColor: '#10B981',
    textColor: '#FFFFFF',
    accentColor: '#A7F3D0',
  },
  {
    id: 'avatar-6',
    label: 'Morgan (Rose)',
    initials: 'MR',
    emoji: '👤',
    backgroundColor: '#F43F5E',
    textColor: '#FFFFFF',
    accentColor: '#FECDD3',
  },
  {
    id: 'avatar-7',
    label: 'Riley (Cyan)',
    initials: 'RC',
    emoji: '👤',
    backgroundColor: '#06B6D4',
    textColor: '#FFFFFF',
    accentColor: '#CFFAFE',
  },
  {
    id: 'avatar-8',
    label: 'Sam (Orange)',
    initials: 'SO',
    emoji: '👤',
    backgroundColor: '#EA580C',
    textColor: '#FFFFFF',
    accentColor: '#FED7AA',
  },
];

export const DEFAULT_AVATAR_ID: AvatarId = 'avatar-1';

export function getAvatarDefinition(avatarId?: AvatarId): AvatarDefinition {
  const found = AVATARS.find((a) => a.id === avatarId);
  if (found) {
    return found;
  }
  return AVATARS[0] ?? {
    id: 'avatar-1',
    label: 'Default',
    initials: 'U',
    emoji: '👤',
    backgroundColor: '#4F46E5',
    textColor: '#FFFFFF',
    accentColor: '#EEF2FF',
  };
}

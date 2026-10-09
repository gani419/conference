type AvatarId = string;

export interface AvatarDefinition {
  id: AvatarId;
  label: string;
  initials: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

export const AVATARS: AvatarDefinition[] = [
  {
    id: 'avatar-1',
    label: 'Purple avatar',
    initials: 'TK',
    backgroundColor: '#8B5CF6',
    textColor: '#FFFFFF',
    accentColor: '#DDD6FE',
  },
  {
    id: 'avatar-2',
    label: 'Blue avatar',
    initials: 'JL',
    backgroundColor: '#3B82F6',
    textColor: '#FFFFFF',
    accentColor: '#BFDBFE',
  },
  {
    id: 'avatar-3',
    label: 'Amber avatar',
    initials: 'PS',
    backgroundColor: '#F59E0B',
    textColor: '#FFFFFF',
    accentColor: '#FDE68A',
  },
  {
    id: 'avatar-4',
    label: 'Indigo avatar',
    initials: 'AC',
    backgroundColor: '#4F46E5',
    textColor: '#FFFFFF',
    accentColor: '#C7D2FE',
  },
  {
    id: 'avatar-5',
    label: 'Emerald avatar',
    initials: 'CP',
    backgroundColor: '#10B981',
    textColor: '#FFFFFF',
    accentColor: '#A7F3D0',
  },
  {
    id: 'avatar-6',
    label: 'Rose avatar',
    initials: 'MR',
    backgroundColor: '#F43F5E',
    textColor: '#FFFFFF',
    accentColor: '#FECDD3',
  },
  {
    id: 'avatar-7',
    label: 'Cyan avatar',
    initials: 'RC',
    backgroundColor: '#06B6D4',
    textColor: '#FFFFFF',
    accentColor: '#CFFAFE',
  },
  {
    id: 'avatar-8',
    label: 'Orange avatar',
    initials: 'SO',
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
    backgroundColor: '#4F46E5',
    textColor: '#FFFFFF',
    accentColor: '#EEF2FF',
  };
}

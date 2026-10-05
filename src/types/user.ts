import { AvatarId, ISODateTime } from './common';

export type UserKind = 'registered' | 'guest';

export type AccountStatus = 'active' | 'pending_verification' | 'suspended';

export interface RegisteredUser {
  id: string;
  kind: 'registered';
  displayName: string;
  avatarId: AvatarId;
  email?: string | undefined;
  phoneE164?: string | undefined;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  accountStatus: AccountStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface GuestUser {
  id: string;
  kind: 'guest';
  displayName: string;
  avatarId: AvatarId;
  createdAt: ISODateTime;
}

export type AppUser = RegisteredUser | GuestUser;

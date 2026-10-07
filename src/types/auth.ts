import { AvatarId, ISODateTime } from './common';
import { GuestUser, RegisteredUser } from './user';

export type AuthIdentifier =
  | {
      kind: 'email';
      email: string;
    }
  | {
      kind: 'phone';
      phoneE164: string;
    };

export interface LoginPayload {
  identifier: AuthIdentifier;
  password: string;
}

export interface RegisterPayload {
  displayName: string;
  identifier: AuthIdentifier;
  password: string;
  avatarId: AvatarId;
}

export interface GuestLoginPayload {
  displayName: string;
  avatarId: AvatarId;
}

export interface VerifyContactPayload {
  verificationId: string;
  code: string;
}

export interface ForgotPasswordPayload {
  identifier: AuthIdentifier;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: ISODateTime;
}

export type Session =
  | {
      kind: 'registered';
      user: RegisteredUser;
      tokens: SessionTokens;
    }
  | {
      kind: 'guest';
      user: GuestUser;
      tokens: SessionTokens;
    };

export interface LoginResponse {
  session: Session;
}

export interface GuestLoginResponse {
  session: Extract<Session, { kind: 'guest' }>;
}

export interface RegisterResponse {
  session?: Extract<Session, { kind: 'registered' }>;
  user: RegisteredUser;
  verificationId: string;
  verificationExpiresAt: ISODateTime;
}

export interface VerifyContactResponse {
  session: Session;
}

export interface ForgotPasswordResponse {
  resetToken: string;
  expiresAt: ISODateTime;
  maskedDestination: string;
}

export interface ResetPasswordResponse {
  success: boolean;
}

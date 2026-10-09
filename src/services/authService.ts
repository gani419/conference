import { disablePush } from './pushService';
import { backend } from '../backend';
import { ApiResult, RequestContext } from '../types/common';
import {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  GuestLoginPayload,
  GuestLoginResponse,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  Session,
  VerifyContactPayload,
  VerifyContactResponse,
} from '../types/auth';
import { credentialService } from './credentialService';
import { storageService } from './storageService';
import { AppUser } from '../types/user';
import { ENV } from '../config/environment';
import { supabase } from '../backend/supabaseClient';
import { restoreHostedSession, clearMeetingPreviews } from '../backend/SupabaseBackendAdapter';

function makeContext(accessToken: string | null = null): RequestContext {
  return {
    accessToken,
    requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
}

export const authService = {
  async restoreSession(): Promise<Session | null> {
    if (ENV.backendMode === 'supabase') return restoreHostedSession();
    const savedSession = await credentialService.getSession();
    if (savedSession) {
      return savedSession;
    }
    // Check if guest user saved in MMKV
    const guest = storageService.getGuestUser();
    if (guest) {
      return {
        kind: 'guest',
        user: guest,
        tokens: {
          accessToken: `mock-token-${guest.id}`,
          refreshToken: `mock-refresh-${guest.id}`,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      };
    }
    return null;
  },

  async login(payload: LoginPayload): Promise<ApiResult<LoginResponse>> {
    const res = await backend.login(payload, makeContext());
    if (res.success) {
      await credentialService.saveTokens(res.data.session.tokens);
      await credentialService.saveSession(res.data.session);
    }
    return res;
  },

  async register(payload: RegisterPayload): Promise<ApiResult<RegisterResponse>> {
    const result = await backend.register(payload, makeContext());
    if (result.success && result.data.session) {
      await credentialService.saveSession(result.data.session);
    }
    return result;
  },

  async guestLogin(payload: GuestLoginPayload): Promise<ApiResult<GuestLoginResponse>> {
    const res = await backend.guestLogin(payload, makeContext());
    if (res.success) {
      storageService.setGuestUser(res.data.session.user);
      await credentialService.saveTokens(res.data.session.tokens);
      await credentialService.saveSession(res.data.session);
    }
    return res;
  },

  async verifyContact(payload: VerifyContactPayload): Promise<ApiResult<VerifyContactResponse>> {
    const res = await backend.verifyContact(payload, makeContext());
    if (res.success) {
      await credentialService.saveTokens(res.data.session.tokens);
      await credentialService.saveSession(res.data.session);
    }
    return res;
  },

  async resendVerificationCode(verificationId: string): Promise<ApiResult<boolean>> {
    return backend.resendVerificationCode(verificationId, makeContext());
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<ApiResult<ForgotPasswordResponse>> {
    return backend.forgotPassword(payload, makeContext());
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<ApiResult<ResetPasswordResponse>> {
    return backend.resetPassword(payload, makeContext());
  },

  async getCurrentUser(accessToken: string): Promise<ApiResult<AppUser>> {
    return backend.getCurrentUser(makeContext(accessToken));
  },

  async logout(): Promise<void> {
    if (ENV.backendMode === 'supabase') {
      await disablePush();
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      clearMeetingPreviews();
    }
    await credentialService.clearAllCredentials();
    storageService.clearAllGuestData();
  },
};

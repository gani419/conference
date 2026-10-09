import { SupabaseBackendAdapter } from '../src/backend/SupabaseBackendAdapter';
import { verifyContactPayloadSchema } from '../src/schemas/authSchemas';
import { supabase } from '../src/backend/supabaseClient';
jest.mock('../src/backend/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      verifyOtp: jest.fn(),
      resend: jest.fn(),
    },
  },
}));
const mockAuth = supabase.auth as unknown as Record<
  'signUp' | 'signInWithPassword' | 'verifyOtp' | 'resend',
  jest.Mock
>;
const adapter = new SupabaseBackendAdapter();
const ctx = { requestId: 'verification-test', accessToken: null };
const user = {
  id: 'user-1',
  email: 'test@example.com',
  is_anonymous: false,
  user_metadata: { displayName: 'Test' },
  created_at: '2026-10-09T00:00:00Z',
};
const payload = {
  identifier: { kind: 'email' as const, email: user.email },
  displayName: 'Test',
  password: 'Test-password123',
  avatarId: 'avatar-1',
};
beforeEach(() => jest.clearAllMocks());
test('signup without a session returns pending email verification without creating tokens', async () => {
  mockAuth.signUp.mockResolvedValue({
    data: { user, session: null },
    error: null,
  });
  const result = await adapter.register(payload, ctx);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.session).toBeUndefined();
    expect(result.data.verificationId).toBe(user.email);
    expect(result.data.user.isEmailVerified).toBe(false);
  }
});
test('unconfirmed login is distinguishable from wrong credentials', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { session: null },
    error: { message: 'Email not confirmed', code: 'email_not_confirmed' },
  });
  const result = await adapter.login(payload, ctx);
  expect(result.success).toBe(false);
  if (!result.success) expect(result.error.code).toBe('EMAIL_NOT_CONFIRMED');
});
test('invalid code does not reach Supabase; rejected or expired code does not authenticate', async () => {
  const short = await adapter.verifyContact(
    { verificationId: user.email, code: '123456' },
    ctx,
  );
  expect(short.success).toBe(false);
  expect(mockAuth.verifyOtp).not.toHaveBeenCalled();
  mockAuth.verifyOtp.mockResolvedValue({
    data: { session: null },
    error: { message: 'Token has expired or is invalid' },
  });
  const expired = await adapter.verifyContact(
    { verificationId: user.email, code: '12345678' },
    ctx,
  );
  expect(expired.success).toBe(false);
  expect(mockAuth.verifyOtp).toHaveBeenCalledWith({
    email: user.email,
    token: '12345678',
    type: 'email',
  });
});
test('verified SDK session is returned with the actual email confirmation state', async () => {
  mockAuth.verifyOtp.mockResolvedValue({
    error: null,
    data: {
      session: {
        access_token: 'sdk-access',
        refresh_token: 'sdk-refresh',
        expires_at: 1800000000,
        user: { ...user, email_confirmed_at: '2026-10-09T00:00:01Z' },
      },
    },
  });
  const result = await adapter.verifyContact(
    { verificationId: user.email, code: '12345678' },
    ctx,
  );
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.session.tokens.accessToken).toBe('sdk-access');
    expect(result.data.session.user.kind).toBe('registered');
    if (result.data.session.user.kind === 'registered')
      expect(result.data.session.user.isEmailVerified).toBe(true);
  }
});
test('resend propagates delivery and rate-limit errors rather than reporting success', async () => {
  mockAuth.resend
    .mockResolvedValueOnce({ error: { message: 'Email rate limit exceeded' } })
    .mockResolvedValueOnce({ error: null });
  expect((await adapter.resendVerificationCode(user.email, ctx)).success).toBe(
    false,
  );
  expect((await adapter.resendVerificationCode(user.email, ctx)).success).toBe(
    true,
  );
  expect(mockAuth.resend).toHaveBeenCalledWith({
    type: 'signup',
    email: user.email,
  });
});
test('verification schema accepts only eight numeric digits', () => {
  expect(
    verifyContactPayloadSchema.safeParse({
      verificationId: user.email,
      code: '12345678',
    }).success,
  ).toBe(true);
  for (const code of ['123456', 'abcdefgh', '123456789'])
    expect(
      verifyContactPayloadSchema.safeParse({ verificationId: user.email, code })
        .success,
    ).toBe(false);
});

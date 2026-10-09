import { Platform } from 'react-native';
import {
  enablePush,
  disablePush,
  refreshPush,
  pushEnabled,
} from '../src/services/pushService';
import { supabase } from '../src/backend/supabaseClient';
import { getToken, deleteToken } from '@react-native-firebase/messaging';
const account = { user: { id: 'push-test-user', is_anonymous: false } };
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', {
    value: 'android',
    configurable: true,
  });
  Object.defineProperty(Platform, 'Version', { value: 29, configurable: true });
  (supabase.auth.getSession as jest.Mock).mockResolvedValue({
    data: { session: account },
    error: null,
  });
  (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });
});
test('registers only after consent and unregisters before deleting the device token', async () => {
  await enablePush(account.user.id);
  expect(pushEnabled(account.user.id)).toBe(true);
  expect(supabase.rpc).toHaveBeenCalledWith('conference_command', {
    action: 'register_push_token',
    payload: expect.objectContaining({
      platform: 'android',
      token: expect.any(String),
    }),
  });
  await disablePush();
  expect(supabase.rpc).toHaveBeenLastCalledWith('conference_command', {
    action: 'unregister_push_token',
    payload: expect.objectContaining({ deviceId: expect.any(String) }),
  });
  expect(deleteToken).toHaveBeenCalled();
  expect(pushEnabled(account.user.id)).toBe(false);
  expect((supabase.rpc as jest.Mock).mock.invocationCallOrder[1]).toBeLessThan(
    (deleteToken as jest.Mock).mock.invocationCallOrder[0]!,
  );
});
test('does not register a token when the active account differs from the requested account', async () => {
  await expect(enablePush('different-account')).rejects.toThrow('Sign in');
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(getToken).not.toHaveBeenCalled();
  expect(pushEnabled('different-account')).toBe(false);
});
test('does not refresh tokens without an existing opt-in', async () => {
  await refreshPush('never-enabled');
  expect(supabase.rpc).not.toHaveBeenCalled();
});

test('Firebase cleanup failure does not block logout after backend unregistration', async () => {
  await enablePush(account.user.id);
  (deleteToken as jest.Mock).mockRejectedValueOnce(
    new Error('Firebase offline'),
  );
  await expect(disablePush()).resolves.toBeUndefined();
  expect(pushEnabled(account.user.id)).toBe(false);
  expect(supabase.rpc).toHaveBeenLastCalledWith('conference_command', {
    action: 'unregister_push_token',
    payload: expect.objectContaining({ deviceId: expect.any(String) }),
  });
});

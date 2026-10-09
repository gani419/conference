import { Platform, PermissionsAndroid } from 'react-native';
import {
  getMessaging,
  getToken,
  deleteToken,
  setAutoInitEnabled,
  hasPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { supabase } from '../backend/supabaseClient';
import { storageService } from './storageService';
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation, operation);
  queue = next.catch(() => {});
  return next;
}
function deviceId() {
  const saved = storageService.getString('push-device');
  if (saved) return saved;
  const id =
    'android-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2);
  storageService.set('push-device', id);
  return id;
}
export function pushEnabled(userId: string) {
  return storageService.getString('push-enabled:' + userId) === 'true';
}
async function command(action: string, payload: object) {
  const { error } = await supabase.rpc('conference_command', {
    action,
    payload,
  });
  if (error) throw new Error(error.message);
}
async function register(userId: string, token?: string) {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== userId || data.session.user.is_anonymous)
    throw new Error('Sign in to enable notifications.');
  await command('register_push_token', {
    deviceId: deviceId(),
    token: token || (await getToken(getMessaging())),
    platform: 'android',
  });
}
export function refreshPush(userId: string, token?: string) {
  return serial(async () => {
    if (Platform.OS !== 'android' || !pushEnabled(userId)) return;
    if ((await hasPermission(getMessaging())) === AuthorizationStatus.DENIED)
      return;
    await register(userId, token);
  });
}
export function enablePush(userId: string) {
  return serial(async () => {
    if (Platform.OS !== 'android')
      throw new Error('Notifications are currently available on Android.');
    if (Number(Platform.Version) >= 33) {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED)
        throw new Error(
          'Allow notifications in Android app settings, then try again.',
        );
    }
    if ((await hasPermission(getMessaging())) === AuthorizationStatus.DENIED)
      throw new Error('Enable notifications in Android app settings.');
    await setAutoInitEnabled(getMessaging(), true);
    await register(userId);
    storageService.set('push-enabled:' + userId, 'true');
  });
}
export function disablePush() {
  return serial(async () => {
    if (Platform.OS !== 'android') return;
    const { data } = await supabase.auth.getSession();
    if (!data.session || data.session.user.is_anonymous) return;
    await command('unregister_push_token', { deviceId: deviceId() });
    // Server registration has been removed, so an offline Firebase cleanup must not block logout.
    await deleteToken(getMessaging()).catch(() => {});
    await setAutoInitEnabled(getMessaging(), false);
    storageService.remove('push-enabled:' + data.session.user.id);
  });
}

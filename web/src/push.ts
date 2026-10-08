import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported,
  type MessagePayload,
} from 'firebase/messaging';
import { backend } from './backend/supabase';
const config = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_WEB_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_WEB_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};
let messaging: ReturnType<typeof getMessaging> | undefined;
let registration: ServiceWorkerRegistration | undefined;
let currentUser = '';
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.then(operation, operation);
  queue = next.catch(() => {});
  return next;
}
function deviceId() {
  const saved = localStorage.getItem('conference-push-device');
  if (saved) return saved;
  const id = crypto.randomUUID();
  localStorage.setItem('conference-push-device', id);
  return id;
}
export function pushEnabled(userId: string) {
  return localStorage.getItem('conference-push-enabled:' + userId) === 'true';
}
async function sdk() {
  if (!config.appId || !import.meta.env.VITE_FIREBASE_WEB_VAPID_KEY)
    throw new Error('Notifications are not configured.');
  if (!(await isSupported()))
    throw new Error('This browser does not support notifications.');
  if (!messaging)
    messaging = getMessaging(initializeApp(config, 'conference-push'));
  registration ||= await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
  );
  await navigator.serviceWorker.ready;
  return messaging;
}
async function account(userId: string) {
  currentUser = userId;
  if (!('serviceWorker' in navigator)) return;
  registration ||= await navigator.serviceWorker.getRegistration('/');
  const worker = registration?.active;
  if (!worker) return;
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(
      () => reject(new Error('Notification setup timed out.')),
      10000,
    );
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      channel.port1.close();
      resolve();
    };
    worker.postMessage({ type: 'CONFERENCE_PUSH_ACCOUNT', userId }, [
      channel.port2,
    ]);
  });
}
async function register(userId: string) {
  const instance = await sdk();
  await account(userId);
  const token = await getToken(instance, {
    vapidKey: import.meta.env.VITE_FIREBASE_WEB_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (currentUser !== userId) return;
  const identity = await backend.restore();
  if (identity?.id !== userId || identity.guest)
    throw new Error('Sign in to enable notifications.');
  await backend.command('register_push_token', {
    deviceId: deviceId(),
    token,
    platform: 'web',
  });
  localStorage.setItem('conference-push-enabled:' + userId, 'true');
}
export function enablePush(userId: string) {
  // Request permission directly from the button gesture.
  const permission =
    'Notification' in window
      ? Notification.requestPermission()
      : Promise.resolve('denied');
  return serial(async () => {
    if ((await permission) !== 'granted')
      throw new Error(
        'Allow notifications in your browser settings, then try again.',
      );
    await register(userId);
  });
}
export function disablePush(userId: string) {
  return serial(async () => {
    await account('');
    await backend.command('unregister_push_token', { deviceId: deviceId() });
    if (messaging) await deleteToken(messaging).catch(() => {});
    else if (pushEnabled(userId) && (await isSupported()))
      await deleteToken(await sdk()).catch(() => {});
    localStorage.removeItem('conference-push-enabled:' + userId);
  });
}
export function setPushAccount(
  userId: string,
  receive: (message: MessagePayload) => void,
) {
  let cancelled = false;
  let off: (() => void) | undefined;
  void serial(async () => {
    await account(userId);
    if (
      !userId ||
      !pushEnabled(userId) ||
      Notification.permission !== 'granted'
    )
      return;
    await register(userId);
    if (!cancelled)
      off = onMessage(messaging!, payload => {
        if (currentUser === userId && payload.data?.userId === userId)
          receive(payload);
      });
  }).catch(() => {});
  return () => {
    cancelled = true;
    off?.();
  };
}

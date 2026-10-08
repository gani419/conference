// Generated public Firebase configuration is prepended by configure.mjs.
const accountCache = 'conference-push-account-v1';
async function account() {
  const cache = await caches.open(accountCache);
  const response = await cache.match('/__push_account');
  return response ? response.text() : '';
}
self.addEventListener('message', event => {
  if (event.data?.type !== 'CONFERENCE_PUSH_ACCOUNT') return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(accountCache);
      const changed = (await account()) !== (event.data.userId || '');
      await cache.put('/__push_account', new Response(event.data.userId || ''));
      if (changed)
        for (const notification of await self.registration.getNotifications())
          notification.close();
      event.ports[0]?.postMessage({ ok: true });
    })(),
  );
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.stopImmediatePropagation();
  event.waitUntil(
    (async () => {
      const data = event.notification.data || {};
      if (!data.userId || data.userId !== (await account())) return;
      const url = new URL('/', self.location.origin);
      url.searchParams.set('meeting', data.meetingId);
      const windows = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const client = windows.find(
        window => new URL(window.url).origin === self.location.origin,
      );
      if (client) {
        client.postMessage({ type: 'CONFERENCE_OPEN_MEETING', ...data });
        await client.focus();
      } else await clients.openWindow(url.href);
    })(),
  );
});
importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js',
);
firebase.initializeApp(FIREBASE_CONFIG);
firebase.messaging().onBackgroundMessage(async payload => {
  const data = payload.data || {};
  if (
    data.kind !== 'meeting_invitation' ||
    !data.userId ||
    data.userId !== (await account())
  )
    return;
  await self.registration.showNotification('Conference invitation', {
    body: 'You have a new meeting invitation. Open Conference to respond.',
    tag: data.notificationId,
    data,
  });
});

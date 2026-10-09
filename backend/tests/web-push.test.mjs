import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
async function worker() {
  const listeners = new Map();
  const cache = new Map();
  const shown = [],
    opened = [];
  let receive;
  const context = {
    FIREBASE_CONFIG: {},
    Response,
    URL,
    caches: {
      open: async () => ({
        match: async key => cache.get(key)?.clone(),
        put: async (key, value) => cache.set(key, value),
      }),
    },
    clients: {
      matchAll: async () => [],
      openWindow: async url => opened.push(url),
    },
    importScripts: () => {},
    firebase: {
      initializeApp: () => {},
      messaging: () => ({
        onBackgroundMessage: fn => {
          receive = fn;
        },
      }),
    },
    self: {
      location: { origin: 'https://conference.example' },
      addEventListener: (type, fn) => listeners.set(type, fn),
      registration: {
        getNotifications: async () => [],
        showNotification: async (title, options) =>
          shown.push({ title, options }),
      },
    },
  };
  vm.runInNewContext(
    await readFile(
      new URL(
        '../../web/src/firebase-messaging-sw.template.js',
        import.meta.url,
      ),
      'utf8',
    ),
    context,
  );
  return {
    shown,
    opened,
    receive: data => receive({ data }),
    account: userId =>
      new Promise(resolve =>
        listeners.get('message')({
          data: { type: 'CONFERENCE_PUSH_ACCOUNT', userId },
          ports: [{ postMessage: resolve }],
          waitUntil: promise => promise,
        }),
      ),
    click: async data => {
      let pending;
      listeners.get('notificationclick')({
        notification: { data, close() {} },
        stopImmediatePropagation() {},
        waitUntil: promise => {
          pending = promise;
        },
      });
      await pending;
    },
  };
}
test('background notifications and taps are restricted to the current account, including after logout', async () => {
  const sw = await worker();
  const data = {
    kind: 'meeting_invitation',
    userId: 'recipient',
    meetingId: 'meeting-1',
    notificationId: 'notice-1',
  };
  await sw.account('recipient');
  await sw.receive({ ...data, userId: 'other-account' });
  assert.equal(sw.shown.length, 0);
  await sw.receive(data);
  assert.equal(sw.shown.length, 1);
  assert.equal(sw.shown[0].options.tag, 'notice-1');
  await sw.click(data);
  assert.equal(sw.opened[0], 'https://conference.example/?meeting=meeting-1');
  await sw.account('');
  await sw.receive(data);
  await sw.click(data);
  assert.equal(sw.shown.length, 1);
  assert.equal(sw.opened.length, 1);
});

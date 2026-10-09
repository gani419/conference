import { createConfirmedTestAccount } from '../../backend/scripts/test-accounts.mjs';
import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { parseEnv } from '../../backend/scripts/env.mjs';
const env = parseEnv(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8'),
);
const stateFile = new URL('../.env.browser-test', import.meta.url);
test('host and guest use the hosted backend for admission, media, moderation, chat and attendance', async ({
  browser,
}) => {
  test.skip(
    process.env.CONFERENCE_HOSTED_TEST !== '1',
    'Set CONFERENCE_HOSTED_TEST=1 to create temporary hosted test accounts.',
  );
  test.setTimeout(240000);
  if (existsSync(stateFile))
    throw new Error(
      'Previous browser test data needs cleanup before creating accounts.',
    );
  const tag = randomBytes(5).toString('hex'),
    password = randomBytes(24).toString('base64url');
  const state: {
    users: string[];
    meeting?: string;
    hostToken?: string;
    guestToken?: string;
    password?: string;
    email?: string;
  } = { users: [] };
  const headers = {
    Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  const management = `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_ID}`;
  const verify = await fetch(`${management}/config/auth`, { headers });
  if (!verify.ok)
    throw new Error(
      `Management access unavailable (${verify.status}); rotate/update root .env before hosted tests.`,
    );
  const save = () =>
    writeFileSync(stateFile, `BROWSER_TEST_STATE='${JSON.stringify(state)}'\n`);
  const hostContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    }),
    guestContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
  const errors: string[] = [];
  try {
    const host = await hostContext.newPage(),
      guest = await guestContext.newPage();
    for (const page of [host, guest]) {
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        const peerConnections: RTCPeerConnection[] = [];
        (window as unknown as { testPeers: RTCPeerConnection[] }).testPeers =
          peerConnections;
        const Original = window.RTCPeerConnection;
        window.RTCPeerConnection = new Proxy(Original, {
          construct(target, args) {
            const peer = new target(...args);
            peerConnections.push(peer);
            return peer;
          },
        });
      });
      page.on('response', async response => {
        if (
          response.url().includes('/auth/v1/signup') ||
          response.url().includes('/auth/v1/token?grant_type=password')
        ) {
          if (!response.ok()) return;
          const data = await response.json();
          if (data.user?.id && !state.users.includes(data.user.id)) {
            state.users.push(data.user.id);
            save();
          }
          if (page === host) {
            state.hostToken = data.access_token;
            state.password = password;
            state.email = `web-test-${tag}@example.com`;
            save();
          } else {
            state.guestToken = data.access_token;
            save();
          }
        }
      });
    }
    const fixture = await createConfirmedTestAccount(env, { email: `web-test-${tag}@example.com`, password, displayName: `WebHost${tag}` }, id => { state.users.push(id); save(); });
    state.hostToken = fixture.access_token; state.email = `web-test-${tag}@example.com`; state.password = password; save();
    await host.goto('/');
    await host.getByLabel('Email address').fill(state.email);
    await host.getByLabel('Password', { exact: true }).fill(password);
    await host.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(
      host.getByRole('button', { name: '+ New meeting' }),
    ).toBeVisible();
    await host.getByRole('button', { name: '+ New meeting' }).click();
    await host.getByLabel('Meeting title').fill(`Browser call check ${tag}`);
    for (const label of ['Microphone', 'Camera', 'Screen sharing'])
      await host.getByLabel(label, { exact: true }).check();
    await host
      .getByRole('button', { name: 'Create meeting', exact: true })
      .click();
    await expect(
      host.getByRole('heading', { name: `Browser call check ${tag}` }),
    ).toBeVisible();
    state.meeting = new URL(host.url()).searchParams.get('meeting')!;
    save();
    const details = await fetch(
      `${env.SUPABASE_URL}/functions/v1/conference-api`,
      {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${state.hostToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'read',
          action: 'meeting_details',
          payload: { meetingId: state.meeting },
        }),
      },
    );
    expect(details.ok).toBeTruthy();
    const meeting = (await details.json()).data;
    await guest.goto(`/?join=${meeting.code}`);
    await guest
      .getByRole('button', { name: 'Continue as guest', exact: true })
      .click();
    await guest.getByLabel('Display name').fill(`WebGuest${tag}`);
    await guest
      .getByRole('button', { name: 'Continue as guest', exact: true })
      .click();
    await expect(
      guest.getByRole('button', { name: 'Ask to join' }),
    ).toBeVisible();
    await guest.reload();
    await expect(
      guest.getByRole('button', { name: 'Ask to join' }),
    ).toBeVisible();
    expect(
      await guest.evaluate(
        () => (window as unknown as { testPeers: unknown[] }).testPeers.length,
      ),
    ).toBe(0);
    await guest.getByRole('button', { name: 'Ask to join' }).click();
    await expect(
      guest.getByRole('heading', { name: 'Waiting for the host' }),
    ).toBeVisible();
    await expect(
      host.getByRole('button', { name: 'Admit', exact: true }),
    ).toBeVisible();
    await host.getByRole('button', { name: 'Admit', exact: true }).click();
    await expect(
      guest.locator('.call-status').filter({ hasText: 'Connected' }),
    ).toBeVisible();
    await expect(
      host.locator('.call-status').filter({ hasText: 'Connected' }),
    ).toBeVisible();
    for (const page of [host, guest]) {
      await page
        .getByRole('button', { name: 'Start video', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Stop video' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Unmute', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Mute', exact: true }),
      ).toBeVisible();
    }
    for (const page of [host, guest])
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              Array.from(document.querySelectorAll('video')).filter(
                v =>
                  v.videoWidth > 0 &&
                  v.getVideoPlaybackQuality().totalVideoFrames > 0,
              ).length,
          ),
        )
        .toBe(2);
    for (const page of [host, guest])
      await expect
        .poll(() =>
          page.evaluate(async () => {
            const peers = (
              window as unknown as { testPeers: RTCPeerConnection[] }
            ).testPeers;
            let packets = 0;
            for (const peer of peers) {
              const stats = await peer.getStats();
              stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.kind === 'audio')
                  packets += report.packetsReceived || 0;
              });
            }
            return packets;
          }),
        )
        .toBeGreaterThan(0);
    await host
      .getByRole('button', { name: 'Share screen', exact: true })
      .click();
    await expect(
      host.getByRole('button', { name: 'Stop sharing', exact: true }),
    ).toBeVisible();
    await expect(guest.locator('video.screen-video')).toBeVisible();
    await host
      .getByRole('button', { name: 'Stop sharing', exact: true })
      .click();
    await expect(guest.locator('video.screen-video')).toHaveCount(0);
    for (const page of [host, guest])
      await page.getByRole('button', { name: /^Chat \(/ }).click();
    await guest
      .getByLabel('Message', { exact: true })
      .fill('Hello from browser guest');
    await guest.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(host.getByText('Hello from browser guest')).toBeVisible();
    await host.getByLabel('Send as announcement').check();
    await host
      .getByLabel('Message', { exact: true })
      .fill('Browser host announcement');
    await host.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(guest.getByText('Browser host announcement')).toBeVisible();
    host.once('dialog', dialog => dialog.accept());
    await host.getByRole('button', { name: 'Mute all', exact: true }).click();
    await expect(
      guest.getByRole('button', { name: 'Request microphone' }),
    ).toBeVisible();
    await guest.getByRole('button', { name: 'Request microphone' }).click();
    await host.getByRole('button', { name: /^People \(/ }).click();
    await expect(
      host.getByRole('button', { name: 'Approve', exact: true }),
    ).toBeVisible();
    await host.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(
      guest.getByRole('button', { name: 'Unmute', exact: true }),
    ).toBeVisible();
    await guest.getByRole('button', { name: 'Raise hand' }).click();
    await expect(
      guest.getByRole('button', { name: 'Lower hand', exact: true }),
    ).toBeVisible();
    await host
      .getByRole('button', { name: 'Lock meeting', exact: true })
      .click();
    await expect(
      host.getByRole('button', { name: 'Unlock meeting' }),
    ).toBeVisible();
    await host.getByRole('button', { name: 'Unlock meeting' }).click();
    host.once('dialog', dialog => dialog.accept());
    await host
      .getByRole('button', { name: 'End for everyone', exact: true })
      .click();
    await expect(
      host.getByRole('heading', { name: 'Attendance (2)' }),
    ).toBeVisible();
    await expect(
      guest.getByRole('heading', { name: 'Attendance (1)' }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([hostContext.close(), guestContext.close()]);
    if (state.meeting && state.hostToken)
      await fetch(`${env.SUPABASE_URL}/functions/v1/conference-api`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${state.hostToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'command',
          action: 'end_meeting',
          payload: { meetingId: state.meeting },
        }),
      });
    for (const token of [state.hostToken, state.guestToken])
      if (token)
        await fetch(`${env.SUPABASE_URL}/auth/v1/logout?scope=global`, {
          method: 'POST',
          headers: {
            apikey: env.SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
        });
    const ids = state.users.filter(id => /^[0-9a-f-]{36}$/i.test(id));
    const meetingId =
      state.meeting && /^[0-9a-f-]{36}$/i.test(state.meeting)
        ? state.meeting
        : undefined;
    const query = `${
      meetingId
        ? `delete from public.meetings where id='${meetingId}'::uuid;`
        : ''
    }${
      ids.length
        ? `delete from auth.users where id in (${ids
            .map(id => `'${id}'::uuid`)
            .join(',')});`
        : ''
    }`;
    if (query) {
      const clean = await fetch(`${management}/database/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });
      if (!clean.ok)
        throw new Error(
          `Test cleanup failed (${clean.status}); identifiers remain in ignored web/.env.browser-test.`,
        );
    }
    if (existsSync(stateFile)) unlinkSync(stateFile);
  }
});

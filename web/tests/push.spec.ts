import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../../backend/scripts/env.mjs';
const env = parseEnv(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8'),
);
const stateFile = new URL('../.env.push-test', import.meta.url);
test('real FCM web invitation reaches an opted-in account and logout unregisters it', async ({
  playwright,
}) => {
  test.skip(
    process.env.CONFERENCE_PUSH_TEST !== '1',
    'Opt in to creating temporary accounts and real Firebase push.',
  );
  test.setTimeout(180000);
  if (existsSync(stateFile))
    throw new Error('Previous push test needs cleanup.');
  const password = randomBytes(24).toString('base64url');
  const tag = randomBytes(5).toString('hex');
  const users: { id: string; token: string; email: string }[] = [];
  let meetingId = '';
  const save = () =>
    writeFileSync(
      stateFile,
      "PUSH_TEST_STATE='" + JSON.stringify({ users, meetingId }) + "'\n",
    );
  async function api(path: string, body: object, token?: string) {
    const response = await fetch(env.SUPABASE_URL + '/' + path, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error('Test API failed (' + response.status + ')');
    return response.json();
  }
  async function sql(query: string) {
    const response = await fetch(
      'https://api.supabase.com/v1/projects/' +
        env.SUPABASE_PROJECT_ID +
        '/database/query',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.SUPABASE_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      },
    );
    if (!response.ok)
      throw new Error('Test database request failed (' + response.status + ')');
    return response.json();
  }
  const context = await playwright.chromium.launchPersistentContext(
    fileURLToPath(new URL('../.push-profiles/' + tag + '/', import.meta.url)),
    {
      channel: 'chrome',
      headless: true,
      permissions: ['notifications'],
      ignoreDefaultArgs: ['--disable-background-networking'],
    },
  );
  try {
    for (const name of ['host', 'recipient']) {
      const email = 'push-' + name + '-' + tag + '@example.com';
      const created = await api('auth/v1/signup', {
        email,
        password,
        data: { displayName: 'Push ' + name, avatarId: 'avatar-1' },
      });
      if (!created.access_token || !created.user?.id)
        throw new Error('Test signup did not create a session.');
      users.push({ id: created.user.id, token: created.access_token, email });
      save();
    }
    const [host, recipient] = users;
    const page = await context.newPage();
    await page.goto('/');
    await page.getByLabel('Email address').fill(recipient.email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    const enable = page.getByRole('button', {
      name: 'Enable notifications',
      exact: true,
    });
    await expect(enable).toBeVisible();
    await enable.click();
    await expect(
      page.getByRole('button', { name: 'Disable notifications', exact: true }),
    ).toBeVisible({ timeout: 60000 });
    expect(
      (
        await sql(
          "select count(*)::int as count from public.push_tokens where user_id='" +
            recipient.id +
            "'::uuid and platform='web'",
        )
      )[0].count,
    ).toBe(1);
    const created = await api(
      'functions/v1/conference-api',
      {
        mode: 'command',
        action: 'create_meeting',
        payload: {
          title: 'Push delivery test',
          timing: { kind: 'instant' },
          defaultPermissions: {},
          guestAccess: true,
          invitees: [
            {
              email: recipient.email,
              displayName: 'Push recipient',
              role: 'guest',
            },
          ],
        },
      },
      host.token,
    );
    meetingId = created.data.id;
    save();
    const worker = await fetch(
      env.SUPABASE_URL + '/functions/v1/outbox-worker',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.BACKEND_WORKER_SECRET,
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
    );
    expect(worker.ok).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Open new invitation' }),
    ).toBeVisible({ timeout: 45000 });
    await page.getByRole('button', { name: 'Open new invitation' }).click();
    await expect(
      page.getByRole('heading', { name: 'Push delivery test', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    expect(
      (
        await sql(
          "select count(*)::int as count from public.push_tokens where user_id='" +
            recipient.id +
            "'::uuid",
        )
      )[0].count,
    ).toBe(0);
  } finally {
    await context.close();
    for (const user of users)
      await fetch(env.SUPABASE_URL + '/auth/v1/logout?scope=global', {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          Authorization: 'Bearer ' + user.token,
        },
      });
    const ids = users
      .map(user => user.id)
      .filter(id => /^[0-9a-f-]{36}$/i.test(id));
    if (meetingId && !/^[0-9a-f-]{36}$/i.test(meetingId))
      throw new Error('Invalid test meeting ID.');
    const query =
      (meetingId
        ? "delete from public.meetings where id='" + meetingId + "'::uuid;"
        : '') +
      (ids.length
        ? 'delete from auth.users where id in(' +
          ids.map(id => "'" + id + "'::uuid").join(',') +
          ');'
        : '');
    if (query) await sql(query);
    if (existsSync(stateFile)) unlinkSync(stateFile);
  }
});

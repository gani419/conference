import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { parseEnv } from '../../backend/scripts/env.mjs';
const env = parseEnv(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8'),
);
const file = new URL('../.env.push-device-test', import.meta.url);
const state = existsSync(file)
  ? JSON.parse(parseEnv(readFileSync(file, 'utf8')).PUSH_DEVICE_TEST_STATE)
  : {};
const save = () =>
  writeFileSync(
    file,
    "PUSH_DEVICE_TEST_STATE='" + JSON.stringify(state) + "'\n",
  );
const action = process.argv[2];
async function api(path, body, token) {
  const response = await fetch(env.SUPABASE_URL + '/' + path, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw Error('Test API failed (' + response.status + ')');
  return response.json();
}
async function sql(query) {
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
    throw Error('Database check failed (' + response.status + ')');
  return response.json();
}
if (action === 'setup') {
  if (state.host) throw Error('Previous test needs cleanup.');
  const recipients = await sql(
    "select distinct u.email from public.push_tokens t join auth.users u on u.id=t.user_id where t.platform='android' and not u.is_anonymous",
  );
  if (recipients.length !== 1)
    throw Error('Signed-in Android recipient is not registered for push.');
  const tag = randomBytes(5).toString('hex');
  state.host = await api('auth/v1/signup', {
    email: 'push-device-host-' + tag + '@example.com',
    password: randomBytes(24).toString('base64url'),
    data: { displayName: 'Conference push test', avatarId: 'avatar-1' },
  });
  save();
  if (!state.host.access_token)
    throw Error('Test host signup did not produce a session.');
  state.meeting = (
    await api(
      'functions/v1/conference-api',
      {
        mode: 'command',
        action: 'create_meeting',
        payload: {
          title: 'Notification delivery check',
          description: 'Temporary notification test; no call is required.',
          timing: {
            kind: 'scheduled',
            startsAt: new Date(Date.now() + 3600000).toISOString(),
            timezone: 'Asia/Kolkata',
          },
          defaultPermissions: {},
          guestAccess: true,
          invitees: [
            {
              email: recipients[0].email,
              displayName: 'Recipient',
              role: 'guest',
            },
          ],
        },
      },
      state.host.access_token,
    )
  ).data;
  save();
  console.log(
    'Temporary host invitation created for the opted-in phone. Credentials not logged.',
  );
} else if (action === 'deliver') {
  const response = await fetch(
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
  if (!response.ok)
    throw Error('Worker request failed (' + response.status + ')');
  const result = await response.json();
  console.log(
    'Worker: delivered=' + result.delivered + ', failed=' + result.failed,
  );
  const jobs = await sql(
    "select delivered_at is not null as delivered,attempts from private.outbox where meeting_id='" +
      state.meeting.id +
      "'::uuid and kind='invitation_push'",
  );
  console.log(JSON.stringify(jobs));
} else if (action === 'cleanup') {
  if (state.host?.access_token) {
    const response = await fetch(
      env.SUPABASE_URL + '/auth/v1/logout?scope=global',
      {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_PUBLISHABLE_KEY,
          Authorization: 'Bearer ' + state.host.access_token,
        },
      },
    );
    if (!response.ok && response.status !== 401)
      throw Error('Test session revocation failed.');
  }
  const host = state.host?.user?.id,
    meeting = state.meeting?.id;
  for (const id of [host, meeting])
    if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw Error('Invalid test ID.');
  if (host)
    await sql(
      (meeting
        ? "delete from public.meetings where id='" + meeting + "'::uuid;"
        : '') +
        "delete from auth.users where id='" +
        host +
        "'::uuid;",
    );
  if (existsSync(file)) unlinkSync(file);
  console.log(
    'Temporary meeting, invitation and host cleaned up. Recipient account and preference preserved.',
  );
}

// Exercises the actual mobile adapter against the hosted backend without native device APIs.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
import { parseEnv } from '../../backend/scripts/env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const values = parseEnv(readFileSync(resolve(root, '.env'), 'utf8'));
if (!values.SUPABASE_ACCESS_TOKEN)
  throw new Error('Management token required for temporary test cleanup');
const clients = [];
let active;
const proxy = new Proxy({}, { get: (_, key) => active[key] });
const modules = new Map();
function load(path) {
  const filename = path.endsWith('.ts') ? path : path + '.ts';
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const require = name => {
    if (name.endsWith('supabaseClient')) return { supabase: proxy };
    if (name.endsWith('publicEnvironment.generated'))
      return {
        PUBLIC_ENV: {
          SUPABASE_URL: values.SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY: values.SUPABASE_PUBLISHABLE_KEY,
        },
      };
    if (name.startsWith('.')) return load(resolve(dirname(filename), name));
    throw new Error(`Unexpected runtime dependency ${name}`);
  };
  new Function('require', 'module', 'exports', code)(
    require,
    module,
    module.exports,
  );
  return module.exports;
}
const { SupabaseBackendAdapter, hostedRequest, conferenceCommand } = load(
  resolve(root, 'src/backend/SupabaseBackendAdapter.ts'),
);
const backend = new SupabaseBackendAdapter();
const ctx = { accessToken: null, requestId: 'mobile-contract-verification' };
const unwrap = result => {
  if (!result.success) throw new Error(result.error.message);
  return result.data;
};
const accountIds = [];
let meetingId;
const makeClient = () => {
  const client = createClient(
    values.SUPABASE_URL,
    values.SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  clients.push(client);
  return client;
};
try {
  const host = makeClient();
  active = host;
  const email = `mobile-contract-${randomBytes(10).toString(
    'hex',
  )}@example.com`;
  const signup = unwrap(
    await backend.register(
      {
        identifier: { kind: 'email', email },
        password: randomBytes(24).toString('base64url'),
        displayName: 'Temporary host',
        avatarId: 'avatar-1',
      },
      ctx,
    ),
  );
  accountIds.push(signup.user.id);
  assert.ok(signup.session);
  assert.equal(signup.user.kind, 'registered');
  const created = unwrap(
    await backend.createMeeting(
      {
        title: 'Temporary mobile contract test',
        description: 'Removed after test',
        timing: { kind: 'instant' },
        guestAccess: true,
        defaultPermissions: {
          microphone: false,
          camera: false,
          screenShare: false,
          chat: true,
        },
        invitees: [],
      },
      ctx,
    ),
  );
  meetingId = created.meeting.id;
  assert.equal(created.meeting.organizerName, 'Temporary host');
  assert.equal(created.meeting.status, 'live');
  const guest = makeClient();
  active = guest;
  const guestSession = unwrap(
    await backend.guestLogin(
      { displayName: 'Temporary guest', avatarId: 'avatar-2' },
      ctx,
    ),
  );
  accountIds.push(guestSession.session.user.id);
  const resolved = unwrap(
    await backend.resolveMeeting(
      { codeOrLink: created.meeting.shareLink },
      ctx,
    ),
  );
  assert.equal(resolved.meeting.id, meetingId);
  const joined = unwrap(await backend.joinMeeting({ meetingId }, ctx));
  assert.equal(joined.requiresLobby, true);
  await assert.rejects(
    () => hostedRequest('media-token', { meetingId }),
    /NOT_ADMITTED/,
  );
  assert.equal(
    (
      await backend.createMeeting(
        {
          title: 'Guest cannot host',
          timing: { kind: 'instant' },
          description: '',
          guestAccess: true,
          defaultPermissions: created.meeting.defaultPermissions,
          invitees: [],
        },
        ctx,
      )
    ).success,
    false,
  );
  active = host;
  const list = unwrap(await backend.listParticipants(meetingId, ctx));
  const participant = list.find(p => p.userId === guestSession.session.user.id);
  assert.ok(participant);
  assert.equal(participant.status, 'in_lobby');
  unwrap(
    await backend.admitParticipant(
      { meetingId, participantId: participant.id, decision: 'admit' },
      ctx,
    ),
  );
  active = guest;
  const media = await hostedRequest('media-token', { meetingId });
  assert.ok(media.token);
  assert.equal(media.serverUrl, values.LIVEKIT_URL);
  const sent = unwrap(
    await backend.sendChatMessage(
      { meetingId, content: 'Hosted mobile contract test' },
      ctx,
    ),
  );
  assert.equal(sent.message.senderName, 'Temporary guest');
  const request = unwrap(
    await backend.requestPermission(
      { meetingId, permission: 'microphone' },
      ctx,
    ),
  );
  await conferenceCommand('raise_hand', { meetingId, raised: true });
  active = host;
  const decision = unwrap(
    await backend.decidePermissionRequest(
      { meetingId, requestId: request.request.id, decision: 'approve' },
      ctx,
    ),
  );
  assert.equal(decision.updatedPermissions.microphone, true);
  await conferenceCommand('lower_hand', {
    meetingId,
    participantId: participant.id,
  });
  unwrap(
    await backend.bulkUpdatePermissions(
      { meetingId, action: { kind: 'lock_meeting', locked: true } },
      ctx,
    ),
  );
  assert.equal(
    unwrap(await backend.getMeetingDetails(meetingId, ctx)).isLocked,
    true,
  );
  unwrap(
    await backend.removeParticipant(
      { meetingId, participantId: participant.id },
      ctx,
    ),
  );
  active = guest;
  await assert.rejects(
    () => hostedRequest('media-token', { meetingId }),
    /NOT_ADMITTED/,
  );
  assert.equal((await backend.joinMeeting({ meetingId }, ctx)).success, false);
  active = host;
  unwrap(await backend.endMeeting(meetingId, ctx));
  const summary = unwrap(await backend.getMeetingSummary(meetingId, ctx));
  assert.equal(summary.status, 'ended');
  assert.equal(summary.totalAttended, 2);
  console.log(
    'Hosted mobile adapter verified: registration, guest access, lobby, admission, media tokens, chat, permission approval, hand controls, meeting lock, removal, end, and attendance.',
  );
} finally {
  for (const client of clients) {
    await client.auth.signOut({ scope: 'local' });
    await client.removeAllChannels();
  }
  const ids = accountIds.filter(id => /^[0-9a-f-]{36}$/i.test(id));
  const statements = [];
  if (meetingId && /^[0-9a-f-]{36}$/i.test(meetingId))
    statements.push(
      `delete from public.meetings where id='${meetingId}'::uuid`,
    );
  if (ids.length)
    statements.push(
      `delete from auth.users where id in (${ids
        .map(id => `'${id}'::uuid`)
        .join(',')})`,
    );
  if (statements.length) {
    const cleanup = await fetch(
      `https://api.supabase.com/v1/projects/${values.SUPABASE_PROJECT_ID}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${values.SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: statements.join(';') }),
      },
    );
    if (!cleanup.ok)
      throw new Error(`Temporary test cleanup failed (HTTP ${cleanup.status})`);
    console.log('Temporary meeting and accounts removed.');
  }
}

import { readFile } from 'node:fs/promises';
import { parseEnv } from './env.mjs';

const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
if (!values.SUPABASE_ACCESS_TOKEN) throw new Error('Management token required for test-account cleanup');
let userId;
try {
  const signup = await fetch(`${values.SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: values.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { displayName: 'Temporary backend verification guest' } }),
  });
  if (!signup.ok) throw new Error(`Guest sign-in failed (HTTP ${signup.status})`);
  const session = await signup.json();
  userId = session.user?.id;
  if (!session.access_token || !/^[0-9a-f-]{36}$/i.test(userId || '')) throw new Error('Guest session was not issued');
  const headers = { apikey: values.SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  const read = await fetch(`${values.SUPABASE_URL}/functions/v1/conference-api`, {
    method: 'POST', headers, body: JSON.stringify({ mode: 'read', action: 'meetings', payload: {} }),
  });
  if (!read.ok) {
    const body = await read.json().catch(() => ({}));
    throw new Error(`Authenticated guest API failed (HTTP ${read.status}; ${body.error || 'unknown'})`);
  }
  console.log('Guest sign-in and authenticated backend read verified.');
  const denied = await fetch(`${values.SUPABASE_URL}/functions/v1/conference-api`, {
    method: 'POST', headers,
    body: JSON.stringify({ action: 'create_meeting', payload: { title: 'Should be denied', timing: { kind: 'instant' }, defaultPermissions: {}, invitees: [] } }),
  });
  if (denied.status !== 403) throw new Error(`Guest hosting should be forbidden (got HTTP ${denied.status})`);
  console.log('Authenticated guest hosting correctly denied (403).');
} finally {
  if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
    const cleanup = await fetch(`https://api.supabase.com/v1/projects/${values.SUPABASE_PROJECT_ID}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${values.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `delete from auth.users where id='${userId}'::uuid and is_anonymous=true` }),
    });
    if (!cleanup.ok) throw new Error(`Temporary guest cleanup failed (HTTP ${cleanup.status})`);
    console.log('Temporary verification account removed.');
  }
}

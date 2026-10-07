import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { parseEnv } from './env.mjs';

const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
if (!values.SUPABASE_ACCESS_TOKEN) throw new Error('Management token required for test-account cleanup');
const email = `conference-test-${randomBytes(12).toString('hex')}@example.com`;
const password = randomBytes(32).toString('base64url');
const headers = { apikey: values.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
let userId;
try {
  const signup = await fetch(`${values.SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST', headers, body: JSON.stringify({ email, password, data: { displayName: 'Temporary password verification account' } }),
  });
  if (!signup.ok) throw new Error(`Password registration failed (HTTP ${signup.status})`);
  const session = await signup.json();
  userId = session.user?.id;
  if (!session.access_token || !/^[0-9a-f-]{36}$/i.test(userId || '')) throw new Error('Immediate signup session was not issued');
  console.log('Email/password registration issued a session without inbox verification.');
  const login = await fetch(`${values.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers, body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`Password login failed (HTTP ${login.status})`);
  const signedIn = await login.json();
  const read = await fetch(`${values.SUPABASE_URL}/functions/v1/conference-api`, {
    method: 'POST', headers: { ...headers, Authorization: `Bearer ${signedIn.access_token}` },
    body: JSON.stringify({ mode: 'read', action: 'meetings', payload: {} }),
  });
  if (!read.ok) throw new Error(`Registered user API failed (HTTP ${read.status})`);
  console.log('Password login and authenticated backend access verified.');
} finally {
  if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
    const cleanup = await fetch(`https://api.supabase.com/v1/projects/${values.SUPABASE_PROJECT_ID}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${values.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `delete from auth.users where id='${userId}'::uuid and email='${email}'` }),
    });
    if (!cleanup.ok) throw new Error(`Temporary account cleanup failed (HTTP ${cleanup.status})`);
    console.log('Temporary verification account removed.');
  }
}

import { readFile } from 'node:fs/promises';
import { parseEnv } from './env.mjs';

const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
if (!values.SUPABASE_ACCESS_TOKEN) throw new Error('Set SUPABASE_ACCESS_TOKEN in root .env. Never paste it into chat.');
if (!/^[a-z]{20}$/.test(values.SUPABASE_PROJECT_ID || '')) throw new Error('Invalid project ID');
const url = `https://api.supabase.com/v1/projects/${values.SUPABASE_PROJECT_ID}/config/auth`;
const desired = {
  external_anonymous_users_enabled: true,
  external_email_enabled: true,
  external_phone_enabled: false,
  mailer_autoconfirm: true,
  password_min_length: 8,
  site_url: values.WEB_ORIGIN || 'http://localhost:5173',
  uri_allow_list: `${values.WEB_ORIGIN || 'http://localhost:5173'}/auth/callback,conference://auth/callback`,
};
const headers = { Authorization: `Bearer ${values.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
const response = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(desired) });
if (!response.ok) throw new Error(`Auth configuration failed (HTTP ${response.status})`);
const check = await fetch(url, { headers });
if (!check.ok) throw new Error(`Auth verification failed (HTTP ${check.status})`);
const actual = await check.json();
for (const [key, value] of Object.entries(desired)) {
  if (actual[key] !== value) throw new Error(`Auth setting did not persist: ${key}`);
}
console.log('Verified email/password without email confirmation, guest sign-ins, and disabled phone authentication.');

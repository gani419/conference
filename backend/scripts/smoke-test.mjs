import { readFile } from 'node:fs/promises';
import { parseEnv } from './env.mjs';
const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
for (const name of ['conference-api', 'media-token']) {
  const response = await fetch(`${values.SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST', headers: { apikey: values.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: '{}',
  });
  if (response.status !== 401) throw new Error(`${name}: expected unauthenticated HTTP 401, got ${response.status}`);
  console.log(`${name}: unauthenticated request rejected (401)`);
}
const response = await fetch(`${values.SUPABASE_URL}/functions/v1/media-webhook`, { method: 'POST', body: '{}' });
if (response.status !== 401) throw new Error(`media-webhook: expected unsigned request rejection, got ${response.status}`);
console.log('media-webhook: unsigned request rejected (401)');
const auth = await fetch(`${values.SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: values.SUPABASE_PUBLISHABLE_KEY } });
if (!auth.ok) throw new Error(`Auth settings HTTP ${auth.status}`);
const settings = await auth.json();
console.log(`Hosted auth: email=${settings.external?.email}, anonymous=${settings.external?.anonymous_users}, phone=${settings.external?.phone}`);

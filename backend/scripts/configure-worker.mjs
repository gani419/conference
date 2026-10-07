import { readFile } from 'node:fs/promises';
import { parseEnv } from './env.mjs';

const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
if (!values.SUPABASE_ACCESS_TOKEN || !values.BACKEND_WORKER_SECRET) throw new Error('Management token and worker secret required in root .env');
if (!/^[a-z]{20}$/.test(values.SUPABASE_PROJECT_ID || '')) throw new Error('Invalid project ID');
if (!/^[A-Za-z0-9_-]{32,}$/.test(values.BACKEND_WORKER_SECRET)) throw new Error('Worker secret must contain at least 32 URL-safe characters');
const literal = value => `'${value.replaceAll("'", "''")}'`;
const secrets = {
  conference_worker_url: `https://${values.SUPABASE_PROJECT_ID}.supabase.co/functions/v1/outbox-worker`,
  conference_worker_secret: values.BACKEND_WORKER_SECRET,
};
const blocks = Object.entries(secrets).map(([name, value]) => `do $worker_config$
declare existing uuid;
begin
  select id into existing from vault.secrets where name=${literal(name)};
  if existing is null then perform vault.create_secret(${literal(value)},${literal(name)},'Conference cloud worker');
  else perform vault.update_secret(existing,${literal(value)}); end if;
end $worker_config$;`);
const response = await fetch(`https://api.supabase.com/v1/projects/${values.SUPABASE_PROJECT_ID}/database/query`, {
  method: 'POST', headers: { Authorization: `Bearer ${values.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: blocks.join('\n') }),
});
if (!response.ok) throw new Error(`Worker configuration failed (HTTP ${response.status})`);
console.log('Cloud worker credentials provisioned in encrypted Vault. Secret values were not logged.');
const check = await fetch(`${values.SUPABASE_URL}/functions/v1/outbox-worker`, {
  method: 'POST', headers: { Authorization: `Bearer ${values.BACKEND_WORKER_SECRET}`, 'Content-Type': 'application/json' }, body: '{}',
});
if (!check.ok) throw new Error(`Worker check failed (HTTP ${check.status})`);
const result = await check.json();
console.log(`Worker reachable: delivered=${result.delivered}, failed=${result.failed}`);

import { readFile } from 'node:fs/promises';
import { parseEnv } from './env.mjs';

const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
if (!values.SUPABASE_ACCESS_TOKEN) throw new Error('Set SUPABASE_ACCESS_TOKEN in root .env');
if (!/^[a-z]{20}$/.test(values.SUPABASE_PROJECT_ID || '')) throw new Error('Invalid project ID');
const names = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'BACKEND_WORKER_SECRET', 'WEB_ORIGIN', 'WEB_ADDITIONAL_ORIGINS', 'RESEND_API_KEY', 'EMAIL_FROM', 'FCM_SERVICE_ACCOUNT_JSON', 'FIREBASE_PROJECT_ID'];
const secrets = names.filter(name => values[name]).map(name => ({ name, value: values[name] }));
const response = await fetch(`https://api.supabase.com/v1/projects/${values.SUPABASE_PROJECT_ID}/secrets`, {
  method: 'POST', headers: { Authorization: `Bearer ${values.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(secrets),
});
if (!response.ok) throw new Error(`Secret upload failed (HTTP ${response.status})`);
console.log(`Uploaded ${secrets.length} backend environment variables. Secret values were not logged.`);

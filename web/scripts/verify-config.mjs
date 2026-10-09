import { readFile, readdir } from 'node:fs/promises';
import { parseEnv } from '../../backend/scripts/env.mjs';
const web = new URL('../', import.meta.url);
const values = parseEnv(await readFile(new URL('../.env', web), 'utf8'));
const browser = parseEnv(await readFile(new URL('.env', web), 'utf8'));
const allowed = new Set(
  [
    'SUPABASE_PROJECT_ID',
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'LIVEKIT_URL',
    'FIREBASE_PROJECT_ID', 'FIREBASE_WEB_APP_ID', 'FIREBASE_WEB_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_WEB_VAPID_KEY',
  ].map(key => `VITE_${key}`),
);
if (Object.keys(browser).some(key => !allowed.has(key)))
  throw Error('Unexpected key in generated browser environment.');
const privateValues = Object.entries(values).filter(
  ([key, value]) =>
    /SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|DATABASE_URL|RESEND_API_KEY|LIVEKIT_API_KEY|FCM_SERVICE_ACCOUNT|SMTP_PASS/i.test(
      key,
    ) && value.length >= 8,
);
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(entry.name, directory);
    if (entry.isDirectory())
      await inspect(new URL(`${entry.name}/`, directory));
    else if (/\.(js|css|html|map)$/.test(entry.name)) {
      const content = await readFile(file, 'utf8');
      for (const [key, value] of privateValues)
        if (content.includes(value))
          throw Error(`Private ${key} detected in the web build.`);
    }
  }
}
await inspect(new URL('dist/', web));
console.log(
  'Verified public-only browser configuration and no root private credentials in build artifacts.',
);

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv, projectEnv } from '../../backend/scripts/env.mjs';
const web = new URL('../', import.meta.url);
const values = parseEnv(await readFile(new URL('../.env', web), 'utf8'));
for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'])
  if (!values[key]) throw new Error(key + ' missing from root .env');
await writeFile(new URL('.env', web), projectEnv(values, 'web'));
const config = {
  projectId: values.FIREBASE_PROJECT_ID,
  appId: values.FIREBASE_WEB_APP_ID,
  apiKey: values.FIREBASE_WEB_API_KEY,
  authDomain: values.FIREBASE_AUTH_DOMAIN,
  messagingSenderId: values.FIREBASE_MESSAGING_SENDER_ID,
};
await mkdir(new URL('public/', web), { recursive: true });
await writeFile(
  new URL('public/firebase-messaging-sw.js', web),
  'const FIREBASE_CONFIG = ' +
    JSON.stringify(config) +
    ';\n' +
    (await readFile(
      new URL('src/firebase-messaging-sw.template.js', web),
      'utf8',
    )),
);
console.log(
  'Generated public web configuration and notification worker. Server secrets excluded.',
);

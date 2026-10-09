import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from '../../backend/scripts/env.mjs';
const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
const names = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'LIVEKIT_URL'];
for (const name of names) if (!values[name]) throw new Error('Missing ' + name + ' in root .env');
const publicValues = Object.fromEntries(names.map(name => [name, values[name]]));
await writeFile(new URL('../../src/config/publicEnvironment.generated.ts', import.meta.url),
  '// Generated public configuration. Server secrets excluded.\nexport const PUBLIC_ENV = ' + JSON.stringify(publicValues, null, 2) + ' as const;\n');
const firebaseKeys = ['FIREBASE_PROJECT_ID', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_ANDROID_APP_ID', 'FIREBASE_ANDROID_API_KEY'];
for (const name of firebaseKeys) if (!values[name]) throw new Error('Missing ' + name + ' in root .env');
const googleServices = {
  project_info: { project_number: values.FIREBASE_MESSAGING_SENDER_ID, project_id: values.FIREBASE_PROJECT_ID },
  client: [{ client_info: { mobilesdk_app_id: values.FIREBASE_ANDROID_APP_ID, android_client_info: { package_name: 'com.conference' } },
    api_key: [{ current_key: values.FIREBASE_ANDROID_API_KEY }] }], configuration_version: '1',
};
await writeFile(new URL('../../android/app/google-services.json', import.meta.url), JSON.stringify(googleServices, null, 2) + '\n');
console.log('Mobile public and Firebase Android configuration generated. Server secrets excluded.');

import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { parseEnv } from './env.mjs';
const values = parseEnv(
  await readFile(new URL('../../.env', import.meta.url), 'utf8'),
);
const account = JSON.parse(values.FCM_SERVICE_ACCOUNT_JSON || '{}');
if (!account.private_key || account.project_id !== values.FIREBASE_PROJECT_ID)
  throw new Error('Firebase sender credentials missing or project mismatch.');
const now = Math.floor(Date.now() / 1000);
const enc = text => Buffer.from(text).toString('base64url');
const unsigned =
  enc(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) +
  '.' +
  enc(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
const key = await webcrypto.subtle.importKey(
  'pkcs8',
  Buffer.from(account.private_key.replace(/-----[^-]+-----|\s/g, ''), 'base64'),
  { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  false,
  ['sign'],
);
const signature = await webcrypto.subtle.sign(
  'RSASSA-PKCS1-v1_5',
  key,
  new TextEncoder().encode(unsigned),
);
const oauth = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  signal: AbortSignal.timeout(15000),
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: unsigned + '.' + Buffer.from(signature).toString('base64url'),
  }),
});
if (!oauth.ok)
  throw new Error(
    'Firebase sender authentication failed (' + oauth.status + ').',
  );
const authorized = await oauth.json();
const response = await fetch(
  'https://fcm.googleapis.com/v1/projects/' +
    account.project_id +
    '/messages:send',
  {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: 'Bearer ' + authorized.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      validate_only: true,
      message: {
        token: 'invalid-registration-token-for-validation-only',
        data: { kind: 'meeting_invitation' },
      },
    }),
  },
);
const result = await response.json();
if (response.status !== 400 || result.error?.status !== 'INVALID_ARGUMENT')
  throw new Error('FCM sender validation failed (' + response.status + ').');
console.log(
  'Firebase OAuth and FCM send authorization verified. Validation used an invalid test token; no notification was sent.',
);

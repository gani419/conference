import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseEnv } from '../../backend/scripts/env.mjs';
const root = new URL('../../', import.meta.url);
const values = parseEnv(await readFile(new URL('.env', root), 'utf8'));
const project = values.FIREBASE_PROJECT_ID || '';
if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project))
  throw Error(
    'Set FIREBASE_PROJECT_ID in root .env to your Firebase Project ID.',
  );
const site = values.FIREBASE_HOSTING_SITE_ID || project;
const legacySite = values.FIREBASE_HOSTING_LEGACY_SITE_ID || '';
for (const id of [site, legacySite].filter(Boolean)) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(id))
    throw Error('Invalid Firebase Hosting site ID.');
}
const origin = `https://${site}.web.app`;
if (values.WEB_ORIGIN !== origin)
  throw Error(
    `Set WEB_ORIGIN in root .env to ${origin}, then configure the backend for that origin before deployment.`,
  );
const configuration = JSON.parse(
  await readFile(new URL('firebase.json', root), 'utf8'),
);
const hosting = configuration.hosting;
if (Array.isArray(hosting))
  throw Error('Expected the shared Hosting configuration object.');
const sites = [...new Set([site, legacySite].filter(Boolean))];
configuration.hosting = sites.map(siteId => ({ ...hosting, site: siteId }));
const temporaryConfig = `.env.firebase-hosting-${randomUUID()}.json`;
await writeFile(
  new URL(temporaryConfig, root),
  JSON.stringify(configuration, null, 2) + '\n',
);
const cleanup = async () => {
  await unlink(new URL(temporaryConfig, root)).catch(() => {});
};
const args = [
  '--yes',
  'firebase-tools@15.33.0',
  'deploy',
  '--only',
  'hosting',
  '--config',
  temporaryConfig,
  '--project',
  project,
];
// Project ID is strictly validated; all remaining shell arguments are fixed literals.
const child =
  process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', `npx ${args.join(' ')}`], {
        cwd: fileURLToPath(root),
        stdio: 'inherit',
      })
    : spawn('npx', args, { cwd: fileURLToPath(root), stdio: 'inherit' });
child.on('error', async () => {
  await cleanup();
  console.error('Unable to start Firebase CLI.');
  process.exitCode = 1;
});
child.on('close', async code => {
  await cleanup();
  process.exitCode = code ?? 1;
});

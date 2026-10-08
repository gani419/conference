import { readFile } from 'node:fs/promises';
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
const origin = `https://${project}.web.app`;
if (values.WEB_ORIGIN !== origin)
  throw Error(
    `Set WEB_ORIGIN in root .env to ${origin}, then configure the backend for that origin before deployment.`,
  );
const args = [
  '--yes',
  'firebase-tools@15.33.0',
  'deploy',
  '--only',
  'hosting',
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
child.on('error', () => {
  console.error('Unable to start Firebase CLI.');
  process.exitCode = 1;
});
child.on('close', code => {
  process.exitCode = code ?? 1;
});

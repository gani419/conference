import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseEnv } from './env.mjs';

const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
if (!values.SUPABASE_ACCESS_TOKEN) throw new Error('Set SUPABASE_ACCESS_TOKEN in root .env');
if (!/^[a-z]{20}$/.test(values.SUPABASE_PROJECT_ID || '')) throw new Error('Invalid project ID');
const args = ['--yes', 'supabase', 'link', '--project-ref', values.SUPABASE_PROJECT_ID, '--yes'];
const env = { ...process.env, SUPABASE_ACCESS_TOKEN: values.SUPABASE_ACCESS_TOKEN };
if (values.SUPABASE_DB_PASSWORD) env.SUPABASE_DB_PASSWORD = values.SUPABASE_DB_PASSWORD;
const options = { cwd: fileURLToPath(new URL('../', import.meta.url)), env, stdio: 'inherit' };
const result = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/s', '/c', `npx.cmd ${args.join(' ')}`], options)
  : spawnSync('npx', args, options);
if (result.error) throw new Error('Supabase CLI could not start');
process.exitCode = result.status ?? 1;

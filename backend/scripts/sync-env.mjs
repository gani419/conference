import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv, projectEnv } from './env.mjs';

const root = new URL('../../', import.meta.url);
const values = parseEnv(await readFile(new URL('.env', root), 'utf8'));
for (const [audience, relative] of [['backend', 'backend/.env'], ['mobile', 'mobile/.env'], ['web', 'web/.env']]) {
  const target = new URL(relative, root);
  await mkdir(new URL('./', target), { recursive: true });
  await writeFile(target, projectEnv(values, audience), { mode: 0o600 });
  console.log(`Updated ${fileURLToPath(target)} (${audience} configuration)`);
}

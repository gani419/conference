import { readFile, writeFile } from 'node:fs/promises';
import { parseEnv } from '../../backend/scripts/env.mjs';

const values = parseEnv(
  await readFile(new URL('../../.env', import.meta.url), 'utf8'),
);
const names = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'LIVEKIT_URL'];
for (const name of names)
  if (!values[name]) throw new Error(`Missing ${name} in root .env`);
const publicValues = Object.fromEntries(
  names.map(name => [name, values[name]]),
);
await writeFile(
  new URL('../../src/config/publicEnvironment.generated.ts', import.meta.url),
  `// Generated from root .env using an explicit public allowlist.\nexport const PUBLIC_ENV = ${JSON.stringify(
    publicValues,
    null,
    2,
  )} as const;\n`,
);
console.log(
  'Mobile public configuration generated. Server secrets are excluded.',
);

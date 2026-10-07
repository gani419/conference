import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from './env.mjs';

const values = parseEnv(await readFile(new URL('../../.env', import.meta.url), 'utf8'));
for (const key of ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'SUPABASE_URL']) if (!values[key]) throw new Error(`Set ${key} in root .env`);
const yaml = `port: 7880\nbind_addresses:\n  - "127.0.0.1"\nrtc:\n  tcp_port: 7881\n  port_range_start: 50000\n  port_range_end: 60000\n  use_external_ip: true\nkeys:\n  ${JSON.stringify(values.LIVEKIT_API_KEY)}: ${JSON.stringify(values.LIVEKIT_API_SECRET)}\nwebhook:\n  api_key: ${JSON.stringify(values.LIVEKIT_API_KEY)}\n  urls:\n    - ${JSON.stringify(values.SUPABASE_URL + '/functions/v1/media-webhook')}\n`;
const directory = new URL('../livekit/generated/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('livekit.yaml', directory), yaml, { mode: 0o600 });
console.log('Generated private LiveKit server configuration.');

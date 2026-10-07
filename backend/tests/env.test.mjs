import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv, projectEnv } from '../scripts/env.mjs';

test('public clients receive no server credentials even when new secrets are added', () => {
  const values = parseEnv('SUPABASE_URL=https://example.supabase.co\nSUPABASE_PUBLISHABLE_KEY=public\nLIVEKIT_API_SECRET=private\nSUPABASE_ACCESS_TOKEN=management\nNEW_SECRET=extra');
  for (const client of ['web', 'mobile']) {
    const output = projectEnv(values, client);
    assert.ok(output.includes('https://example.supabase.co'));
    assert.ok(!output.includes('private'));
    assert.ok(!output.includes('management'));
    assert.ok(!output.includes('extra'));
  }
  assert.ok(projectEnv(values, 'backend').includes('LIVEKIT_API_SECRET=private'));
});

import assert from 'node:assert/strict';
import { roomToken, mediaPermission } from '../supabase/functions/_shared/media.ts';
import { endpoint, authenticate } from '../supabase/functions/_shared/client.ts';

Deno.test('media tokens limit publication to database permissions and contain no admin grants', async () => {
  Deno.env.set('LIVEKIT_API_KEY', 'test-key');
  Deno.env.set('LIVEKIT_API_SECRET', 'test-secret-at-least-thirty-two-characters');
  Deno.env.set('LIVEKIT_URL', 'wss://test.invalid');
  const response = await roomToken('test-room', 'test-user', 'Test', { camera: false, microphone: true, screenShare: false, chat: true });
  const claims = JSON.parse(atob(response.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  assert.equal(claims.sub, 'test-user');
  assert.equal(claims.video.room, 'test-room');
  assert.deepEqual(claims.video.canPublishSources, ['microphone']);
  assert.equal(claims.video.canPublishData, false);
  assert.ok(!claims.video.roomAdmin);
  assert.ok(!claims.video.roomCreate);
  assert.equal(claims.exp - claims.nbf, 60);
  assert.equal(mediaPermission({ camera: false, microphone: false, screenShare: false, chat: true }).canPublish, false);
});

Deno.test('API rejects unauthenticated requests, unsupported methods, and invalid origins', async () => {
  Deno.env.set('WEB_ORIGIN', 'http://localhost:5173');
  const handler = endpoint(async request => { await authenticate(request); return {}; });
  const unauthenticated = await handler(new Request('https://api.invalid', { method: 'POST', body: '{}' }));
  assert.equal(unauthenticated.status, 401);
  assert.equal((await handler(new Request('https://api.invalid'))).status, 405);
  const deniedOrigin = await handler(new Request('https://api.invalid', { method: 'POST', headers: { Origin: 'https://attacker.invalid' }, body: '{}' }));
  assert.equal(deniedOrigin.status, 403);
  assert.equal(deniedOrigin.headers.get('Access-Control-Allow-Origin'), null);
});

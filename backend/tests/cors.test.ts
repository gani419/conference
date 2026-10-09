import assert from 'node:assert/strict';
import { cors, endpoint } from '../supabase/functions/_shared/client.ts';
Deno.test(
  'CORS permits exact primary and legacy origins without permitting lookalikes',
  async () => {
    const before = [
      Deno.env.get('WEB_ORIGIN'),
      Deno.env.get('WEB_ADDITIONAL_ORIGINS'),
    ];
    Deno.env.set('WEB_ORIGIN', 'https://meet-conference.web.app');
    Deno.env.set(
      'WEB_ADDITIONAL_ORIGINS',
      ' https://conference-79cf2.web.app ',
    );
    try {
      for (const origin of [
        'https://meet-conference.web.app',
        'https://conference-79cf2.web.app',
      ]) {
        const request = new Request('https://example.test', {
          method: 'OPTIONS',
          headers: { Origin: origin },
        });
        const response = await endpoint(async () => ({}))(request);
        assert.equal(response.status, 204);
        assert.equal(
          response.headers.get('Access-Control-Allow-Origin'),
          origin,
        );
        assert.equal(response.headers.get('Vary'), 'Origin');
      }
      for (const origin of [
        'https://meet-conference.web.app.evil.test',
        'http://meet-conference.web.app',
        'https://untrusted.test',
      ]) {
        const response = await endpoint(async () => ({}))(
          new Request('https://example.test', {
            method: 'OPTIONS',
            headers: { Origin: origin },
          }),
        );
        assert.equal(response.status, 403);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
      }
      assert.equal(
        cors(new Request('https://example.test'))[
          'Access-Control-Allow-Origin'
        ],
        undefined,
      );
    } finally {
      for (const [index, key] of [
        'WEB_ORIGIN',
        'WEB_ADDITIONAL_ORIGINS',
      ].entries()) {
        if (before[index] === undefined) Deno.env.delete(key);
        else Deno.env.set(key, before[index]!);
      }
    }
  },
);

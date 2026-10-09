import assert from 'node:assert/strict';
import { pushMessage, sendPush, deliverInvitationPush } from '../supabase/functions/_shared/push.ts';
import { adminClient } from '../supabase/functions/_shared/client.ts';
Deno.test('FCM authenticates with a short-lived signed service-account assertion; web remains data-only', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['sign','verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  Deno.env.set('FIREBASE_PROJECT_ID', 'test-project');
  Deno.env.set('FCM_SERVICE_ACCOUNT_JSON', JSON.stringify({ project_id: 'test-project', client_email: 'test@test-project.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\n' + btoa(String.fromCharCode(...pkcs8)) + '\n-----END PRIVATE KEY-----' }));
  const original = globalThis.fetch;
  let errorCode = 'UNREGISTERED';
  globalThis.fetch = (async (input, options) => {
    if (String(input).includes('oauth2')) {
      const assertion = (options!.body as URLSearchParams).get('assertion')!;
      const [header, payload, signature] = assertion.split('.');
      const decode = (text: string) => Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
      assert.ok(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pair.publicKey, decode(signature), new TextEncoder().encode(header+'.'+payload)));
      const claims = JSON.parse(new TextDecoder().decode(decode(payload)));
      assert.equal(claims.exp-claims.iat, 3600);
      assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');
      return Response.json({ access_token: 'test-oauth', expires_in: 3600 });
    }
    const body = JSON.parse(options!.body as string);
    assert.equal((options!.headers as Record<string,string>).Authorization, 'Bearer test-oauth');
    assert.equal(body.message.data.userId, 'recipient');
    assert.equal(body.message.notification, undefined);
    return Response.json({ error: { details: [{ errorCode }] } }, { status: 400 });
  }) as typeof fetch;
  try {
    const data = { userId:'recipient', meetingId:'meeting', notificationId:'notice', kind:'meeting_invitation' };
    assert.equal((pushMessage('test-token','web',data) as Record<string,unknown>).android, undefined);
    assert.ok((pushMessage('test-token','android',data) as Record<string,unknown>).android);
    assert.equal(await sendPush('test-token','web',data), 'expired');
    errorCode='INVALID_ARGUMENT';
    await assert.rejects(() => sendPush('test-token','web',data), /Push delivery failed/);
  } finally { globalThis.fetch=original; }
});
Deno.test('read, revoked and ended invitations never deliver media or push requests', async () => {
  for (const scenario of ['read','revoked','ended']) {
    const client = {
      from(table: string) {
        const value = table==='notifications' ? { id:'notice',user_id:'recipient',meeting_id:'meeting',invitation_id:'invite',is_read:scenario==='read' }
          : table==='invitations' ? {status:scenario==='revoked'?'revoked':'pending'}
          : table==='meetings' ? {status:scenario==='ended'?'ended':'live'} : [];
        const builder = { select:()=>builder, eq:()=>builder, maybeSingle:async()=>({data:value,error:null}),
          then: (resolve: (value: unknown)=>void) => resolve({data:value,error:null}) };
        return builder;
      },
    } as unknown as ReturnType<typeof adminClient>;
    await deliverInvitationPush(client,'notice');
  }
});

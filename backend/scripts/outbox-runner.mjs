// Keep this server-side process running alongside self-hosted LiveKit.
const url = process.env.SUPABASE_URL;
const secret = process.env.BACKEND_WORKER_SECRET;
if (!url || !secret) throw new Error('Worker environment is incomplete');
for (;;) {
  try {
    const response = await fetch(`${url}/functions/v1/outbox-worker`, {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: '{}', signal: AbortSignal.timeout(45000),
    });
    console.log(response.ok ? JSON.stringify(await response.json()) : `Worker HTTP ${response.status}`);
  } catch { console.error('Worker unavailable; will retry'); }
  await new Promise(resolve => setTimeout(resolve, 1000));
}

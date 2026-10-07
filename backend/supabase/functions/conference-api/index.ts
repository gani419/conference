import { authenticate, endpoint, HttpError } from '../_shared/client.ts';

Deno.serve(endpoint(async request => {
  const { client } = await authenticate(request);
  const body = await request.json();
  if (typeof body.action !== 'string' || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) throw new HttpError(400, 'INVALID_REQUEST');
  if (body.mode !== undefined && body.mode !== 'read' && body.mode !== 'command') throw new HttpError(400, 'INVALID_MODE');
  const { data, error } = await client.rpc(body.mode === 'read' ? 'conference_read' : 'conference_command', { action: body.action, payload: body.payload });
  if (error) throw new HttpError(error.code === '42501' ? 403 : error.code === '40001' ? 409 : 400, error.message);
  return { data };
}));

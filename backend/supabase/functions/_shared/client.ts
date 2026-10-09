import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Configuration missing: ${name}`);
  return value;
}

export function publicKey(): string {
  const keys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  return keys ? JSON.parse(keys).default : env('SUPABASE_PUBLISHABLE_KEY');
}

export function adminClient() {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  const key = keys
    ? JSON.parse(keys).default
    : env('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(env('SUPABASE_URL'), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticate(request: Request) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer '))
    throw new HttpError(401, 'UNAUTHENTICATED');
  const token = authorization.slice(7);
  const client = createClient(env('SUPABASE_URL'), publicKey(), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'INVALID_SESSION');
  if (!data.user.is_anonymous && !data.user.email_confirmed_at)
    throw new HttpError(403, 'EMAIL_NOT_VERIFIED');
  return { client, user: data.user };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function cors(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const allowed = [
    Deno.env.get('WEB_ORIGIN') || 'http://localhost:5173',
    ...(Deno.env.get('WEB_ADDITIONAL_ORIGINS') || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  ];
  if (origin && !allowed.includes(origin))
    throw new HttpError(403, 'ORIGIN_NOT_ALLOWED');
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
  };
}

export function endpoint(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request) => {
    let headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    try {
      headers = cors(request);
      if (request.method === 'OPTIONS')
        return new Response(null, { status: 204, headers });
      if (request.method !== 'POST')
        throw new HttpError(405, 'METHOD_NOT_ALLOWED');
      if (Number(request.headers.get('Content-Length') || 0) > 32768)
        throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
      return Response.json(await handler(request), { headers });
    } catch (error) {
      const status =
        error instanceof HttpError
          ? error.status
          : error instanceof SyntaxError
          ? 400
          : 503;
      return Response.json(
        {
          error:
            error instanceof HttpError
              ? error.message
              : error instanceof SyntaxError
              ? 'INVALID_JSON'
              : 'BACKEND_UNAVAILABLE',
        },
        { status, headers },
      );
    }
  };
}

// Node-only fixtures for hosted integration tests. Never import this into an app.
import { createClient } from '@supabase/supabase-js';
export async function createConfirmedTestAccount(env, { email, password, displayName }, onCreated) {
  if (!/^(web-test|device-test|push-host|push-recipient)-[a-f0-9]+@example\.com$/.test(email)) throw new Error('Only isolated example.com integration-test accounts are allowed.');
  const response = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_ID}/api-keys`, { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` } });
  if (!response.ok) throw new Error(`Test admin access unavailable (HTTP ${response.status}).`);
  const keys = await response.json();
  const adminKey = keys.find(key => key.name === 'service_role')?.api_key;
  if (!adminKey) throw new Error('Server-only test key unavailable.');
  const admin = createClient(env.SUPABASE_URL, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { displayName, avatarId: 'avatar-1' } });
  if (error || !data.user) throw new Error('Could not create the isolated test fixture.');
  // Persist the ID before login so an interrupted test can still clean it up.
  await onCreated(data.user.id);
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session) throw new Error('Test fixture sign-in failed.');
  return login.data.session;
}

export function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#')).map(line => {
    const index = line.indexOf('=');
    if (index < 1) throw new Error('Invalid environment entry');
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [key, value];
  }));
}

export function projectEnv(values, audience) {
  const publicKeys = ['SUPABASE_PROJECT_ID', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'LIVEKIT_URL'];
  const firebaseKeys = ['FIREBASE_PROJECT_ID', 'FIREBASE_WEB_APP_ID', 'FIREBASE_WEB_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_WEB_VAPID_KEY'];
  const keys = audience === 'backend' ? [...publicKeys, 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'WEB_ORIGIN', 'WEB_ADDITIONAL_ORIGINS', 'BACKEND_WORKER_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'FCM_SERVICE_ACCOUNT_JSON', 'FIREBASE_PROJECT_ID'] : audience === 'web' ? [...publicKeys, ...firebaseKeys] : publicKeys;
  return keys.map(key => `${audience === 'web' ? 'VITE_' : ''}${key}=${values[key] || ''}`).join('\n') + '\n';
}

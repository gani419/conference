import { createClient } from '@supabase/supabase-js';
import type { ConferenceBackend, Identity, Meeting } from './types';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configurationReady = Boolean(url && key);
const previews = new Map<string, Meeting>();
const client = createClient(
  url || 'https://unconfigured.supabase.co',
  key || 'unconfigured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
export class AuthFlowError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}
function check(error: { message: string; code?: string } | null) {
  if (error) throw new AuthFlowError(error.message, error.code);
}
async function request<T>(
  path: string,
  body: object,
  signal?: AbortSignal,
): Promise<T> {
  const { data, error } = await client.auth.getSession();
  check(error);
  if (!data.session) throw new Error('Please sign in again.');
  const response = await fetch(`${url}/functions/v1/${path}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok)
    throw new Error(json.error || 'Unable to complete the request.');
  return json;
}
export const backend: ConferenceBackend = {
  async restore() {
    const { data, error } = await client.auth.getSession();
    check(error);
    if (!data.session) return null;
    const userResult = await client.auth.getUser();
    if (userResult.error) {
      if (!userResult.error.status || userResult.error.status >= 500)
        throw new Error(
          'Unable to restore your account. Check your connection and retry.',
        );
      await client.auth.signOut({ scope: 'local' });
      return null;
    }
    const user = userResult.data.user;
    const profile = await client
      .from('profiles')
      .select('display_name,avatar_id')
      .eq('id', user.id)
      .single();
    check(profile.error);
    return {
      id: user.id,
      name:
        profile.data?.display_name || user.user_metadata.displayName || 'Guest',
      guest: !!user.is_anonymous,
      email: user.email,
      avatarId: profile.data?.avatar_id || 'avatar-1',
    } satisfies Identity;
  },
  async signIn(email, password) {
    check((await client.auth.signInWithPassword({ email, password })).error);
  },
  async signUp(name, email, password, avatarId = 'avatar-1') {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { displayName: name, avatarId } },
    });
    check(error);
    if (!data.user) throw new Error('Account creation failed.');
    return { requiresVerification: !data.session };
  },
  async verifyEmail(email, code) {
    const { data, error } = await client.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    check(error);
    if (!data.session)
      throw new Error('Verification failed. Request a new code.');
  },
  async resendEmailVerification(email) {
    check((await client.auth.resend({ type: 'signup', email })).error);
  },
  async guest(name) {
    check(
      (
        await client.auth.signInAnonymously({
          options: { data: { displayName: name, avatarId: 'avatar-1' } },
        })
      ).error,
    );
  },
  async signOut() {
    check((await client.auth.signOut({ scope: 'local' })).error);
    previews.clear();
  },
  onIdentityChange(callback) {
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      // Do not await SDK methods while its auth callback holds the session lock.
      setTimeout(() => {
        void client.realtime.setAuth(session?.access_token);
        callback();
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  },
  async read<T>(
    action: string,
    payload: { meetingId?: string } = {},
    signal?: AbortSignal,
  ) {
    try {
      return (
        await request<{ data: T }>(
          'conference-api',
          { mode: 'read', action, payload },
          signal,
        )
      ).data;
    } catch (error) {
      if (
        action === 'meeting_details' &&
        payload.meetingId &&
        error instanceof Error &&
        error.message === 'MEETING_NOT_FOUND'
      ) {
        let preview = previews.get(payload.meetingId);
        const code = sessionStorage.getItem(
          `conference-preview:${payload.meetingId}`,
        );
        if (!preview && code) {
          const resolved = (
            await request<{ data: Meeting }>('conference-api', {
              mode: 'command',
              action: 'resolve_meeting',
              payload: { code },
            })
          ).data;
          if (resolved.id === payload.meetingId)
            preview = {
              ...resolved,
              version: 0,
              description: '',
              default_permissions: {
                microphone: false,
                camera: false,
                screenShare: false,
                chat: false,
              },
            };
        }
        if (preview) return preview as T;
      }
      throw error;
    }
  },
  async command<T>(action: string, payload: object) {
    const value = (
      await request<{ data: T }>('conference-api', {
        mode: 'command',
        action,
        payload,
      })
    ).data;
    if (action === 'resolve_meeting') {
      const m = value as Meeting;
      sessionStorage.setItem(`conference-preview:${m.id}`, m.code);
      previews.set(m.id, {
        ...m,
        version: 0,
        description: '',
        default_permissions: {
          microphone: false,
          camera: false,
          screenShare: false,
          chat: false,
        },
      });
    }
    return value;
  },
  mediaToken(meetingId) {
    return request('media-token', { meetingId });
  },
  subscribe(callback, userId, meetingId) {
    const channel = client.channel(`conference-web-${crypto.randomUUID()}`);
    const filters = meetingId
      ? [
          ['meetings', `id=eq.${meetingId}`],
          ['participants', `meeting_id=eq.${meetingId}`],
          ['chat_messages', `meeting_id=eq.${meetingId}`],
          ['permission_requests', `meeting_id=eq.${meetingId}`],
        ]
      : [
          ['meetings', undefined],
          ['invitations', undefined],
          ['notifications', `user_id=eq.${userId}`],
        ];
    for (const [table, filter] of filters)
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table!,
          ...(filter ? { filter } : {}),
        },
        callback,
      );
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') callback();
    });
    return () => {
      void client.removeChannel(channel);
    };
  },
};

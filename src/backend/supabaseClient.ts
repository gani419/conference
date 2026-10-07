import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { createClient, processLock } from '@supabase/supabase-js';
import { PUBLIC_ENV } from '../config/publicEnvironment.generated';

const service = (key: string) => `com.conference.supabase.${key}`;
export const supabase = createClient(
  PUBLIC_ENV.SUPABASE_URL,
  PUBLIC_ENV.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
      storage: {
        async getItem(key) {
          const saved = await Keychain.getGenericPassword({
            service: service(key),
          });
          return saved ? saved.password : null;
        },
        async setItem(key, value) {
          const saved = await Keychain.setGenericPassword('session', value, {
            service: service(key),
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
          if (!saved) throw new Error('Unable to save your session securely');
        },
        async removeItem(key) {
          await Keychain.resetGenericPassword({ service: service(key) });
        },
      },
    },
  },
);
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

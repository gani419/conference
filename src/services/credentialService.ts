import * as Keychain from 'react-native-keychain';
import { Session, SessionTokens } from '../types/auth';

const KEYCHAIN_SERVICE_TOKENS = 'com.conference.app.tokens';
const KEYCHAIN_SERVICE_SESSION = 'com.conference.app.session';

export const credentialService = {
  async saveTokens(tokens: SessionTokens): Promise<boolean> {
    try {
      await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), {
        service: KEYCHAIN_SERVICE_TOKENS,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return true;
    } catch {
      return false;
    }
  },

  async getTokens(): Promise<SessionTokens | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE_TOKENS,
      });
      if (credentials && credentials.password) {
        return JSON.parse(credentials.password) as SessionTokens;
      }
      return null;
    } catch {
      return null;
    }
  },

  async saveSession(session: Session): Promise<boolean> {
    try {
      await Keychain.setGenericPassword('session', JSON.stringify(session), {
        service: KEYCHAIN_SERVICE_SESSION,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return true;
    } catch {
      return false;
    }
  },

  async getSession(): Promise<Session | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE_SESSION,
      });
      if (credentials && credentials.password) {
        return JSON.parse(credentials.password) as Session;
      }
      return null;
    } catch {
      return null;
    }
  },

  async clearSession(): Promise<boolean> {
    return this.clearAllCredentials();
  },

  async clearAllCredentials(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE_TOKENS });
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE_SESSION });
      return true;
    } catch {
      return false;
    }
  },
};

import { AppDispatch } from '../store';
import { setSession } from '../store/slices/authSlice';
import { setThemePreference } from '../store/slices/themeSlice';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { mockDatabase } from '../backend/mock/database';
import { ENV } from '../config/environment';

export async function bootstrapApp(dispatch: AppDispatch): Promise<void> {
  try {
    // 1. Initialize Mock Database if configured
    if (ENV.backendMode === 'mock') {
      mockDatabase.resetToSeed();
    }

    // 2. Load theme preference
    const storedTheme = storageService.getString(STORAGE_KEYS.THEME_PREFERENCE);
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      dispatch(setThemePreference(storedTheme));
    }

    // 3. Restore session
    const restoredSession = await authService.restoreSession();

    if (restoredSession) {
      dispatch(setSession(restoredSession));
    }
  } catch (error) {
    // Bootstrap failures should not crash the app, fallback to clean state
    console.warn('Bootstrap error:', error);
  }
}

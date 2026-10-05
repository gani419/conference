import { useColorScheme } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { getThemeTokens, ThemeTokens } from '../utils/tokenBridge';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeInfo {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  isDark: boolean;
  tokens: ThemeTokens;
}

export function useResolvedTheme(): ThemeInfo {
  const systemScheme = useColorScheme();
  const preference = useAppSelector((state) => state.theme.preference);

  let resolved: ResolvedTheme = 'light';
  if (preference === 'system') {
    resolved = systemScheme === 'dark' ? 'dark' : 'light';
  } else {
    resolved = preference;
  }

  const isDark = resolved === 'dark';
  const tokens = getThemeTokens(isDark);

  return {
    preference,
    resolved,
    isDark,
    tokens,
  };
}

import { useEffect, useState } from 'react';
import { getThemeTokens } from '../../shared/theme';
export type ThemePreference = 'system' | 'light' | 'dark';
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem('conference.theme');
      return saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch {
      return 'system';
    }
  });
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark =
        preference === 'dark' || (preference === 'system' && media.matches);
      const tokens = getThemeTokens(dark);
      const root = document.documentElement;
      root.dataset.theme = dark ? 'dark' : 'light';
      root.style.colorScheme = dark ? 'dark' : 'light';
      for (const [key, value] of Object.entries(tokens))
        root.style.setProperty(`--${key}`, value);
    };
    apply();
    try {
      localStorage.setItem('conference.theme', preference);
    } catch {
      /* Private browsing may disable storage. */
    }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);
  return { preference, setPreference };
}

export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHover: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryText: string;
  textMain: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderSubtle: string;
  success: string;
  successBg: string;
  successSurface: string;
  warning: string;
  warningBg: string;
  warningSurface: string;
  danger: string;
  dangerBg: string;
  dangerSurface: string;
  primarySurface: string;
  surfaceActive: string;
}

export const LIGHT_TOKENS: ThemeTokens = {
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  surfaceHover: '#F1F5F9',
  surfaceActive: '#E2E8F0',
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primaryLight: '#EEF2FF',
  primarySurface: '#EEF2FF',
  primaryText: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  border: '#E2E8F0',
  borderSubtle: '#EDF2F7',
  success: '#10B981',
  successBg: '#ECFDF5',
  successSurface: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningSurface: '#FFFBEB',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerSurface: '#FEF2F2',
};

export const DARK_TOKENS: ThemeTokens = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceSubtle: '#182234',
  surfaceHover: '#27354A',
  surfaceActive: '#334155',
  primary: '#6366F1',
  primaryHover: '#4F46E5',
  primaryLight: '#1E1B4B',
  primarySurface: '#1E1B4B',
  primaryText: '#FFFFFF',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  border: '#334155',
  borderSubtle: '#243044',
  success: '#34D399',
  successBg: '#064E3B',
  successSurface: '#064E3B',
  warning: '#FBBF24',
  warningBg: '#78350F',
  warningSurface: '#78350F',
  danger: '#F87171',
  dangerBg: '#7F1D1D',
  dangerSurface: '#7F1D1D',
};

export function getThemeTokens(isDark: boolean): ThemeTokens {
  return isDark ? DARK_TOKENS : LIGHT_TOKENS;
}

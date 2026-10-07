export type BackendMode = 'mock' | 'http' | 'supabase';
export type MediaMode = 'mock' | 'livekit';

export interface EnvironmentConfig {
  backendMode: BackendMode;
  mediaMode: MediaMode;
  apiBaseUrl: string;
  mockSimulatedLatencyMs: number;
  mockFailureRate: number; // 0.0 - 1.0 for testing network resilience
  appVersion: string;
  isDevelopment: boolean;
}

export const ENV: EnvironmentConfig = {
  backendMode: 'supabase',
  mediaMode: 'livekit',
  apiBaseUrl: 'https://api.conference.local',
  mockSimulatedLatencyMs: 300,
  mockFailureRate: 0,
  appVersion: '1.0.0',
  isDevelopment: __DEV__,
};

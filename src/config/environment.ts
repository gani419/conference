export type BackendMode = 'mock' | 'http';
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
  backendMode: 'mock',
  mediaMode: 'mock',
  apiBaseUrl: 'https://api.conference.local',
  mockSimulatedLatencyMs: 300,
  mockFailureRate: 0,
  appVersion: '1.0.0',
  isDevelopment: __DEV__,
};

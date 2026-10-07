import { BackendAdapter } from './BackendAdapter';
import { MockBackendAdapter } from './MockBackendAdapter';
import { HttpBackendAdapter } from './HttpBackendAdapter';
import { ENV } from '../config/environment';
import { SupabaseBackendAdapter } from './SupabaseBackendAdapter';

export const backend: BackendAdapter =
  ENV.backendMode === 'supabase' ? new SupabaseBackendAdapter() : ENV.backendMode === 'http'
    ? new HttpBackendAdapter(ENV.apiBaseUrl)
    : new MockBackendAdapter();

export * from './BackendAdapter';
export * from './mock/eventBus';
export * from './mock/scenarios';

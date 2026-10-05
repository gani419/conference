import { BackendAdapter } from './BackendAdapter';
import { MockBackendAdapter } from './MockBackendAdapter';
import { HttpBackendAdapter } from './HttpBackendAdapter';
import { ENV } from '../config/environment';

export const backend: BackendAdapter =
  ENV.backendMode === 'http'
    ? new HttpBackendAdapter(ENV.apiBaseUrl)
    : new MockBackendAdapter();

export * from './BackendAdapter';
export * from './mock/eventBus';
export * from './mock/scenarios';

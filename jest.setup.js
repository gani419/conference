/* eslint-env jest */
jest.mock('@react-native-clipboard/clipboard', () => ({ setString: jest.fn() }));
// Device SDKs are unavailable in Jest; adapter tests supply explicit server responses.
jest.mock('@livekit/react-native-webrtc', () => ({ RTCView: 'RTCView' }));
jest.mock('@livekit/react-native', () => ({
  VideoTrack: 'VideoTrack', registerGlobals: jest.fn(),
  AudioSession: { startAudioSession: jest.fn(), stopAudioSession: jest.fn(), selectAudioOutput: jest.fn() },
}));
jest.mock('./src/backend/supabaseClient', () => ({ supabase: {
  auth: { getSession: jest.fn(async()=>({data:{session:null},error:null})),
    onAuthStateChange: jest.fn(()=>({data:{subscription:{unsubscribe:jest.fn()}}})),
    signInWithPassword:jest.fn(),signUp:jest.fn(),signInAnonymously:jest.fn(),signOut:jest.fn(),getUser:jest.fn() },
  from:jest.fn(),channel:jest.fn(),removeChannel:jest.fn(),
} }));

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => {
  const map = new Map();
  return {
    createMMKV: () => ({
      set: (key, value) => {
        map.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      },
      getString: (key) => map.get(key) ?? null,
      getNumber: (key) => map.get(key) ?? 0,
      getBoolean: (key) => map.get(key) ?? false,
      remove: (key) => map.delete(key),
      contains: (key) => map.has(key),
      clearAll: () => map.clear(),
      getAllKeys: () => Array.from(map.keys()),
    }),
  };
});

// Mock react-native-keychain
jest.mock('react-native-keychain', () => {
  const store = {};
  return {
    setGenericPassword: jest.fn(async (username, password, options) => {
      const key = (options && options.service) || 'default';
      store[key] = { username, password };
      return true;
    }),
    getGenericPassword: jest.fn(async (options) => {
      const key = (options && options.service) || 'default';
      return store[key] || false;
    }),
    resetGenericPassword: jest.fn(async (options) => {
      const key = (options && options.service) || 'default';
      delete store[key];
      return true;
    }),
    ACCESSIBLE: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
    },
  };
});

// Mock react-native-share
jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock react-native-contacts
jest.mock('react-native-contacts', () => ({
  getAll: jest.fn(() => Promise.resolve([])),
  checkPermission: jest.fn(() => Promise.resolve('authorized')),
  requestPermission: jest.fn(() => Promise.resolve('authorized')),
}));

// Mock react-native-document-picker
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(() => Promise.resolve([])),
  keepLocalCopy:jest.fn(),isErrorWithCode:jest.fn(),errorCodes:{OPERATION_CANCELED:'OPERATION_CANCELED'},
  types: {
    allFiles: '*/*',
    csv: 'text/csv',
  },
}));

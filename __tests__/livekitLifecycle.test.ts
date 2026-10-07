import { AudioSession } from '@livekit/react-native';
import { hostedRequest } from '../src/backend/SupabaseBackendAdapter';
import { LiveKitMediaAdapter, liveRoom } from '../src/services/livekitMedia';

jest.mock('../src/backend/SupabaseBackendAdapter', () => ({
  hostedRequest: jest.fn(),
}));
jest.mock('livekit-client', () => ({
  Room: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    state: 'disconnected',
    localParticipant: {
      identity: 'host',
      isMicrophoneEnabled: false,
      isCameraEnabled: false,
    },
    remoteParticipants: new Map(),
  })),
  RoomEvent: {},
  ConnectionState: { SignalReconnecting: 'signalReconnecting' },
  Track: { Source: { Camera: 'camera', ScreenShare: 'screen_share' } },
}));

beforeEach(() => jest.clearAllMocks());

test('leaving during token retrieval prevents a stale media connection', async () => {
  let resolveToken!: (value: { token: string; serverUrl: string }) => void;
  jest.mocked(hostedRequest).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveToken = resolve;
      }),
  );
  const media = new LiveKitMediaAdapter();
  const connecting = media.connect('', 'old-meeting');
  await Promise.resolve();
  const leaving = media.disconnect();
  resolveToken({ token: 'old-token', serverUrl: 'wss://media.example' });
  expect(await connecting).toBe(false);
  await leaving;
  expect(liveRoom.connect).not.toHaveBeenCalled();
  expect(AudioSession.startAudioSession).not.toHaveBeenCalled();
});

test('switching meetings completes old cleanup before connecting the new room', async () => {
  let resolveToken!: (value: { token: string; serverUrl: string }) => void;
  jest
    .mocked(hostedRequest)
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveToken = resolve;
        }),
    )
    .mockResolvedValueOnce({
      token: 'new-token',
      serverUrl: 'wss://media.example',
    });
  const media = new LiveKitMediaAdapter();
  const oldConnection = media.connect('', 'old-meeting');
  await Promise.resolve();
  const cleanup = media.disconnect();
  const newConnection = media.connect('', 'new-meeting');
  resolveToken({ token: 'old-token', serverUrl: 'wss://media.example' });
  await Promise.all([oldConnection, cleanup, newConnection]);
  expect(liveRoom.connect).toHaveBeenCalledTimes(1);
  expect(liveRoom.connect).toHaveBeenCalledWith(
    'wss://media.example',
    'new-token',
  );
  expect(
    jest.mocked(liveRoom.disconnect).mock.invocationCallOrder[0],
  ).toBeLessThan(jest.mocked(liveRoom.connect).mock.invocationCallOrder[0]!);
});

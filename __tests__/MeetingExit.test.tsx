import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ROUTES } from '../src/constants/routes';
import { useMeetingRoomController } from '../src/features/room/useMeetingRoomController';
const mockNavigation = { replace: jest.fn() };
const mockRefresh = jest.fn();
let mockMeetingStatus = 'live';
let mockParticipantStatus = 'in_meeting';
const mockNoop = () => {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('../src/store/hooks', () => ({
  useAppSelector: () => ({ user: { id: 'guest-1' } }),
}));
jest.mock('../src/backend/SupabaseBackendAdapter', () => ({
  conferenceCommand: jest.fn(),
}));
jest.mock('../src/services/feedback', () => ({
  feedback: { alert: jest.fn() },
}));
jest.mock('../src/services/mediaService', () => ({
  mediaService: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    onTrackStateChange: () => mockNoop,
    onConnectionStateChange: () => mockNoop,
    getLocalMediaState: () => ({
      isAudioEnabled: false,
      isVideoEnabled: false,
      isScreenShareEnabled: false,
    }),
  },
}));
jest.mock('../src/api/appApi', () => {
  const api: Record<string, unknown> = {};
  for (const name of [
    'AdmitParticipant',
    'RemoveParticipant',
    'ChangeParticipantRole',
    'UpdateParticipantPermissions',
    'BulkUpdatePermissions',
    'RequestPermission',
    'DecidePermissionRequest',
    'SendChatMessage',
    'EndMeeting',
  ])
    api['use' + name + 'Mutation'] = () => [jest.fn(), {}];
  api.useGetMeetingDetailsQuery = () => ({
    data: { id: 'meeting-1', status: mockMeetingStatus, organizerId: 'host-1' },
    refetch: mockRefresh,
  });
  api.useGetParticipantsQuery = () => ({
    data: [
      {
        id: 'participant-1',
        userId: 'guest-1',
        status: mockParticipantStatus,
        role: 'participant',
        permissions: {
          microphone: true,
          camera: true,
          chat: true,
          screenShare: true,
        },
        media: {},
      },
    ],
    refetch: jest.fn(),
  });
  api.useGetPermissionRequestsQuery = () => ({ data: [], refetch: jest.fn() });
  api.useGetChatMessagesQuery = () => ({ data: [] });
  return api;
});
function Room() {
  useMeetingRoomController('meeting-1');
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockMeetingStatus = 'live';
  mockParticipantStatus = 'in_meeting';
});
test.each(['ended', 'cancelled'])(
  'uses the summary when left membership arrives before %s meeting details',
  async status => {
    let resolve!: (meeting: { status: string }) => void;
    mockRefresh.mockReturnValue({
      unwrap: () =>
        new Promise(done => {
          resolve = done;
        }),
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Room />);
    });
    mockParticipantStatus = 'left';
    await act(async () => {
      renderer.update(<Room />);
    });
    expect(mockNavigation.replace).not.toHaveBeenCalled();
    await act(async () => {
      resolve({ status });
    });
    expect(mockNavigation.replace).toHaveBeenCalledWith('MeetingSummary', {
      meetingId: 'meeting-1',
    });
    await act(async () => renderer.unmount());
  },
);
test('uses the dashboard for revoked access when the refreshed meeting remains live', async () => {
  mockRefresh.mockReturnValue({
    unwrap: () => Promise.resolve({ status: 'live' }),
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Room />);
  });
  mockParticipantStatus = 'left';
  await act(async () => {
    renderer.update(<Room />);
  });
  expect(mockNavigation.replace).toHaveBeenCalledWith(ROUTES.DASHBOARD);
  await act(async () => renderer.unmount());
});
test('does not navigate after unmount while refreshing the exit status', async () => {
  let resolve!: (meeting: { status: string }) => void;
  mockRefresh.mockReturnValue({
    unwrap: () =>
      new Promise(done => {
        resolve = done;
      }),
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Room />);
  });
  mockParticipantStatus = 'left';
  await act(async () => {
    renderer.update(<Room />);
  });
  await act(async () => renderer.unmount());
  await act(async () => {
    resolve({ status: 'ended' });
  });
  expect(mockNavigation.replace).not.toHaveBeenCalled();
});

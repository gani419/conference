import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import { DashboardSections } from '../src/features/dashboard/DashboardSections';
const mockAccept = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
const mockMarkAll = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
const mockRead = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('../src/hooks/useResolvedTheme', () => ({
  useResolvedTheme: () => ({ tokens: require('../shared/theme').LIGHT_TOKENS }),
}));
jest.mock('../src/hooks/useLayoutMode', () => ({
  useLayoutMode: () => ({ width: 820 }),
}));
jest.mock('../src/components/icons/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/api/appApi', () => ({
  useGetInvitationsQuery: () => ({
    data: [
      {
        id: 'invite-1',
        meetingId: 'meeting-1',
        meetingTitle: 'Team planning',
        organizerName: 'Host',
        role: 'guest',
        status: 'pending',
      },
    ],
    refetch: jest.fn(),
  }),
  useGetNotificationsQuery: () => ({
    data: [
      {
        id: 'note-1',
        meetingId: 'meeting-1',
        title: 'Meeting invitation',
        body: 'Join us',
        isRead: false,
        timestamp: '2026-10-08T10:00:00Z',
      },
    ],
    refetch: jest.fn(),
  }),
  useAcceptInvitationMutation: () => [mockAccept, {}],
  useDeclineInvitationMutation: () => [jest.fn(), {}],
  useMarkNotificationReadMutation: () => [mockRead, {}],
  useMarkAllNotificationsReadMutation: () => [mockMarkAll, {}],
}));
test('mobile exposes all dashboard sections and wires invitation and notification actions', async () => {
  const controller = {
    upcomingMeetings: [],
    recentMeetings: [],
    navigation: { navigate: mockNavigate },
    handleRefresh: jest.fn(),
  } as unknown as React.ComponentProps<typeof DashboardSections>['controller'];
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <DashboardSections controller={controller} />,
    );
  });
  const press = async (label: string) => {
    const button = renderer.root.findAllByType(TouchableOpacity).find(
      item =>
        item.findAll(
          node =>
            [node.props.children]
              .flat()
              .filter(value => typeof value === 'string')
              .join('') === label,
        ).length > 0,
    );
    if (!button) throw new Error('Missing button: ' + label);
    await act(async () => {
      await button.props.onPress();
    });
  };
  expect(
    renderer.root
      .findAllByType(TouchableOpacity)
      .filter(item => item.props.accessibilityRole === 'tab'),
  ).toHaveLength(4);
  await press('Invitations');
  await press('Accept');
  expect(mockAccept).toHaveBeenCalledWith({ invitationId: 'invite-1' });
  await press('Open');
  expect(mockNavigate).toHaveBeenCalledWith('MeetingDetails', {
    meetingId: 'meeting-1',
  });
  await act(async () => {
    renderer.root
      .findAllByType(TouchableOpacity)
      .filter(item => item.props.accessibilityRole === 'tab')[3]!
      .props.onPress();
  });
  await press('Mark all read');
  expect(mockMarkAll).toHaveBeenCalled();
  await press('Open');
  expect(mockRead).toHaveBeenCalledWith('note-1');
  await act(async () => renderer.unmount());
});

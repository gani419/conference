import { feedback } from '../../services/feedback';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { dashboardTabs, type DashboardTab } from '../../../shared/dashboard';
import {
  useGetInvitationsQuery,
  useGetNotificationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../api/appApi';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { AppIcon } from '../../components/icons/AppIcon';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ROUTES } from '../../constants/routes';
import { useDashboardController } from './useDashboardController';

export function DashboardSections({
  controller,
}: {
  controller: ReturnType<typeof useDashboardController>;
}) {
  const { tokens } = useResolvedTheme();
  const { width } = useLayoutMode();
  const focused = useIsFocused();
  const options = {
    pollingInterval: focused ? 4000 : 0,
    refetchOnMountOrArgChange: true,
  };
  const invitations = useGetInvitationsQuery(undefined, options);
  const notifications = useGetNotificationsQuery(undefined, options);
  const [accept, accepting] = useAcceptInvitationMutation();
  const [decline, declining] = useDeclineInvitationMutation();
  const [markRead, marking] = useMarkNotificationReadMutation();
  const [markAll, markingAll] = useMarkAllNotificationsReadMutation();
  const [tab, setTab] = useState<DashboardTab>('upcoming');
  const [actionError, setActionError] = useState('');
  const busy =
    accepting.isLoading ||
    declining.isLoading ||
    marking.isLoading ||
    markingAll.isLoading;
  const run = async (action: () => Promise<unknown>) => {
    setActionError('');
    try {
      await action();
    } catch (error) {
      setActionError(
        typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'Unable to update. Please retry.',
      );
    }
  };
  const open = (meetingId: string) =>
    controller.navigation.navigate(ROUTES.MEETING_DETAILS, { meetingId });
  const unread = (notifications.data || []).filter(
    item => !(item.read ?? item.isRead),
  ).length;
  const error =
    tab === 'invitations'
      ? invitations.error
      : tab === 'notifications'
      ? notifications.error
      : controller.queryError;
  const loading =
    tab === 'invitations'
      ? invitations.isLoading
      : tab === 'notifications'
      ? notifications.isLoading
      : controller.isLoading;
  const meetings =
    tab === 'recent' ? controller.recentMeetings : controller.upcomingMeetings;
  const refresh = () => {
    controller.handleRefresh();
    void invitations.refetch();
    void notifications.refetch();
  };
  const button = (label: string, onPress: () => void, primary = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: primary ? tokens.primary : tokens.surfaceSubtle,
          opacity: busy ? 0.5 : 1,
        },
      ]}
    >
      <Text style={{ color: primary ? tokens.primaryText : tokens.textMain }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.section}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {dashboardTabs.map(item => (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => {
              setTab(item.id);
              setActionError('');
            }}
            style={[
              styles.tab,
              {
                borderBottomColor:
                  tab === item.id ? tokens.primary : 'transparent',
              },
            ]}
          >
            <AppIcon
              name={item.icon}
              size={18}
              color={tab === item.id ? tokens.primary : tokens.textMuted}
            />
            <Text
              style={{
                color: tab === item.id ? tokens.primary : tokens.textMuted,
                fontWeight: '600',
                fontSize: 14,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: tokens.textMain }]}
        >
          {dashboardTabs.find(item => item.id === tab)?.label}
        </Text>
        <View style={styles.actions}>
          {tab === 'notifications' &&
            unread > 0 &&
            button('Mark all read', () => void run(() => markAll().unwrap()))}
          {button('Refresh', refresh)}
        </View>
      </View>
      {!!(actionError || error) && (
        <Text accessibilityRole="alert" style={{ color: tokens.danger }}>
          {actionError || 'Could not load this section. Tap Refresh to retry.'}
        </Text>
      )}
      {loading ? (
        <ActivityIndicator
          color={tokens.primary}
          accessibilityLabel="Loading dashboard"
        />
      ) : tab === 'upcoming' || tab === 'recent' ? (
        meetings.length ? (
          <View style={styles.grid}>
            {meetings.map(meeting => (
              <View
                key={meeting.id}
                style={{ width: width >= 760 ? '48%' : '100%' }}
              >
                <MeetingCard
                  meeting={meeting}
                  {...(tab === 'upcoming'
                    ? {
                        onJoin: () =>
                          controller.navigation.navigate(ROUTES.LOBBY, { meetingId: meeting.id }),
                      }
                    : {})}
                  onView={id =>
                    tab === 'recent'
                      ? controller.navigation.navigate(ROUTES.MEETING_SUMMARY, {
                          meetingId: id,
                        })
                      : open(id)
                  }
                />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={tab === 'recent' ? 'clock' : 'calendar'}
            title={
              tab === 'recent' ? 'No past meetings' : 'No upcoming meetings'
            }
            description="Create a meeting or join with a code or link."
          />
        )
      ) : tab === 'invitations' ? (
        invitations.data?.length ? (
          invitations.data.map(item => (
            <View
              key={item.id}
              style={[
                styles.card,
                { backgroundColor: tokens.surface, borderColor: tokens.border },
              ]}
            >
              <Text style={[styles.title, { color: tokens.textMain }]}>
                {item.meetingTitle}
              </Text>
              <Text style={{ color: tokens.textMuted }}>
                {item.organizerName} ·{' '}
                {item.scheduledStartTime
                  ? new Date(item.scheduledStartTime).toLocaleString()
                  : 'Instant meeting'}
              </Text>
              <Text style={{ color: tokens.textMuted }}>
                {item.role === 'co_host' ? 'Co-host' : 'Guest'} · {item.status}
              </Text>
              <View style={styles.actions}>
                {item.status === 'pending' && (
                  <>
                    {button('Decline', () =>
                      feedback.alert('Decline invitation?', item.meetingTitle, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Decline',
                          onPress: () =>
                            void run(() =>
                              decline({ invitationId: item.id }).unwrap(),
                            ),
                        },
                      ]),
                    )}
                    {button(
                      'Accept',
                      () =>
                        void run(() =>
                          accept({ invitationId: item.id }).unwrap(),
                        ),
                      true,
                    )}
                  </>
                )}
                {button('Open', () => open(item.meetingId))}
              </View>
            </View>
          ))
        ) : (
          <EmptyState
            icon="inbox"
            title="No invitations yet"
            description="Invitations sent to your account will appear here."
          />
        )
      ) : notifications.data?.length ? (
        notifications.data.map(item => (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor:
                  item.read ?? item.isRead
                    ? tokens.surface
                    : tokens.primaryLight,
                borderColor: tokens.border,
              },
            ]}
          >
            <Text style={[styles.title, { color: tokens.textMain }]}>
              {item.title}
            </Text>
            <Text style={{ color: tokens.textMuted }}>{item.body}</Text>
            <Text style={{ color: tokens.textMuted }}>
              {new Date(item.createdAt ?? item.timestamp).toLocaleString()}
            </Text>
            <View style={styles.actions}>
              {button(
                item.read ?? item.isRead ? 'Read' : 'Mark read',
                () => void run(() => markRead(item.id).unwrap()),
              )}
              {!!item.meetingId &&
                button(
                  'Open',
                  () =>
                    void run(async () => {
                      if (!(item.read ?? item.isRead))
                        await markRead(item.id).unwrap();
                      open(item.meetingId!);
                    }),
                )}
            </View>
          </View>
        ))
      ) : (
        <EmptyState
          icon="bell"
          title="No notifications"
          description="Meeting invitations and updates will appear here."
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 16 },
  tabs: { gap: 22, flexDirection: 'row' },
  tab: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  button: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  card: { padding: 18, borderRadius: 16, borderWidth: 1, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
});

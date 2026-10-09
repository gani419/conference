import { UserAvatar } from '../../components/feedback/UserAvatar';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { HeaderBar } from '../../components/layout/HeaderBar';
import { AppButton } from '../../components/forms/AppButton';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { useGetMeetingSummaryQuery } from '../../api/appApi';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

type MeetingSummaryRouteProp = RouteProp<RootStackParamList, typeof ROUTES.MEETING_SUMMARY>;

export const MeetingSummaryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<MeetingSummaryRouteProp>();
  const { meetingId } = route.params;
  const { tokens } = useResolvedTheme();

  const { data: summary, isLoading } = useGetMeetingSummaryQuery(meetingId);

  if (isLoading || !summary) {
    return (
      <ScreenContainer scrollable={false} padded={false}>
        <HeaderBar title="Meeting Summary" showBack onBack={() => navigation.navigate(ROUTES.DASHBOARD)} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
            Loading meeting summary...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable={false} padded={false} testID="meeting-summary-screen">
      <HeaderBar
        title="Meeting Summary"
        showBack
        onBack={() => navigation.navigate(ROUTES.DASHBOARD)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.meetingTitle, { color: tokens.textMain }]}>{summary.title}</Text>
            <StatusBadge status={summary.status} />
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.borderSubtle }]} />

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: tokens.textMain }]}>
                {summary.durationMinutes} min
              </Text>
              <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Duration</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: tokens.textMain }]}>
                {summary.totalAttended}
              </Text>
              <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Attended</Text>
            </View>

            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: tokens.textMain }]}>
                {summary.totalInvited}
              </Text>
              <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Invited</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.borderSubtle }]} />

          <View style={styles.timeInfo}>
            <Text style={[styles.timeLabel, { color: tokens.textMuted }]}>
              Host: <Text style={{ color: tokens.textMain, fontWeight: '600' }}>{summary.organizerName}</Text>
            </Text>
            <Text style={[styles.timeLabel, { color: tokens.textMuted }]}>
              Scheduled: {new Date(summary.scheduledStartTime).toLocaleString()}
            </Text>
            {summary.actualStartTime && (
              <Text style={[styles.timeLabel, { color: tokens.textMuted }]}>
                Started: {new Date(summary.actualStartTime).toLocaleTimeString()}
              </Text>
            )}
            {summary.endedAt && (
              <Text style={[styles.timeLabel, { color: tokens.textMuted }]}>
                Concluded: {new Date(summary.endedAt).toLocaleTimeString()}
              </Text>
            )}
          </View>
        </View>

        {/* Attendance Records */}
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle }]}>
          <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>
            Attendance Roster ({summary.attendanceRecords.length})
          </Text>

          {summary.attendanceRecords.length === 0 ? (
            <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
              No attendance records logged for this session.
            </Text>
          ) : (
            <View style={styles.recordsList}>
              {summary.attendanceRecords.map((record) => {
                return (
                  <View
                    key={record.participantId}
                    style={[
                      styles.recordItem,
                      { borderColor: tokens.borderSubtle, backgroundColor: tokens.surfaceSubtle },
                    ]}
                  >
                    <UserAvatar avatarId={record.avatarId} size={44} />

                    <View style={styles.recordInfo}>
                      <Text style={[styles.recordName, { color: tokens.textMain }]}>
                        {record.displayName}
                      </Text>
                      <Text style={[styles.recordSub, { color: tokens.textMuted }]}>
                        Role: {record.role} • {record.attended ? 'Present' : 'Absent'}
                        {record.durationMinutes !== undefined
                          ? ` (${record.durationMinutes} min)`
                          : ''}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.attendedBadge,
                        {
                          backgroundColor: record.attended
                            ? tokens.successSurface
                            : tokens.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.attendedBadgeText,
                          {
                            color: record.attended
                              ? tokens.success
                              : tokens.textMuted,
                          },
                        ]}
                      >
                        {record.attended ? 'Attended' : 'Missed'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Return Button */}
        <View style={styles.footerBtn}>
          <AppButton
            title="Return to Dashboard"
            onPress={() => navigation.navigate(ROUTES.DASHBOARD)}
            variant="primary"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  divider: {
    height: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  timeInfo: {
    gap: 4,
  },
  timeLabel: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
  },
  recordsList: {
    gap: 8,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordSub: {
    fontSize: 12,
    marginTop: 2,
  },
  attendedBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  attendedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerBtn: {
    marginTop: 8,
  },
});

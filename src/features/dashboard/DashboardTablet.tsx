import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useDashboardController } from './useDashboardController';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ROUTES } from '../../constants/routes';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { DevControlsModal } from '../../components/feedback/DevControlsModal';

export const DashboardTablet: React.FC<ReturnType<typeof useDashboardController>> = (
  controller,
) => {
  const { tokens } = useResolvedTheme();
  const isGuest = controller.session?.kind === 'guest';

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: tokens.textMain }]}>Dashboard</Text>
          <Text style={[styles.greeting, { color: tokens.textMuted }]}>
            Welcome back, {controller.session?.user.displayName ?? 'Guest'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => controller.setDevModalVisible(true)}
            style={[styles.iconBtn, { backgroundColor: tokens.surfaceSubtle }]}
            accessibilityLabel="Developer scenarios"
          >
            <Text style={styles.iconEmoji}>🛠️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => controller.navigation.navigate(ROUTES.SETTINGS)}
            style={[styles.iconBtn, { backgroundColor: tokens.surfaceSubtle }]}
            accessibilityLabel="Settings"
          >
            <Text style={styles.iconEmoji}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Hero Cards (2 Columns) */}
      <View style={styles.heroRow}>
        <View style={[styles.heroCard, styles.joinCard, { backgroundColor: tokens.primary }]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <Text style={styles.heroIconText}>🔗</Text>
            </View>
            <View>
              <Text style={styles.heroCardTitle}>Join meeting</Text>
              <Text style={styles.heroCardSubtitle}>With a code or link</Text>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Enter meeting code or link"
              placeholderTextColor="#94A3B8"
              value={controller.joinInput}
              onChangeText={controller.setJoinInput}
              style={styles.joinInput}
            />
            <TouchableOpacity
              onPress={() => controller.handleJoinMeeting()}
              disabled={controller.isResolving}
              style={[styles.submitBtn, { backgroundColor: '#FFFFFF' }]}
            >
              <Text style={[styles.submitArrow, { color: tokens.primary }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isGuest ? (
          <View
            style={[
              styles.heroCard,
              { backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: tokens.primaryLight }]}>
                <Text style={[styles.createIconText, { color: tokens.primary }]}>＋</Text>
              </View>
              <View>
                <Text style={[styles.createTitle, { color: tokens.textMain }]}>Create meeting</Text>
                <Text style={[styles.createSubtitle, { color: tokens.textMuted }]}>
                  Start a new meeting
                </Text>
              </View>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                onPress={controller.handleCreateInstantMeeting}
                style={[styles.quickBtn, { backgroundColor: tokens.surfaceSubtle }]}
              >
                <Text style={styles.quickIcon}>⚡</Text>
                <Text style={[styles.quickLabel, { color: tokens.textMain }]}>Instant</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => controller.navigation.navigate(ROUTES.CREATE_MEETING)}
                style={[styles.quickBtn, { backgroundColor: tokens.surfaceSubtle }]}
              >
                <Text style={styles.quickIcon}>📅</Text>
                <Text style={[styles.quickLabel, { color: tokens.textMain }]}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.heroCard,
              { backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.guestHintTitle, { color: tokens.textMain }]}>
              Guest Access Active
            </Text>
            <Text style={[styles.guestHintDesc, { color: tokens.textMuted }]}>
              You can join any scheduled or live meeting with a valid code or link.
            </Text>
          </View>
        )}
      </View>

      {/* Two Column Meeting Lists: Upcoming and Scheduled */}
      <View style={styles.meetingsSplitRow}>
        <View style={styles.meetingsCol}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>Upcoming meetings</Text>
            <TouchableOpacity onPress={controller.handleRefresh}>
              <Text style={[styles.linkText, { color: tokens.primary }]}>Refresh</Text>
            </TouchableOpacity>
          </View>
          {controller.upcomingMeetings.length === 0 ? (
            <EmptyState icon="📅" title="No upcoming meetings" description="Meetings will appear here." />
          ) : (
            controller.upcomingMeetings.map((item) => (
              <MeetingCard
                key={item.id}
                meeting={item}
                onJoin={controller.handleJoinMeeting}
                onView={(id) => controller.navigation.navigate(ROUTES.MEETING_DETAILS, { meetingId: id })}
              />
            ))
          )}
        </View>

        <View style={styles.meetingsCol}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>Scheduled meetings</Text>
          </View>
          {controller.scheduledMeetings.length === 0 ? (
            <EmptyState icon="🗓️" title="No scheduled meetings" description="Plan a meeting to see it listed." />
          ) : (
            controller.scheduledMeetings.map((item) => (
              <MeetingCard
                key={item.id}
                meeting={item}
                onJoin={controller.handleJoinMeeting}
                onView={(id) => controller.navigation.navigate(ROUTES.MEETING_DETAILS, { meetingId: id })}
              />
            ))
          )}
        </View>
      </View>

      {/* Recent Meetings Row */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>Recent meetings</Text>
      </View>

      <View style={styles.recentGrid}>
        {controller.recentMeetings.map((item) => (
          <View key={item.id} style={styles.recentCardCol}>
            <MeetingCard
              meeting={item}
              onView={(id) => controller.navigation.navigate(ROUTES.MEETING_SUMMARY, { meetingId: id })}
            />
          </View>
        ))}
      </View>

      <DevControlsModal
        visible={controller.devModalVisible}
        onClose={() => controller.setDevModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  greeting: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 28,
  },
  heroCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
  },
  joinCard: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroIconText: {
    fontSize: 20,
  },
  heroCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  heroCardSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  joinInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  submitBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitArrow: {
    fontSize: 20,
    fontWeight: '800',
  },
  createIconText: {
    fontSize: 22,
    fontWeight: '800',
  },
  createTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  createSubtitle: {
    fontSize: 13,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    gap: 8,
  },
  quickIcon: {
    fontSize: 16,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  guestHintTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  guestHintDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  meetingsSplitRow: {
    flexDirection: 'row',
    gap: 20,
  },
  meetingsCol: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  recentCardCol: {
    flex: 1,
    minWidth: 280,
  },
});

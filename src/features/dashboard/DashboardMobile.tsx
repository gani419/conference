import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useDashboardController } from './useDashboardController';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ROUTES } from '../../constants/routes';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { DevControlsModal } from '../../components/feedback/DevControlsModal';

export const DashboardMobile: React.FC<ReturnType<typeof useDashboardController>> = (
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
            Hello, {controller.session?.user.displayName ?? 'Guest'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => controller.setDevModalVisible(true)}
            style={[styles.devIconBtn, { backgroundColor: tokens.surfaceSubtle }]}
            accessibilityLabel="Developer scenarios"
          >
            <Text style={styles.devIcon}>🛠️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => controller.navigation.navigate(ROUTES.SETTINGS)}
            style={[styles.settingsIconBtn, { backgroundColor: tokens.surfaceSubtle }]}
            accessibilityLabel="Settings"
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Cards */}
      <View style={styles.topCardsContainer}>
        {/* Join Meeting Hero Card */}
        <View style={[styles.joinCard, { backgroundColor: tokens.primary }]}>
          <View style={styles.joinCardHeader}>
            <View style={styles.joinIconBox}>
              <Text style={styles.joinIconText}>🔗</Text>
            </View>
            <View style={styles.joinCardTitles}>
              <Text style={styles.joinCardTitle}>Join meeting</Text>
              <Text style={styles.joinCardSubtitle}>With a code or link</Text>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Enter meeting code or link"
              placeholderTextColor="#94A3B8"
              value={controller.joinInput}
              onChangeText={controller.setJoinInput}
              style={styles.joinInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              onPress={() => controller.handleJoinMeeting()}
              disabled={controller.isResolving}
              style={[styles.joinSubmitBtn, { backgroundColor: '#FFFFFF' }]}
            >
              <Text style={[styles.joinSubmitArrow, { color: tokens.primary }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Meeting Card (Hidden completely for Guests) */}
        {!isGuest && (
          <View
            style={[
              styles.createCard,
              { backgroundColor: tokens.surface, borderColor: tokens.border },
            ]}
          >
            <View style={styles.createCardTop}>
              <View style={[styles.createIconBox, { backgroundColor: tokens.primaryLight }]}>
                <Text style={[styles.createIconText, { color: tokens.primary }]}>＋</Text>
              </View>
              <View style={styles.createTitles}>
                <Text style={[styles.createTitle, { color: tokens.textMain }]}>Create meeting</Text>
                <Text style={[styles.createSubtitle, { color: tokens.textMuted }]}>
                  Start a new meeting
                </Text>
              </View>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                onPress={controller.handleCreateInstantMeeting}
                style={[styles.quickActionBtn, { backgroundColor: tokens.surfaceSubtle }]}
              >
                <Text style={styles.quickActionIcon}>⚡</Text>
                <Text style={[styles.quickActionLabel, { color: tokens.textMain }]}>Instant</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => controller.navigation.navigate(ROUTES.CREATE_MEETING)}
                style={[styles.quickActionBtn, { backgroundColor: tokens.surfaceSubtle }]}
              >
                <Text style={styles.quickActionIcon}>📅</Text>
                <Text style={[styles.quickActionLabel, { color: tokens.textMain }]}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Upcoming Meetings Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>Upcoming meetings</Text>
        <TouchableOpacity onPress={controller.handleRefresh}>
          <Text style={[styles.refreshText, { color: tokens.primary }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {controller.upcomingMeetings.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No upcoming meetings"
          description="Schedule a meeting or join with a code or link above."
        />
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

      {/* Recent Meetings Section */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>Recent meetings</Text>
      </View>

      {controller.recentMeetings.length === 0 ? (
        <EmptyState
          icon="🕒"
          title="No past meetings"
          description="Ended and completed meetings will appear here."
        />
      ) : (
        controller.recentMeetings.map((item) => (
          <MeetingCard
            key={item.id}
            meeting={item}
            onView={(id) => controller.navigation.navigate(ROUTES.MEETING_SUMMARY, { meetingId: id })}
          />
        ))
      )}

      {/* Developer Scenario Controls Modal */}
      <DevControlsModal
        visible={controller.devModalVisible}
        onClose={() => controller.setDevModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  greeting: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  devIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devIcon: {
    fontSize: 18,
  },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 18,
  },
  topCardsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  joinCard: {
    borderRadius: 18,
    padding: 18,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  joinCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  joinIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  joinIconText: {
    fontSize: 18,
  },
  joinCardTitles: {
    flex: 1,
  },
  joinCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  joinCardSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  joinInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  joinSubmitBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinSubmitArrow: {
    fontSize: 18,
    fontWeight: '800',
  },
  createCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  createCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  createIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  createIconText: {
    fontSize: 20,
    fontWeight: '800',
  },
  createTitles: {
    flex: 1,
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  createSubtitle: {
    fontSize: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
  quickActionIcon: {
    fontSize: 14,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

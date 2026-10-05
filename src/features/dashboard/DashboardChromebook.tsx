import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useDashboardController } from './useDashboardController';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ROUTES } from '../../constants/routes';
import { SidebarNavigation } from '../../components/layout/SidebarNavigation';
import { MeetingCard } from '../../components/meeting/MeetingCard';
import { EmptyState } from '../../components/feedback/EmptyState';
import { DevControlsModal } from '../../components/feedback/DevControlsModal';

export const DashboardChromebook: React.FC<ReturnType<typeof useDashboardController>> = (
  controller,
) => {
  const { tokens } = useResolvedTheme();
  const isGuest = controller.session?.kind === 'guest';

  const statItems = [
    { label: 'Upcoming meetings', count: controller.upcomingMeetings.length, icon: '📅' },
    { label: 'Scheduled', count: controller.scheduledMeetings.length, icon: '⏱️' },
    { label: 'Recent meetings', count: controller.recentMeetings.length, icon: '📄' },
    { label: 'Total this month', count: 12, icon: '📊' },
  ];

  return (
    <View style={styles.outerContainer}>
      {/* Left Sidebar */}
      <SidebarNavigation currentRoute={ROUTES.HOME} />

      {/* Main Chromebook Content */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: tokens.textMain }]}>Dashboard</Text>
            <Text style={[styles.pageSubtitle, { color: tokens.textMuted }]}>
              Manage and join conferences across your organization.
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => controller.setDevModalVisible(true)}
              style={[styles.headerBtn, { backgroundColor: tokens.surfaceSubtle }]}
              accessibilityLabel="Developer scenarios"
            >
              <Text style={styles.headerBtnText}>🛠️ Dev Scenarios</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Hero Cards */}
        <View style={styles.heroRow}>
          <View style={[styles.heroCard, { backgroundColor: tokens.primary }]}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIconBox}>
                <Text style={styles.heroIcon}>🔗</Text>
              </View>
              <View>
                <Text style={styles.heroTitle}>Join meeting</Text>
                <Text style={styles.heroSubtitle}>With a code or link</Text>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                placeholder="Enter meeting code or link"
                placeholderTextColor="#94A3B8"
                value={controller.joinInput}
                onChangeText={controller.setJoinInput}
                style={styles.heroInput}
              />
              <TouchableOpacity
                onPress={() => controller.handleJoinMeeting()}
                disabled={controller.isResolving}
                style={[styles.heroSubmitBtn, { backgroundColor: '#FFFFFF' }]}
              >
                <Text style={[styles.heroSubmitArrow, { color: tokens.primary }]}>→</Text>
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
              <View style={styles.heroHeader}>
                <View style={[styles.heroIconBox, { backgroundColor: tokens.primaryLight }]}>
                  <Text style={[styles.createIcon, { color: tokens.primary }]}>＋</Text>
                </View>
                <View>
                  <Text style={[styles.createTitle, { color: tokens.textMain }]}>Create meeting</Text>
                  <Text style={[styles.createSubtitle, { color: tokens.textMuted }]}>
                    Start a new meeting
                  </Text>
                </View>
              </View>

              <View style={styles.quickRow}>
                <TouchableOpacity
                  onPress={controller.handleCreateInstantMeeting}
                  style={[styles.quickBtn, { backgroundColor: tokens.surfaceSubtle }]}
                >
                  <Text style={styles.quickBtnIcon}>⚡</Text>
                  <Text style={[styles.quickBtnLabel, { color: tokens.textMain }]}>Instant</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => controller.navigation.navigate(ROUTES.CREATE_MEETING)}
                  style={[styles.quickBtn, { backgroundColor: tokens.surfaceSubtle }]}
                >
                  <Text style={styles.quickBtnIcon}>📅</Text>
                  <Text style={[styles.quickBtnLabel, { color: tokens.textMain }]}>Schedule</Text>
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
              <Text style={[styles.guestTitle, { color: tokens.textMain }]}>
                Guest User Account
              </Text>
              <Text style={[styles.guestDesc, { color: tokens.textMuted }]}>
                You are currently participating as a guest. Register an account to host your own meetings.
              </Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {statItems.map((stat, idx) => (
            <View
              key={idx}
              style={[
                styles.statCard,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.border,
                },
              ]}
            >
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <View>
                <Text style={[styles.statCount, { color: tokens.textMain }]}>{stat.count}</Text>
                <Text style={[styles.statLabel, { color: tokens.textMuted }]}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Two Column Meetings Area */}
        <View style={styles.columnsRow}>
          <View style={styles.column}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>
                Upcoming meetings
              </Text>
              <TouchableOpacity onPress={controller.handleRefresh}>
                <Text style={[styles.linkText, { color: tokens.primary }]}>Refresh</Text>
              </TouchableOpacity>
            </View>
            {controller.upcomingMeetings.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No upcoming meetings"
                description="Upcoming events will be displayed here."
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
          </View>

          <View style={styles.column}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>
                Scheduled meetings
              </Text>
            </View>
            {controller.scheduledMeetings.length === 0 ? (
              <EmptyState
                icon="🗓️"
                title="No scheduled meetings"
                description="Planned meetings will be listed here."
              />
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

        {/* Recent Meetings Grid */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={[styles.sectionTitle, { color: tokens.textMain }]}>Recent meetings</Text>
        </View>

        <View style={styles.recentGrid}>
          {controller.recentMeetings.map((item) => (
            <View key={item.id} style={styles.recentCardWrapper}>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  mainScrollView: {
    flex: 1,
  },
  mainContent: {
    padding: 32,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
  },
  pageSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 28,
  },
  heroCard: {
    flex: 1,
    borderRadius: 20,
    padding: 24,
    justifyContent: 'center',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroIcon: {
    fontSize: 22,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  heroInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  heroSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSubmitArrow: {
    fontSize: 22,
    fontWeight: '800',
  },
  createIcon: {
    fontSize: 24,
    fontWeight: '800',
  },
  createTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  createSubtitle: {
    fontSize: 13,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    gap: 8,
  },
  quickBtnIcon: {
    fontSize: 18,
  },
  quickBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  guestDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statIcon: {
    fontSize: 26,
  },
  statCount: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  column: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  recentCardWrapper: {
    width: '31%',
    minWidth: 260,
  },
});

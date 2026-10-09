import { feedback } from '../../services/feedback';
import { authService } from '../../services/authService';
import { mediaService } from '../../services/mediaService';
import { UserAvatar } from '../../components/feedback/UserAvatar';
import { AppIcon } from '../../components/icons/AppIcon';
import React from 'react';
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useDashboardController } from './useDashboardController';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ROUTES } from '../../constants/routes';
import { DashboardSections } from './DashboardSections';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { DevControlsModal } from '../../components/feedback/DevControlsModal';

export const DashboardMobile: React.FC<
  ReturnType<typeof useDashboardController>
> = controller => {
  const { tokens } = useResolvedTheme();
  const { width } = useLayoutMode();
  const wide = width >= 600;
  const isGuest = controller.session?.kind === 'guest';

  const logout = () => feedback.alert('Are you sure to logout?', 'You can sign in again at any time.', [{ text: 'Stay', style: 'cancel' }, { text: 'Logout', style: 'destructive', onPress: async () => { await mediaService.disconnect(); await authService.logout(); controller.navigation.reset({ index: 0, routes: [{ name: ROUTES.LOGIN }] }); } }]);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator nestedScrollEnabled testID="dashboard-scroll">
    <View
      style={[
        styles.container,
        {
          width: '100%',
          maxWidth: 1320,
          alignSelf: 'center',
          padding: wide ? 28 : 16,
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: tokens.textMain }]}>
            Dashboard
          </Text>
          <Text style={[styles.greeting, { color: tokens.textMuted }]}>
            Hello, {controller.session?.user.displayName ?? 'Guest'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Logout" onPress={logout} style={[styles.settingsIconBtn, { backgroundColor: tokens.surfaceSubtle }]}><AppIcon name="log-out" size={20} /></TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => controller.setDevModalVisible(true)}
              style={[
                styles.devIconBtn,
                { backgroundColor: tokens.surfaceSubtle },
              ]}
              accessibilityLabel="Developer scenarios"
            >
              <AppIcon style={styles.devIcon} name="wrench" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => controller.navigation.navigate(ROUTES.SETTINGS)}
            style={[
              styles.settingsIconBtn,
              { backgroundColor: tokens.surfaceSubtle },
            ]}
            accessibilityLabel="Settings"
          >
            <AppIcon style={styles.settingsIcon} name="settings" />
          </TouchableOpacity>
        </View>
      </View>

<View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, marginBottom: 20, borderRadius: 16, backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 }}><UserAvatar avatarId={controller.session?.user.avatarId} /><View style={{ flex: 1 }}><Text style={{ color: tokens.textMain, fontWeight: '700', fontSize: 17 }}>{controller.session?.user.displayName || 'Guest'}</Text><Text style={{ color: tokens.textMuted }}>{isGuest ? 'Guest account' : 'Registered account'}</Text></View></View>
      {/* Top Cards */}
      <View
        style={[
          styles.topCardsContainer,
          wide && { flexDirection: 'row', alignItems: 'stretch' },
        ]}
      >
        {/* Join Meeting Hero Card */}
        <View
          style={[
            styles.joinCard,
            { backgroundColor: tokens.primary },
            wide && { flex: 1 },
          ]}
        >
          <View style={styles.joinCardHeader}>
            <View style={styles.joinIconBox}>
              <AppIcon style={styles.joinIconText} name="link" />
            </View>
            <View style={styles.joinCardTitles}>
              <Text style={styles.joinCardTitle}>Join meeting</Text>
              <Text style={styles.joinCardSubtitle}>With a code or link</Text>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              placeholder="Enter meeting code or link"
              placeholderTextColor="#E0E7FF"
              value={controller.joinInput}
              onChangeText={controller.setJoinInput}
              style={styles.joinInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              onPress={() => controller.handleJoinMeeting()}
              disabled={controller.isResolving}
              accessibilityRole="button"
              accessibilityLabel="Join meeting"
              style={[styles.joinSubmitBtn, { backgroundColor: '#FFFFFF' }]}
            >
              <AppIcon
                style={[styles.joinSubmitArrow, { color: tokens.primary }]}
                name="arrow-right"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Meeting Card (Hidden completely for Guests) */}
        {!isGuest && (
          <View
            style={[
              styles.createCard,
              wide && { flex: 1 },
              { backgroundColor: tokens.surface, borderColor: tokens.border },
            ]}
          >
            <View style={styles.createCardTop}>
              <View
                style={[
                  styles.createIconBox,
                  { backgroundColor: tokens.primaryLight },
                ]}
              >
                <AppIcon
                  style={[styles.createIconText, { color: tokens.primary }]}
                  name="plus"
                />
              </View>
              <View style={styles.createTitles}>
                <Text style={[styles.createTitle, { color: tokens.textMain }]}>
                  Create meeting
                </Text>
                <Text
                  style={[styles.createSubtitle, { color: tokens.textMuted }]}
                >
                  Start a new meeting
                </Text>
              </View>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                disabled={controller.isCreatingInstant}
                onPress={controller.handleCreateInstantMeeting}
                style={[
                  styles.quickActionBtn,
                  { backgroundColor: tokens.surfaceSubtle },
                ]}
              >
                <AppIcon style={styles.quickActionIcon} name="zap" />
                <Text
                  style={[styles.quickActionLabel, { color: tokens.textMain }]}
                >
                  Instant
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  controller.navigation.navigate(ROUTES.CREATE_MEETING)
                }
                style={[
                  styles.quickActionBtn,
                  { backgroundColor: tokens.surfaceSubtle },
                ]}
              >
                <AppIcon style={styles.quickActionIcon} name="calendar" />
                <Text
                  style={[styles.quickActionLabel, { color: tokens.textMain }]}
                >
                  Schedule
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <DashboardSections controller={controller} />

      {/* Developer Scenario Controls Modal */}
      <DevControlsModal
        visible={controller.devModalVisible}
        onClose={() => controller.setDevModalVisible(false)}
      />
    </View>
    </ScrollView>
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

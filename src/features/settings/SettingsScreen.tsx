import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { HeaderBar } from '../../components/layout/HeaderBar';
import { AppButton } from '../../components/forms/AppButton';
import { SegmentedControl } from '../../components/forms/SegmentedControl';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setThemePreference } from '../../store/slices/themeSlice';
import { clearSession } from '../../store/slices/authSlice';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { getAvatarDefinition } from '../../constants/avatars';
import { authService } from '../../services/authService';
import { mediaService } from '../../services/mediaService';
import { storageService } from '../../services/storageService';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { ENV } from '../../config/environment';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const { preference, resolved, tokens } = useResolvedTheme();

  const session = useAppSelector((state) => state.auth.session);
  const isGuest = session?.kind === 'guest';
  const avatarDef = getAvatarDefinition(session?.user.avatarId ?? 'avatar-1');

  const handleThemeChange = (newPref: string) => {
    dispatch(setThemePreference(newPref as 'system' | 'light' | 'dark'));
  };

  const handleClearGuestData = () => {
    Alert.alert('Clear Guest Profile', 'Remove saved guest display name and avatar?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
          onPress: async () => {
            await mediaService.disconnect();
            await authService.logout();
            storageService.remove(STORAGE_KEYS.GUEST_PROFILE);
            dispatch(clearSession());
            navigation.replace(ROUTES.GUEST_SETUP);
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
            await mediaService.disconnect();
            await authService.logout();
          storageService.remove(STORAGE_KEYS.AUTH_SESSION);
          dispatch(clearSession());
          navigation.replace(ROUTES.LOGIN);
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable={false} padded={false} testID="settings-screen">
      <HeaderBar
        title="Settings"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
          ]}
        >
          <View style={styles.profileRow}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: avatarDef.backgroundColor },
              ]}
            >
              <Text style={styles.avatarEmoji}>{avatarDef.emoji}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.userName, { color: tokens.textMain }]}>
                {session?.user.displayName ?? 'Guest User'}
              </Text>
              <Text style={[styles.userRole, { color: tokens.textMuted }]}>
                {isGuest
                  ? 'Guest Account (Ephemeral)'
                  : session?.user.kind === 'registered' && session.user.email
                  ? session.user.email
                  : 'Registered Account'}
              </Text>
            </View>
          </View>
        </View>

        {/* Theme Settings */}
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
          ]}
        >
          <Text style={[styles.cardTitle, { color: tokens.textMain }]}>
            Appearance
          </Text>
          <Text style={[styles.cardSub, { color: tokens.textMuted }]}>
            Current active: {resolved} mode
          </Text>

          <View style={styles.controlWrap}>
            <SegmentedControl
              options={[
                { label: 'System (Default)', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
              selectedValue={preference}
              onSelect={handleThemeChange}
            />
          </View>
        </View>

        {/* Architecture & Environment Diagnostics */}
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
          ]}
        >
          <Text style={[styles.cardTitle, { color: tokens.textMain }]}>
            System Diagnostics
          </Text>

          <View style={styles.diagList}>
            <View style={styles.diagRow}>
              <Text style={[styles.diagLabel, { color: tokens.textMuted }]}>
                React Native Baseline
              </Text>
              <Text style={[styles.diagVal, { color: tokens.textMain }]}>
                0.87.1 (Pinned)
              </Text>
            </View>

            <View style={styles.diagRow}>
              <Text style={[styles.diagLabel, { color: tokens.textMuted }]}>
                Architecture & Engine
              </Text>
              <Text style={[styles.diagVal, { color: tokens.textMain }]}>
                New Arch • Hermes
              </Text>
            </View>

            <View style={styles.diagRow}>
              <Text style={[styles.diagLabel, { color: tokens.textMuted }]}>
                Android SDK Target
              </Text>
              <Text style={[styles.diagVal, { color: tokens.textMain }]}>
                Target 36 • Compile 37
              </Text>
            </View>

            <View style={styles.diagRow}>
              <Text style={[styles.diagLabel, { color: tokens.textMuted }]}>
                Backend Adapter
              </Text>
              <Text style={[styles.diagVal, { color: tokens.primary }]}>
                {ENV.backendMode.toUpperCase()}
              </Text>
            </View>

            <View style={styles.diagRow}>
              <Text style={[styles.diagLabel, { color: tokens.textMuted }]}>
                Media Engine Adapter
              </Text>
              <Text style={[styles.diagVal, { color: tokens.primary }]}>
                {ENV.mediaMode.toUpperCase()}
              </Text>
            </View>

            <View style={styles.diagRow}>
              <Text style={[styles.diagLabel, { color: tokens.textMuted }]}>
                Platform & OS
              </Text>
              <Text style={[styles.diagVal, { color: tokens.textMain }]}>
                {Platform.OS} ({Platform.Version})
              </Text>
            </View>
          </View>
        </View>

        {/* Account Management & Logout */}
        <View style={styles.actionsSection}>
          {isGuest ? (
            <AppButton
              title="Clear Guest Data"
              onPress={handleClearGuestData}
              variant="secondary"
            />
          ) : (
            <AppButton
              title="Sign Out"
              onPress={handleSignOut}
              variant="danger"
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  profileText: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  userRole: {
    fontSize: 13,
    marginTop: 2,
  },
  controlWrap: {
    marginTop: 4,
  },
  diagList: {
    gap: 8,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  diagLabel: {
    fontSize: 13,
  },
  diagVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsSection: {
    marginTop: 8,
    gap: 12,
  },
});

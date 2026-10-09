import { AppIcon } from '../icons/AppIcon';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useAppSelector } from '../../store/hooks';
import { getAvatarDefinition } from '../../constants/avatars';

export interface SidebarNavigationProps {
  currentRoute: string;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ currentRoute }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { tokens } = useResolvedTheme();
  const session = useAppSelector((state) => state.auth.session);
  const avatarDef = getAvatarDefinition(session?.user.avatarId);

  const navItems = [
    { label: 'Dashboard', icon: "house", route: ROUTES.HOME },
    { label: 'Meetings', icon: "calendar", route: ROUTES.CREATE_MEETING, hideForGuest: true },
    { label: 'Notifications', icon: "bell", route: ROUTES.NOTIFICATIONS },
    { label: 'Settings', icon: "settings", route: ROUTES.SETTINGS },
  ];

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: tokens.surface,
          borderRightColor: tokens.border,
        },
      ]}
    >
      {/* Brand logo / header */}
      <View style={styles.brandContainer}>
        <View style={[styles.brandIcon, { backgroundColor: tokens.primary }]}>
          <Text style={styles.brandIconText}>C</Text>
        </View>
        <Text style={[styles.brandTitle, { color: tokens.textMain }]}>Conference</Text>
      </View>

      {/* Nav List */}
      <View style={styles.navList}>
        {navItems.map((item) => {
          if (item.hideForGuest && session?.kind === 'guest') {
            return null;
          }
          const isActive = currentRoute === item.route;
          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => {
                if (!isActive) {
                  // Navigate
                  if (item.route === ROUTES.HOME) {
                    navigation.navigate(ROUTES.HOME);
                  } else if (item.route === ROUTES.CREATE_MEETING) {
                    navigation.navigate(ROUTES.CREATE_MEETING);
                  } else if (item.route === ROUTES.SETTINGS) {
                    navigation.navigate(ROUTES.SETTINGS);
                  } else if (item.route === ROUTES.NOTIFICATIONS) {
                    navigation.navigate(ROUTES.NOTIFICATIONS);
                  }
                }
              }}
              style={[
                styles.navItem,
                isActive && {
                  backgroundColor: tokens.primaryLight,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <AppIcon style={styles.navIcon} name={item.icon} color={isActive ? tokens.primary : tokens.textMuted} />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: isActive ? tokens.primary : tokens.textMuted,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User profile footer */}
      {session && (
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.SETTINGS)}
          style={[styles.userFooter, { borderTopColor: tokens.border }]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: avatarDef.backgroundColor }]}>
            <AppIcon name="user" color={avatarDef.textColor} size={24} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: tokens.textMain }]} numberOfLines={1}>
              {session.user.displayName}
            </Text>
            <Text style={[styles.userRole, { color: tokens.textMuted }]}>
              {session.kind === 'guest' ? 'Guest' : 'Registered'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    borderRightWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  navList: {
    flex: 1,
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  navIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  navLabel: {
    fontSize: 15,
  },
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 12,
  },
});

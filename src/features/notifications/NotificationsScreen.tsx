import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { HeaderBar } from '../../components/layout/HeaderBar';
import { EmptyState } from '../../components/feedback/EmptyState';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../api/appApi';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { AppNotification } from '../../types/notification';

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { tokens } = useResolvedTheme();

  const { data: notifications = [], isLoading } = useGetNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const handleNotificationPress = async (item: AppNotification) => {
    const isItemRead = item.read ?? item.isRead;
    if (!isItemRead) {
      await markRead(item.id);
    }
    if (item.meetingId) {
      navigation.navigate(ROUTES.MEETING_DETAILS, { meetingId: item.meetingId });
    }
  };

  const unreadCount = notifications.filter((n) => !(n.read ?? n.isRead)).length;

  return (
    <ScreenContainer scrollable={false} padded={false} testID="notifications-screen">
      <HeaderBar
        title="Notifications"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          unreadCount > 0
            ? {
                label: 'Mark All Read',
                onPress: () => markAllRead(),
              }
            : undefined
        }
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
            Loading notifications...
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No Notifications"
          description="You're all caught up! Meeting invites and updates will appear here."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.itemRow,
                {
                  backgroundColor: (item.read ?? item.isRead) ? tokens.surface : tokens.surfaceActive,
                  borderColor: tokens.borderSubtle,
                },
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={styles.itemHeader}>
                <View style={styles.titleWrap}>
                  {!(item.read ?? item.isRead) && <View style={[styles.unreadDot, { backgroundColor: tokens.primary }]} />}
                  <Text style={[styles.itemTitle, { color: tokens.textMain }]}>{item.title}</Text>
                </View>
                <Text style={[styles.itemTime, { color: tokens.textMuted }]}>
                  {new Date(item.createdAt ?? item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <Text style={[styles.itemBody, { color: tokens.textMuted }]}>{item.body}</Text>
            </TouchableOpacity>
          )}
        />
      )}
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
  listContent: {
    padding: 16,
    gap: 10,
  },
  itemRow: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  itemTime: {
    fontSize: 12,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});

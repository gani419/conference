import { feedback } from '../services/feedback';
import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import {
  getMessaging,
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { useAppSelector } from '../store/hooks';
import { refreshPush } from '../services/pushService';
export function usePushNotifications(ready: boolean) {
  const session = useAppSelector(state => state.auth.session);
  const userId = session?.kind === 'registered' ? session.user.id : '';
  const current = useRef(userId);
  current.current = userId;
  const initial = useRef<RemoteMessage | null>(null);
  const consumed = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void getInitialNotification(getMessaging())
      .then(message => {
        initial.current = message;
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!ready || !userId || Platform.OS !== 'android') return;
    const open = (message: RemoteMessage) => {
      if (
        message.data?.userId !== current.current ||
        message.data?.kind !== 'meeting_invitation'
      )
        return;
      const meetingId = String(message.data.meetingId || '');
      if (/^[0-9a-f-]{36}$/i.test(meetingId))
        void Linking.openURL('conference://meetings/' + meetingId);
    };
    void refreshPush(userId).catch(() => {});
    // Initial notification can resolve just after bootstrap.
    void getInitialNotification(getMessaging())
      .then(message => {
        if (!consumed.current && (message || initial.current)) {
          consumed.current = true;
          open(message || initial.current!);
        }
      })
      .catch(() => {});
    const offOpen = onNotificationOpenedApp(getMessaging(), open);
    const offRefresh = onTokenRefresh(getMessaging(), token => {
      void refreshPush(userId, token).catch(() => {});
    });
    const offMessage = onMessage(getMessaging(), message => {
      if (message.data?.userId !== current.current) return;
      feedback.alert(
        'Conference invitation',
        'You have a new meeting invitation.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open', onPress: () => open(message) },
        ],
      );
    });
    return () => {
      offOpen();
      offRefresh();
      offMessage();
    };
  }, [ready, userId]);
}

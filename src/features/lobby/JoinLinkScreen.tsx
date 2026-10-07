import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { useResolveMeetingMutation } from '../../api/appApi';
import { useAppSelector } from '../../store/hooks';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppButton } from '../../components/forms/AppButton';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export function JoinLinkScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, typeof ROUTES.JOIN_LINK>) {
  const user = useAppSelector(s => s.auth.session?.user.id);
  const [resolve] = useResolveMeetingMutation();
  const [error, setError] = useState('');
  const { tokens } = useResolvedTheme();
  useEffect(() => {
    if (!user) {
      navigation.replace(ROUTES.LOGIN, {
        pendingMeetingCode: route.params.code,
      });
      return;
    }
    let disposed = false;
    resolve({ codeOrLink: route.params.code })
      .unwrap()
      .then(result => {
        if (!disposed)
          navigation.replace(
            result.eligibleToJoin ? ROUTES.LOBBY : ROUTES.MEETING_DETAILS,
            { meetingId: result.meeting.id },
          );
      })
      .catch(() => {
        if (!disposed)
          setError(
            'This meeting link is unavailable or guest access is disabled.',
          );
      });
    return () => {
      disposed = true;
    };
  }, [user, route.params.code, navigation, resolve]);
  return (
    <ScreenContainer>
      <Text style={{ color: tokens.textMain }}>
        {error || 'Opening meeting…'}
      </Text>
      {error ? (
        <AppButton
          title="Return to dashboard"
          onPress={() => navigation.replace(ROUTES.HOME)}
        />
      ) : (
        <ActivityIndicator />
      )}
    </ScreenContainer>
  );
}

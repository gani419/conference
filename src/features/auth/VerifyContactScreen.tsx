import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppInput } from '../../components/forms/AppInput';
import { AppButton } from '../../components/forms/AppButton';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { authService } from '../../services/authService';
import { useAppDispatch } from '../../store/hooks';
import { setSession } from '../../store/slices/authSlice';
import {
  EMAIL_CODE_LENGTH,
  EMAIL_RESEND_SECONDS,
} from '../../../shared/emailVerification';

type Props = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.VERIFY_CONTACT
>;
export const VerifyContactScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tokens } = useResolvedTheme();
  const dispatch = useAppDispatch();
  const {
    verificationId,
    contactDestination,
    pendingMeetingId,
    pendingMeetingCode,
  } = route.params;
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(
    'Check your inbox and spam folder for the signup code. If it has expired, request a new code.',
  );
  useEffect(() => {
    const timer = setInterval(
      () => setCooldown(value => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  const verify = async () => {
    if (running.current) return;
    if (!new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`).test(code)) {
      setError(`Enter the ${EMAIL_CODE_LENGTH}-digit code from your email.`);
      return;
    }
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await authService.verifyContact({ verificationId, code });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      dispatch(setSession(result.data.session));
      if (pendingMeetingCode)
        navigation.replace(ROUTES.JOIN_LINK, { code: pendingMeetingCode });
      else if (pendingMeetingId)
        navigation.replace(ROUTES.MEETING_DETAILS, {
          meetingId: pendingMeetingId,
        });
      else navigation.replace(ROUTES.HOME);
    } catch {
      setError('Unable to verify. Check your connection and retry.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const resend = async () => {
    if (running.current || cooldown > 0) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await authService.resendVerificationCode(verificationId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setCooldown(EMAIL_RESEND_SECONDS);
      setCode('');
      setNotice('A new code was sent. Use the most recent email.');
    } catch {
      setError('Unable to resend. Check your connection and retry.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <ScreenContainer scrollable>
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.border },
          ]}
        >
          <Text style={[styles.heading, { color: tokens.textMain }]}>
            Verify your email
          </Text>
          <Text style={{ color: tokens.textMuted }}>
            Enter the {EMAIL_CODE_LENGTH}-digit code sent to{' '}
            {contactDestination}.
          </Text>
          <Text
            style={{ color: tokens.textMuted }}
            accessibilityLiveRegion="polite"
          >
            {notice}
          </Text>
          <AppInput
            label="Email verification code"
            accessibilityLabel="Email verification code"
            value={code}
            onChangeText={value =>
              setCode(value.replace(/[^0-9]/g, '').slice(0, EMAIL_CODE_LENGTH))
            }
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={EMAIL_CODE_LENGTH}
            error={error || undefined}
            editable={!busy}
          />
          <AppButton
            title="Verify email"
            onPress={verify}
            loading={busy}
            disabled={busy}
          />
          <AppButton
            title={cooldown ? `Resend code in ${cooldown}s` : 'Resend code'}
            onPress={resend}
            variant="outline"
            disabled={busy || cooldown > 0}
          />
          <AppButton
            title="Back to login"
            variant="ghost"
            disabled={busy}
            onPress={() =>
              navigation.replace(ROUTES.LOGIN, {
                pendingMeetingId,
                pendingMeetingCode,
              })
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  heading: { fontSize: 24, fontWeight: '800' },
});

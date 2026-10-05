import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppButton } from '../../components/forms/AppButton';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { authService } from '../../services/authService';
import { useAppDispatch } from '../../store/hooks';
import { setSession } from '../../store/slices/authSlice';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROUTES.VERIFY_CONTACT>;

export const VerifyContactScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tokens } = useResolvedTheme();
  const { isCompact } = useLayoutMode();
  const dispatch = useAppDispatch();

  const { verificationId, contactDestination, pendingMeetingId } = route.params;

  const [code, setCode] = useState('123456');
  const [cooldown, setCooldown] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (): Promise<void> => {
    setError(null);
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    const res = await authService.verifyContact({
      verificationId,
      code,
    });
    setLoading(false);

    if (res.success) {
      dispatch(setSession(res.data.session));
      if (pendingMeetingId) {
        navigation.replace(ROUTES.MEETING_DETAILS, { meetingId: pendingMeetingId });
      } else {
        navigation.replace(ROUTES.HOME);
      }
    } else {
      setError(res.error.message);
      Alert.alert('Verification Failed', res.error.message);
    }
  };

  const handleResend = async (): Promise<void> => {
    setCooldown(30);
    const res = await authService.resendVerificationCode(verificationId);
    if (res.success) {
      Alert.alert('Code Resent', 'A new verification code has been dispatched. (Mock code: 123456)');
    }
  };

  const renderCodeDigits = (): React.ReactElement => {
    const digits = code.split('').concat(Array(6).fill('')).slice(0, 6);
    return (
      <View style={styles.codeContainer}>
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.digitBox,
              {
                backgroundColor: tokens.surfaceSubtle,
                borderColor: digit ? tokens.primary : tokens.border,
              },
            ]}
          >
            <Text style={[styles.digitText, { color: tokens.textMain }]}>{digit}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderForm = (): React.ReactElement => (
    <View style={[styles.formCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.backIcon, { color: tokens.textMain }]}>‹</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: tokens.textMain }]}>Enter the 6-digit code</Text>
      <Text style={[styles.subheading, { color: tokens.textMuted }]}>
        We sent a verification code to {contactDestination}.
      </Text>

      {renderCodeDigits()}

      {/* Hidden real input for keyboard focus */}
      <TextInput
        value={code}
        onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.hiddenInput}
        autoFocus
      />

      <View style={styles.cooldownRow}>
        {cooldown > 0 ? (
          <Text style={[styles.cooldownText, { color: tokens.textMuted }]}>
            Resend code in 00:{cooldown.toString().padStart(2, '0')}
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={[styles.resendLink, { color: tokens.primary }]}>Resend code</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={[styles.errorText, { color: tokens.danger }]}>{error}</Text> : null}

      <AppButton
        title="Verify"
        onPress={handleVerify}
        loading={loading}
        style={styles.verifyBtn}
      />

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.changeContactBtn}>
        <Text style={[styles.changeContactText, { color: tokens.primary }]}>Change contact</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSideIllustration = (): React.ReactElement => (
    <View style={[styles.illustrationCard, { backgroundColor: tokens.primaryLight }]}>
      <Text style={styles.illustrationEmoji}>📱</Text>
      <Text style={[styles.illustrationTitle, { color: tokens.primary }]}>
        Verify your contact
      </Text>
      <Text style={[styles.illustrationSubtitle, { color: tokens.textMuted }]}>
        We verify your email or phone to keep meetings safe and authenticated.
      </Text>
    </View>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.container}>
        {isCompact ? (
          renderForm()
        ) : (
          <View style={styles.splitRow}>
            <View style={styles.splitCol}>{renderForm()}</View>
            <View style={styles.splitCol}>{renderSideIllustration()}</View>
          </View>
        )}
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
  formCard: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  digitBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  cooldownRow: {
    marginVertical: 12,
  },
  cooldownText: {
    fontSize: 13,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  verifyBtn: {
    marginTop: 8,
    marginBottom: 12,
  },
  changeContactBtn: {
    padding: 8,
  },
  changeContactText: {
    fontSize: 14,
    fontWeight: '600',
  },
  splitRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 880,
    gap: 24,
    alignItems: 'center',
  },
  splitCol: {
    flex: 1,
  },
  illustrationCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 460,
  },
  illustrationEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  illustrationTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  illustrationSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});

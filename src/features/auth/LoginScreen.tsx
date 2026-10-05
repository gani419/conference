import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppInput } from '../../components/forms/AppInput';
import { AppButton } from '../../components/forms/AppButton';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { authService } from '../../services/authService';
import { useAppDispatch } from '../../store/hooks';
import { setSession } from '../../store/slices/authSlice';
import { storageService } from '../../services/storageService';
import { normalizePhoneToE164 } from '../../utils/contactNormalization';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROUTES.LOGIN>;

export const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tokens } = useResolvedTheme();
  const { isCompact } = useLayoutMode();
  const dispatch = useAppDispatch();

  const [identifier, setIdentifier] = useState(storageService.getAuthIdentifierDraft() || 'taylor.kim@company.com');
  const [password, setPassword] = useState('password12345');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingMeetingId = route.params?.pendingMeetingId;

  const handleLogin = async (): Promise<void> => {
    setError(null);
    if (!identifier.trim()) {
      setError('Please enter your email or mobile number');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    storageService.setAuthIdentifierDraft(identifier.trim());

    const isEmail = identifier.includes('@');
    const authIdentifier = isEmail
      ? { kind: 'email' as const, email: identifier.trim().toLowerCase() }
      : { kind: 'phone' as const, phoneE164: normalizePhoneToE164(identifier.trim()) };

    const result = await authService.login({
      identifier: authIdentifier,
      password,
    });

    setLoading(false);

    if (result.success) {
      dispatch(setSession(result.data.session));
      if (pendingMeetingId) {
        navigation.replace(ROUTES.MEETING_DETAILS, { meetingId: pendingMeetingId });
      } else {
        navigation.replace(ROUTES.HOME);
      }
    } else {
      setError(result.error.message);
      Alert.alert('Login Failed', result.error.message);
    }
  };

  const renderForm = (): React.ReactElement => (
    <View style={[styles.formCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <Text style={[styles.heading, { color: tokens.textMain }]}>Welcome back</Text>
      <Text style={[styles.subheading, { color: tokens.textMuted }]}>
        Sign in to your meeting account.
      </Text>

      <AppInput
        label="Email or mobile number"
        icon="✉️"
        placeholder="alex@company.com or +14155550100"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <AppInput
        label="Password"
        icon="🔒"
        placeholder="Enter your password"
        isPassword
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
        style={styles.forgotBtn}
      >
        <Text style={[styles.forgotText, { color: tokens.primary }]}>Forgot password?</Text>
      </TouchableOpacity>

      {error ? <Text style={[styles.errorBanner, { color: tokens.danger }]}>{error}</Text> : null}

      <AppButton
        title="Log in"
        onPress={handleLogin}
        loading={loading}
        style={styles.loginBtn}
      />

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
        <Text style={[styles.dividerText, { color: tokens.textMuted }]}>or</Text>
        <View style={[styles.dividerLine, { backgroundColor: tokens.border }]} />
      </View>

      <AppButton
        title="Create account"
        variant="secondary"
        onPress={() => navigation.navigate(ROUTES.REGISTER, { pendingMeetingId })}
        style={styles.secondaryBtn}
      />

      <AppButton
        title="Continue as guest"
        variant="outline"
        icon="👤"
        onPress={() => navigation.navigate(ROUTES.GUEST_SETUP, { pendingMeetingId })}
        style={styles.secondaryBtn}
      />
    </View>
  );

  const renderSideIllustration = (): React.ReactElement => (
    <View style={[styles.illustrationCard, { backgroundColor: tokens.primaryLight }]}>
      <Text style={styles.illustrationEmoji}>🤝</Text>
      <Text style={[styles.illustrationTitle, { color: tokens.primary }]}>
        Host with confidence
      </Text>
      <Text style={[styles.illustrationSubtitle, { color: tokens.textMuted }]}>
        Bringing people together for clearer conversations and better meeting outcomes.
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
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 20,
  },
  forgotBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '600',
  },
  loginBtn: {
    marginBottom: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
  },
  secondaryBtn: {
    marginBottom: 10,
  },
  splitRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 900,
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

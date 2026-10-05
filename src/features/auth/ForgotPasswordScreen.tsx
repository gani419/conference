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
import { normalizePhoneToE164 } from '../../utils/contactNormalization';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROUTES.FORGOT_PASSWORD>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { tokens } = useResolvedTheme();
  const { isCompact } = useLayoutMode();

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendResetLink = async (): Promise<void> => {
    setError(null);
    if (!identifier.trim()) {
      setError('Please enter your email or mobile number');
      return;
    }

    setLoading(true);
    const isEmail = identifier.includes('@');
    const authIdentifier = isEmail
      ? { kind: 'email' as const, email: identifier.trim().toLowerCase() }
      : { kind: 'phone' as const, phoneE164: normalizePhoneToE164(identifier.trim()) };

    const res = await authService.forgotPassword({ identifier: authIdentifier });
    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Recovery Link Sent',
        `A recovery link has been dispatched to ${res.data.maskedDestination}. Proceeding to reset password screen.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate(ROUTES.RESET_PASSWORD, { resetToken: res.data.resetToken });
            },
          },
        ],
      );
    } else {
      setError(res.error.message);
      Alert.alert('Recovery Request Failed', res.error.message);
    }
  };

  const renderForm = (): React.ReactElement => (
    <View style={[styles.formCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.backIcon, { color: tokens.textMain }]}>‹</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: tokens.textMain }]}>Reset your password</Text>
      <Text style={[styles.subheading, { color: tokens.textMuted }]}>
        Enter your email or phone number to receive a secure password recovery link.
      </Text>

      <AppInput
        label="Email or mobile number"
        icon="✉️"
        placeholder="alex@company.com or +14155550100"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="email-address"
        error={error ?? undefined}
      />

      <AppButton
        title="Send reset link"
        onPress={handleSendResetLink}
        loading={loading}
        style={styles.submitBtn}
      />
    </View>
  );

  const renderSideIllustration = (): React.ReactElement => (
    <View style={[styles.illustrationCard, { backgroundColor: tokens.primaryLight }]}>
      <Text style={styles.illustrationEmoji}>🔐</Text>
      <Text style={[styles.illustrationTitle, { color: tokens.primary }]}>
        Account Recovery
      </Text>
      <Text style={[styles.illustrationSubtitle, { color: tokens.textMuted }]}>
        Get back into your account securely using your verified contact details.
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
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  submitBtn: {
    marginTop: 8,
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
    minHeight: 440,
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

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppInput } from '../../components/forms/AppInput';
import { AppButton } from '../../components/forms/AppButton';
import { AvatarPicker } from '../../components/forms/AvatarPicker';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { authService } from '../../services/authService';
import { DEFAULT_AVATAR_ID } from '../../constants/avatars';
import { AvatarId } from '../../types/common';
import { normalizePhoneToE164 } from '../../utils/contactNormalization';
import { registerFormSchema } from '../../schemas/authSchemas';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROUTES.REGISTER>;

export const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tokens } = useResolvedTheme();
  const { isCompact } = useLayoutMode();

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pendingMeetingId = route.params?.pendingMeetingId;

  const handleRegister = async (): Promise<void> => {
    setErrors({});
    const isEmail = identifier.includes('@');
    const authIdentifier = isEmail
      ? { kind: 'email' as const, email: identifier.trim().toLowerCase() }
      : { kind: 'phone' as const, phoneE164: normalizePhoneToE164(identifier.trim()) };

    const validation = registerFormSchema.safeParse({
      displayName: name,
      identifier: authIdentifier,
      password,
      confirmPassword,
      avatarId,
    });

    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const key = issue.path[issue.path.length - 1] as string;
        errMap[key] = issue.message;
      });
      setErrors(errMap);
      return;
    }

    setLoading(true);
    const res = await authService.register({
      displayName: name.trim(),
      identifier: authIdentifier,
      password,
      avatarId,
    });
    setLoading(false);

    if (res.success) {
      navigation.navigate(ROUTES.VERIFY_CONTACT, {
        verificationId: res.data.verificationId,
        contactDestination: identifier.trim(),
        pendingMeetingId,
      });
    } else {
      Alert.alert('Registration Failed', res.error.message);
    }
  };

  const renderForm = (): React.ReactElement => (
    <View style={[styles.formCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={[styles.backIcon, { color: tokens.textMain }]}>‹</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: tokens.textMain }]}>Create your account</Text>
      <Text style={[styles.subheading, { color: tokens.textMuted }]}>
        Set up your profile to get started.
      </Text>

      <AppInput
        label="Your name"
        icon="👤"
        placeholder="e.g. Taylor Kim"
        value={name}
        onChangeText={setName}
        error={errors.displayName}
      />

      <AppInput
        label="Email or mobile number"
        icon="✉️"
        placeholder="alex@company.com or +14155550100"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="email-address"
        error={errors.identifier || errors.email || errors.phoneE164}
      />

      <AppInput
        label="Password (min 12 characters)"
        icon="🔒"
        placeholder="Create a strong password"
        isPassword
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />

      <AppInput
        label="Confirm password"
        icon="🔒"
        placeholder="Repeat your password"
        isPassword
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
      />

      <AvatarPicker
        selectedAvatarId={avatarId}
        onSelectAvatar={setAvatarId}
      />

      <AppButton
        title="Create account"
        onPress={handleRegister}
        loading={loading}
        style={styles.submitBtn}
      />

      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: tokens.textMuted }]}>
          Already have an account?{' '}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.LOGIN, { pendingMeetingId })}>
          <Text style={[styles.linkText, { color: tokens.primary }]}>Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSideIllustration = (): React.ReactElement => (
    <View style={[styles.illustrationCard, { backgroundColor: tokens.primaryLight }]}>
      <Text style={styles.illustrationEmoji}>🌟</Text>
      <Text style={[styles.illustrationTitle, { color: tokens.primary }]}>
        Your meetings, your profile
      </Text>
      <Text style={[styles.illustrationSubtitle, { color: tokens.textMuted }]}>
        A few details help others know you and collaborate seamlessly across devices.
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
    maxWidth: 460,
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
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
  },
  splitRow: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 920,
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
    minHeight: 520,
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

import { feedback } from '../../services/feedback';
import { AppIcon } from '../../components/icons/AppIcon';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppInput } from '../../components/forms/AppInput';
import { AppButton } from '../../components/forms/AppButton';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { authService } from '../../services/authService';
import { resetPasswordFormSchema } from '../../schemas/authSchemas';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROUTES.RESET_PASSWORD>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tokens } = useResolvedTheme();
  const { resetToken } = route.params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleResetPassword = async (): Promise<void> => {
    setErrors({});
    const validation = resetPasswordFormSchema.safeParse({
      resetToken,
      newPassword: password,
      confirmPassword,
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
    const res = await authService.resetPassword({
      resetToken,
      newPassword: password,
    });
    setLoading(false);

    if (res.success) {
      feedback.alert('Password Updated', 'Your password has been reset successfully. Please log in.', [
        {
          text: 'Go to Log in',
          onPress: () => navigation.navigate(ROUTES.LOGIN),
        },
      ]);
    } else {
      feedback.alert('Reset Failed', res.error.message);
    }
  };

  const renderForm = (): React.ReactElement => (
    <View style={[styles.formCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <AppIcon style={[styles.backIcon, { color: tokens.textMain }]} name="chevron-left" />
      </TouchableOpacity>

      <Text style={[styles.heading, { color: tokens.textMain }]}>Create a new password</Text>
      <Text style={[styles.subheading, { color: tokens.textMuted }]}>
        Your new password must be at least 12 characters long.
      </Text>

      <AppInput
        label="New password"
        icon="lock"
        placeholder="Enter new password"
        isPassword
        value={password}
        onChangeText={setPassword}
        error={errors.newPassword}
      />

      <AppInput
        label="Confirm new password"
        icon="lock"
        placeholder="Repeat new password"
        isPassword
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={errors.confirmPassword}
      />

      <AppButton
        title="Reset password"
        onPress={handleResetPassword}
        loading={loading}
        style={styles.submitBtn}
      />
    </View>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.container}>
        {renderForm()}
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
  },
  submitBtn: {
    marginTop: 8,
  },
});

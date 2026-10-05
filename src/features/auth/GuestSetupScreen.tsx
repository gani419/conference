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
import { useAppDispatch } from '../../store/hooks';
import { setSession } from '../../store/slices/authSlice';
import { DEFAULT_AVATAR_ID } from '../../constants/avatars';
import { AvatarId } from '../../types/common';
import { guestLoginPayloadSchema } from '../../schemas/authSchemas';

type Props = NativeStackScreenProps<RootStackParamList, typeof ROUTES.GUEST_SETUP>;

export const GuestSetupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tokens } = useResolvedTheme();
  const { isCompact } = useLayoutMode();
  const dispatch = useAppDispatch();

  const [displayName, setDisplayName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_ID);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingMeetingId = route.params?.pendingMeetingId;

  const handleContinue = async (): Promise<void> => {
    setError(null);
    const validation = guestLoginPayloadSchema.safeParse({
      displayName,
      avatarId,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Name is required');
      return;
    }

    setLoading(true);
    const res = await authService.guestLogin({
      displayName: displayName.trim(),
      avatarId,
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
      Alert.alert('Guest Setup Failed', res.error.message);
    }
  };

  const renderForm = (): React.ReactElement => (
    <View style={[styles.formCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.backIcon, { color: tokens.textMain }]}>‹</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: tokens.textMain }]}>Join as a guest</Text>
      <Text style={[styles.subheading, { color: tokens.textMuted }]}>
        Add a name and avatar to join the meeting.
      </Text>

      <AppInput
        label="Your name"
        icon="👤"
        placeholder="e.g. Alex Rivera"
        value={displayName}
        onChangeText={setDisplayName}
        error={error ?? undefined}
      />

      <AvatarPicker selectedAvatarId={avatarId} onSelectAvatar={setAvatarId} />

      <AppButton
        title="Continue"
        onPress={handleContinue}
        loading={loading}
        style={styles.submitBtn}
      />
    </View>
  );

  const renderSideIllustration = (): React.ReactElement => (
    <View style={[styles.illustrationCard, { backgroundColor: tokens.primaryLight }]}>
      <Text style={styles.illustrationEmoji}>👋</Text>
      <Text style={[styles.illustrationTitle, { color: tokens.primary }]}>
        Everyone has a voice
      </Text>
      <Text style={[styles.illustrationSubtitle, { color: tokens.textMuted }]}>
        Join as a guest and be part of the discussion with instant access.
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
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    marginBottom: 20,
  },
  submitBtn: {
    marginTop: 12,
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

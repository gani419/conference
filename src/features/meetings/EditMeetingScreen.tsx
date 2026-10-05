import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ROUTES } from '../../constants/routes';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { HeaderBar } from '../../components/layout/HeaderBar';
import { AppInput } from '../../components/forms/AppInput';
import { AppButton } from '../../components/forms/AppButton';
import { SegmentedControl } from '../../components/forms/SegmentedControl';
import { AddPersonModal } from './components/AddPersonModal';
import { ContactPickerModal } from './components/ContactPickerModal';
import { CsvImportModal } from './components/CsvImportModal';
import { InviteePayload, MeetingTiming } from '../../types/meeting';
import {
  useGetMeetingQuery,
  useUpdateMeetingMutation,
  useCancelMeetingMutation,
} from '../../api/appApi';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { updateMeetingPayloadSchema } from '../../schemas/meetingSchemas';
import { ZodIssue } from 'zod';

type EditMeetingRouteProp = RouteProp<RootStackParamList, typeof ROUTES.EDIT_MEETING>;

export const EditMeetingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<EditMeetingRouteProp>();
  const { meetingId } = route.params;
  const { tokens } = useResolvedTheme();

  const { data: meeting, isLoading: isLoadingMeeting } = useGetMeetingQuery(
    { meetingId },
    { skip: !meetingId },
  );

  const [updateMeeting, { isLoading: isUpdating }] = useUpdateMeetingMutation();
  const [cancelMeeting, { isLoading: isCancelling }] = useCancelMeetingMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timingKind, setTimingKind] = useState<'instant' | 'scheduled'>('scheduled');
  const [startsAt, setStartsAt] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [guestAccess, setGuestAccess] = useState(true);
  const [micPerm, setMicPerm] = useState(false);
  const [camPerm, setCamPerm] = useState(false);
  const [screenSharePerm, setScreenSharePerm] = useState(false);
  const [chatPerm, setChatPerm] = useState(false);
  const [invitees, setInvitees] = useState<InviteePayload[]>([]);

  const [addPersonVisible, setAddPersonVisible] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [csvImportVisible, setCsvImportVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setDescription(meeting.description);
      setTimingKind(meeting.timing.kind);
      if (meeting.timing.kind === 'scheduled') {
        setStartsAt(meeting.timing.startsAt);
        setTimezone(meeting.timing.timezone);
      }
      setGuestAccess(meeting.guestAccess);
      setMicPerm(meeting.defaultPermissions.microphone);
      setCamPerm(meeting.defaultPermissions.camera);
      setScreenSharePerm(meeting.defaultPermissions.screenShare);
      setChatPerm(meeting.defaultPermissions.chat);
      setInvitees(
        meeting.invitees.map((inv) => ({
          clientId: inv.id,
          displayName: inv.displayName,
          role: inv.role,
          ...(inv.email ? { email: inv.email } : {}),
          ...(inv.phoneE164 ? { phoneE164: inv.phoneE164 } : {}),
        })),
      );
    }
  }, [meeting]);

  if (isLoadingMeeting || !meeting) {
    return (
      <ScreenContainer scrollable={false} padded={false}>
        <HeaderBar title="Edit Meeting" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
            Loading meeting details...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleAddInvitee = (invitee: InviteePayload) => {
    setInvitees((prev) => {
      const exists = prev.some(
        (i) =>
          (i.email && invitee.email && i.email.toLowerCase() === invitee.email.toLowerCase()) ||
          (i.phoneE164 && invitee.phoneE164 && i.phoneE164 === invitee.phoneE164),
      );
      if (exists) {
        Alert.alert('Duplicate Contact', 'This person is already invited.');
        return prev;
      }
      return [...prev, invitee];
    });
  };

  const handleAddMultipleInvitees = (newInvitees: InviteePayload[]) => {
    setInvitees((prev) => {
      const existingEmails = new Set(prev.map((i) => i.email?.toLowerCase()).filter(Boolean));
      const existingPhones = new Set(prev.map((i) => i.phoneE164).filter(Boolean));
      const filtered = newInvitees.filter((inv) => {
        if (inv.email && existingEmails.has(inv.email.toLowerCase())) return false;
        if (inv.phoneE164 && existingPhones.has(inv.phoneE164)) return false;
        return true;
      });
      return [...prev, ...filtered];
    });
  };

  const handleRemoveInvitee = (clientId: string) => {
    setInvitees((prev) => prev.filter((i) => i.clientId !== clientId));
  };

  const handleToggleInviteeRole = (clientId: string) => {
    setInvitees((prev) =>
      prev.map((i) =>
        i.clientId === clientId
          ? { ...i, role: i.role === 'co_host' ? 'guest' : 'co_host' }
          : i,
      ),
    );
  };

  const handleSave = async () => {
    setErrors({});
    const timing: MeetingTiming =
      timingKind === 'instant'
        ? { kind: 'instant' }
        : { kind: 'scheduled', startsAt: startsAt || new Date().toISOString(), timezone };

    const payload = {
      meetingId: meeting.id,
      expectedVersion: meeting.version,
      title,
      description,
      timing,
      guestAccess,
      defaultPermissions: {
        microphone: micPerm,
        camera: camPerm,
        screenShare: screenSharePerm,
        chat: chatPerm,
      },
      invitees,
    };

    const parsed = updateMeetingPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((err: ZodIssue) => {
        errMap[err.path.join('.') || 'general'] = err.message;
      });
      setErrors(errMap);
      return;
    }

    try {
      await updateMeeting(parsed.data).unwrap();
      Alert.alert('Success', 'Meeting updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: string }).message
          : 'Failed to update meeting';
      Alert.alert('Update Failed', msg);
    }
  };

  const handleCancelMeeting = () => {
    Alert.alert(
      'Cancel Meeting',
      'Are you sure you want to cancel this meeting? Participants will be notified.',
      [
        { text: 'Keep Meeting', style: 'cancel' },
        {
          text: 'Cancel Meeting',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMeeting({
                meetingId: meeting.id,
                expectedVersion: meeting.version,
              }).unwrap();
              Alert.alert('Meeting Cancelled', 'The meeting has been cancelled.', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate(ROUTES.DASHBOARD),
                },
              ]);
            } catch (err: unknown) {
              const msg =
                typeof err === 'object' && err !== null && 'message' in err
                  ? (err as { message: string }).message
                  : 'Failed to cancel meeting';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer scrollable={false} padded={false} testID="edit-meeting-screen">
      <HeaderBar title="Edit Meeting" showBack onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Meeting Details Card */}
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: tokens.textMain }]}>Meeting Details</Text>

          <AppInput
            label="Meeting Title *"
            value={title}
            onChangeText={(val) => {
              setTitle(val);
              if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder="e.g. Q3 Strategic Planning"
            error={errors.title}
          />

          <AppInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Agenda, goals, or meeting overview..."
            multiline
            numberOfLines={3}
            error={errors.description}
          />

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>Meeting Type</Text>
            <SegmentedControl
              options={[
                { label: 'Scheduled', value: 'scheduled' },
                { label: 'Instant', value: 'instant' },
              ]}
              selectedValue={timingKind}
              onSelect={(val) => setTimingKind(val as 'instant' | 'scheduled')}
            />
          </View>
        </View>

        {/* Security & Default Permissions */}
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: tokens.textMain }]}>Security & Permissions</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: tokens.textMain }]}>Guest Access</Text>
              <Text style={[styles.toggleSub, { color: tokens.textMuted }]}>
                Allow users to join without an account
              </Text>
            </View>
            <Switch
              value={guestAccess}
              onValueChange={setGuestAccess}
              trackColor={{ false: tokens.surfaceSubtle, true: tokens.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: tokens.borderSubtle }]} />

          <Text style={[styles.sectionSubtitle, { color: tokens.textMuted }]}>
            Default Participant Permissions
          </Text>

          <View style={styles.permissionGrid}>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: tokens.textMain }]}>🎤 Microphone</Text>
              <Switch
                value={micPerm}
                onValueChange={setMicPerm}
                trackColor={{ false: tokens.surfaceSubtle, true: tokens.primary }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: tokens.textMain }]}>📹 Camera</Text>
              <Switch
                value={camPerm}
                onValueChange={setCamPerm}
                trackColor={{ false: tokens.surfaceSubtle, true: tokens.primary }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: tokens.textMain }]}>🖥️ Screen Sharing</Text>
              <Switch
                value={screenSharePerm}
                onValueChange={setScreenSharePerm}
                trackColor={{ false: tokens.surfaceSubtle, true: tokens.primary }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: tokens.textMain }]}>💬 Chat Messaging</Text>
              <Switch
                value={chatPerm}
                onValueChange={setChatPerm}
                trackColor={{ false: tokens.surfaceSubtle, true: tokens.primary }}
              />
            </View>
          </View>
        </View>

        {/* Invitees Card */}
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle }]}>
          <View style={styles.inviteeHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: tokens.textMain }]}>Invitees</Text>
              <Text style={[styles.cardSub, { color: tokens.textMuted }]}>
                {invitees.length} person{invitees.length === 1 ? '' : 's'} invited
              </Text>
            </View>
          </View>

          <View style={styles.inviteeActionsRow}>
            <TouchableOpacity
              style={[styles.inviteeActionBtn, { backgroundColor: tokens.surfaceSubtle }]}
              onPress={() => setAddPersonVisible(true)}
            >
              <Text style={[styles.inviteeActionText, { color: tokens.textMain }]}>
                ➕ Manual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inviteeActionBtn, { backgroundColor: tokens.surfaceSubtle }]}
              onPress={() => setContactPickerVisible(true)}
            >
              <Text style={[styles.inviteeActionText, { color: tokens.textMain }]}>
                📱 Contacts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inviteeActionBtn, { backgroundColor: tokens.surfaceSubtle }]}
              onPress={() => setCsvImportVisible(true)}
            >
              <Text style={[styles.inviteeActionText, { color: tokens.textMain }]}>
                📄 CSV Import
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inviteeList}>
            {invitees.map((item) => (
              <View
                key={item.clientId}
                style={[
                  styles.inviteeItem,
                  { borderColor: tokens.borderSubtle, backgroundColor: tokens.surfaceSubtle },
                ]}
              >
                <View style={styles.inviteeInfo}>
                  <Text style={[styles.inviteeName, { color: tokens.textMain }]}>
                    {item.displayName}
                  </Text>
                  <Text style={[styles.inviteeContact, { color: tokens.textMuted }]}>
                    {item.email || item.phoneE164}
                  </Text>
                </View>

                <View style={styles.inviteeItemActions}>
                  <TouchableOpacity
                    onPress={() => handleToggleInviteeRole(item.clientId)}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor:
                          item.role === 'co_host' ? tokens.primarySurface : tokens.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        {
                          color:
                            item.role === 'co_host' ? tokens.primary : tokens.textMuted,
                        },
                      ]}
                    >
                      {item.role === 'co_host' ? 'Co-Host' : 'Guest'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleRemoveInvitee(item.clientId)}
                    style={styles.removeBtn}
                  >
                    <Text style={[styles.removeBtnText, { color: tokens.danger }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.submitSection}>
          <AppButton
            title="Save Changes"
            onPress={handleSave}
            variant="primary"
            loading={isUpdating}
          />

          <View style={styles.cancelBtnSpacer}>
            <AppButton
              title="Cancel Meeting"
              onPress={handleCancelMeeting}
              variant="danger"
              loading={isCancelling}
            />
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <AddPersonModal
        visible={addPersonVisible}
        onClose={() => setAddPersonVisible(false)}
        onAdd={handleAddInvitee}
      />

      <ContactPickerModal
        visible={contactPickerVisible}
        onClose={() => setContactPickerVisible(false)}
        onAddContacts={handleAddMultipleInvitees}
        existingInvitees={invitees}
      />

      <CsvImportModal
        visible={csvImportVisible}
        onClose={() => setCsvImportVisible(false)}
        onAddInvitees={handleAddMultipleInvitees}
        existingInvitees={invitees}
      />
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  permissionGrid: {
    gap: 8,
  },
  inviteeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviteeActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteeActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  inviteeActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteeList: {
    gap: 8,
  },
  inviteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  inviteeInfo: {
    flex: 1,
  },
  inviteeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  inviteeContact: {
    fontSize: 12,
    marginTop: 2,
  },
  inviteeItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeBtn: {
    padding: 6,
  },
  removeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  submitSection: {
    marginTop: 8,
    gap: 12,
  },
  cancelBtnSpacer: {
    marginTop: 4,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { useCreateMeetingMutation } from '../../api/appApi';
import { useAppSelector } from '../../store/hooks';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { createMeetingPayloadSchema } from '../../schemas/meetingSchemas';
import { ZodIssue } from 'zod';

export const CreateMeetingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { tokens } = useResolvedTheme();
  const session = useAppSelector((state) => state.auth.session);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timingKind, setTimingKind] = useState<'instant' | 'scheduled'>('scheduled');

  // Scheduled date calculations
  const [scheduledDateOffset, setScheduledDateOffset] = useState<number>(30); // minutes from now
  const [customTimezone, setCustomTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );

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

  const [createMeeting, { isLoading }] = useCreateMeetingMutation();

  const isGuestSession = session?.kind === 'guest';

  const computeStartsAt = (minutesFromNow: number): string => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    return d.toISOString();
  };

  const handleAddInvitee = (invitee: InviteePayload) => {
    setInvitees((prev) => {
      // Check duplicate
      const exists = prev.some(
        (i) =>
          (i.email && invitee.email && i.email.toLowerCase() === invitee.email.toLowerCase()) ||
          (i.phoneE164 && invitee.phoneE164 && i.phoneE164 === invitee.phoneE164),
      );
      if (exists) {
        Alert.alert('Duplicate Contact', 'This person is already invited to the meeting.');
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

  const handleSubmit = async () => {
    if (isGuestSession) {
      Alert.alert('Restricted', 'Guests cannot create meetings. Please log in or register.');
      return;
    }

    setErrors({});

    const timing: MeetingTiming =
      timingKind === 'instant'
        ? { kind: 'instant' }
        : {
            kind: 'scheduled',
            startsAt: computeStartsAt(scheduledDateOffset),
            timezone: customTimezone,
          };

    const payload = {
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

    const parsed = createMeetingPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      const errMap: Record<string, string> = {};
      parsed.error.issues.forEach((err: ZodIssue) => {
        const path = err.path.join('.');
        errMap[path || 'general'] = err.message;
      });
      setErrors(errMap);
      return;
    }

    try {
      const res = await createMeeting(parsed.data).unwrap();
      if (res.meeting) {
        if (timingKind === 'instant') {
          navigation.replace(ROUTES.MEETING_ROOM, { meetingId: res.meeting.id });
        } else {
          navigation.replace(ROUTES.MEETING_DETAILS, { meetingId: res.meeting.id });
        }
      }
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: string }).message
          : 'Could not create meeting';
      Alert.alert('Error', msg);
    }
  };

  return (
    <ScreenContainer scrollable={false} padded={false} testID="create-meeting-screen">
      <HeaderBar
        title="Schedule Meeting"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {isGuestSession && (
          <View style={[styles.guestWarning, { backgroundColor: tokens.warningSurface }]}>
            <Text style={[styles.guestWarningText, { color: tokens.warning }]}>
              ⚠️ Guest users cannot create meetings. Please register an account to host meetings.
            </Text>
          </View>
        )}

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

          {timingKind === 'scheduled' && (
            <View style={styles.scheduledSettings}>
              <Text style={[styles.fieldLabel, { color: tokens.textMuted }]}>Start Time Preset</Text>
              <View style={styles.timingPresets}>
                {[
                  { label: 'In 15m', minutes: 15 },
                  { label: 'In 30m', minutes: 30 },
                  { label: 'In 1 Hour', minutes: 60 },
                  { label: 'Tomorrow', minutes: 1440 },
                ].map((preset) => (
                  <TouchableOpacity
                    key={preset.label}
                    onPress={() => setScheduledDateOffset(preset.minutes)}
                    style={[
                      styles.presetChip,
                      {
                        borderColor:
                          scheduledDateOffset === preset.minutes
                            ? tokens.primary
                            : tokens.borderSubtle,
                        backgroundColor:
                          scheduledDateOffset === preset.minutes
                            ? tokens.surfaceActive
                            : tokens.surfaceSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color:
                            scheduledDateOffset === preset.minutes
                              ? tokens.primary
                              : tokens.textMain,
                          fontWeight:
                            scheduledDateOffset === preset.minutes ? '700' : '400',
                        },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.scheduledInfo, { color: tokens.textMuted }]}>
                Starts at: {new Date(Date.now() + scheduledDateOffset * 60 * 1000).toLocaleString()} ({customTimezone})
              </Text>
            </View>
          )}
        </View>

        {/* Security & Default Permissions */}
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: tokens.textMain }]}>Security & Permissions</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: tokens.textMain }]}>Guest Access</Text>
              <Text style={[styles.toggleSub, { color: tokens.textMuted }]}>
                Allow users to join without an account using a display name
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
            Default Participant Permissions (upon entry)
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
                {invitees.length} person{invitees.length === 1 ? '' : 's'} added
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

          {invitees.length === 0 ? (
            <View style={styles.emptyInvitees}>
              <Text style={[styles.emptyInviteesText, { color: tokens.textMuted }]}>
                No invitees added yet. You can also share the meeting link once created.
              </Text>
            </View>
          ) : (
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
          )}
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <AppButton
            title={timingKind === 'instant' ? 'Start Instant Meeting' : 'Schedule Meeting'}
            onPress={handleSubmit}
            variant="primary"
            loading={isLoading}
            disabled={isGuestSession}
          />
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  guestWarning: {
    padding: 12,
    borderRadius: 8,
  },
  guestWarningText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
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
  scheduledSettings: {
    gap: 8,
    marginTop: 4,
  },
  timingPresets: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 13,
  },
  scheduledInfo: {
    fontSize: 12,
    marginTop: 4,
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
  emptyInvitees: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyInviteesText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
  },
});

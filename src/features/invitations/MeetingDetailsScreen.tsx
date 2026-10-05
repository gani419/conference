import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { AppButton } from '../../components/forms/AppButton';
import {
  useGetMeetingQuery,
  useCancelMeetingMutation,
  useStartMeetingMutation,
} from '../../api/appApi';
import { useAppSelector } from '../../store/hooks';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { shareService } from '../../services/shareService';

type MeetingDetailsRouteProp = RouteProp<RootStackParamList, typeof ROUTES.MEETING_DETAILS>;

export const MeetingDetailsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<MeetingDetailsRouteProp>();
  const { meetingId } = route.params;
  const { tokens } = useResolvedTheme();

  const session = useAppSelector((state) => state.auth.session);
  const currentUserId = session?.user.id;

  const {
    data: meeting,
    isLoading,
    refetch,
  } = useGetMeetingQuery({ meetingId }, { skip: !meetingId });

  const [startMeeting, { isLoading: isStarting }] = useStartMeetingMutation();
  const [cancelMeeting, { isLoading: isCancelling }] = useCancelMeetingMutation();
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  if (isLoading || !meeting) {
    return (
      <ScreenContainer scrollable={false} padded={false}>
        <HeaderBar title="Meeting Details" showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tokens.primary} />
          <Text style={[styles.loadingText, { color: tokens.textMuted }]}>
            Loading meeting details...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const isHost = (meeting.hostId ?? meeting.organizerId) === currentUserId;
  const isCoHost = meeting.invitees.some(
    (inv) => (inv.userId === currentUserId || inv.id === currentUserId) && inv.role === 'co_host',
  );
  const hasHostPrivileges = isHost || isCoHost;

  const isScheduled = meeting.timing.kind === 'scheduled';
  const startsAt = meeting.timing.kind === 'scheduled' ? meeting.timing.startsAt : meeting.scheduledStartTime;
  const scheduledTimeStr = isScheduled
    ? new Date(startsAt).toLocaleString()
    : 'Instant';

  const now = new Date();
  const startsAtDate = isScheduled ? new Date(startsAt) : now;
  const isEligibleToJoin =
    meeting.status === 'live' || (isScheduled && startsAtDate.getTime() <= now.getTime() + 5 * 60 * 1000);

  const handleShare = async () => {
    await shareService.shareMeetingLink({
      title: meeting.title,
      meetingCode: meeting.code,
      shareLink: meeting.shareLink,
      scheduledTime: scheduledTimeStr,
    });
  };

  const handleCopyCode = () => {
    // In React Native without clipboard dependency, notify user
    setCopiedNotice('Meeting code copied: ' + meeting.code);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  const handleCopyLink = () => {
    setCopiedNotice('Meeting link copied: ' + meeting.shareLink);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  const handleStartOrJoin = async () => {
    if (meeting.status === 'cancelled') {
      Alert.alert('Meeting Cancelled', 'This meeting was cancelled.');
      return;
    }
    if (meeting.status === 'ended') {
      navigation.navigate(ROUTES.MEETING_SUMMARY, { meetingId: meeting.id });
      return;
    }

    if (hasHostPrivileges) {
      if (meeting.status !== 'live') {
        try {
          await startMeeting({ meetingId: meeting.id }).unwrap();
        } catch {
          // Ignore if already started
        }
      }
      navigation.navigate(ROUTES.MEETING_ROOM, { meetingId: meeting.id });
    } else {
      // Guests / invitees enter Lobby
      navigation.navigate(ROUTES.LOBBY, { meetingId: meeting.id });
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Meeting',
      'Are you sure you want to cancel this meeting? All invitees will be notified.',
      [
        { text: 'No, Keep', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelMeeting({
                meetingId: meeting.id,
                expectedVersion: meeting.version,
              }).unwrap();
              Alert.alert('Success', 'Meeting cancelled');
              refetch();
            } catch (err: unknown) {
              const msg =
                typeof err === 'object' && err !== null && 'message' in err
                  ? (err as { message: string }).message
                  : 'Failed to cancel';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer scrollable={false} padded={false} testID="meeting-details-screen">
      <HeaderBar
        title="Meeting Details"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          hasHostPrivileges && meeting.status !== 'cancelled' && meeting.status !== 'ended'
            ? {
                label: 'Edit',
                onPress: () => navigation.navigate(ROUTES.EDIT_MEETING, { meetingId: meeting.id }),
              }
            : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {copiedNotice && (
          <View style={[styles.noticeBanner, { backgroundColor: tokens.surfaceActive }]}>
            <Text style={[styles.noticeText, { color: tokens.primary }]}>{copiedNotice}</Text>
          </View>
        )}

        {/* Title and Status Header */}
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.meetingTitle, { color: tokens.textMain }]}>{meeting.title}</Text>
            <StatusBadge status={meeting.status} />
          </View>

          {Boolean(meeting.description) && (
            <Text style={[styles.meetingDesc, { color: tokens.textMuted }]}>
              {meeting.description}
            </Text>
          )}

          <View style={[styles.divider, { backgroundColor: tokens.borderSubtle }]} />

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: tokens.textMuted }]}>Type</Text>
              <Text style={[styles.infoVal, { color: tokens.textMain }]}>
                {meeting.timing.kind === 'instant' ? 'Instant Meeting' : 'Scheduled'}
              </Text>
            </View>

            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: tokens.textMuted }]}>Start Time</Text>
              <Text style={[styles.infoVal, { color: tokens.textMain }]}>
                {scheduledTimeStr}
              </Text>
            </View>

            {meeting.timing.kind === 'scheduled' && (
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, { color: tokens.textMuted }]}>Timezone</Text>
                <Text style={[styles.infoVal, { color: tokens.textMain }]}>
                  {meeting.timing.timezone}
                </Text>
              </View>
            )}

            <View style={styles.infoCol}>
              <Text style={[styles.infoLabel, { color: tokens.textMuted }]}>Guest Access</Text>
              <Text style={[styles.infoVal, { color: tokens.textMain }]}>
                {meeting.guestAccess ? 'Enabled' : 'Restricted to Account Holders'}
              </Text>
            </View>
          </View>
        </View>

        {/* Share & Access Code */}
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
          ]}
        >
          <Text style={[styles.cardTitle, { color: tokens.textMain }]}>Joining Credentials</Text>

          <View style={styles.codeRow}>
            <View style={styles.codeWrap}>
              <Text style={[styles.codeLabel, { color: tokens.textMuted }]}>Meeting Code</Text>
              <Text style={[styles.codeText, { color: tokens.primary }]}>{meeting.code}</Text>
            </View>
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: tokens.surfaceSubtle }]}
              onPress={handleCopyCode}
            >
              <Text style={[styles.copyBtnText, { color: tokens.textMain }]}>📋 Copy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.linkRow}>
            <View style={styles.linkWrap}>
              <Text style={[styles.codeLabel, { color: tokens.textMuted }]}>Direct Link</Text>
              <Text
                style={[styles.linkText, { color: tokens.textMuted }]}
                numberOfLines={1}
              >
                {meeting.shareLink}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: tokens.surfaceSubtle }]}
              onPress={handleCopyLink}
            >
              <Text style={[styles.copyBtnText, { color: tokens.textMain }]}>📋 Copy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shareBtnWrap}>
            <AppButton
              title="📤 Share Meeting Invite"
              onPress={handleShare}
              variant="secondary"
            />
          </View>
        </View>

        {/* Permissions Configuration */}
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
          ]}
        >
          <Text style={[styles.cardTitle, { color: tokens.textMain }]}>Default Permissions</Text>
          <View style={styles.permList}>
            <Text style={[styles.permItem, { color: tokens.textMuted }]}>
              Microphone:{' '}
              <Text style={{ color: meeting.defaultPermissions.microphone ? tokens.success : tokens.textMain }}>
                {meeting.defaultPermissions.microphone ? 'Allowed on entry' : 'Muted on entry'}
              </Text>
            </Text>
            <Text style={[styles.permItem, { color: tokens.textMuted }]}>
              Camera:{' '}
              <Text style={{ color: meeting.defaultPermissions.camera ? tokens.success : tokens.textMain }}>
                {meeting.defaultPermissions.camera ? 'Enabled on entry' : 'Off on entry'}
              </Text>
            </Text>
            <Text style={[styles.permItem, { color: tokens.textMuted }]}>
              Screen Sharing:{' '}
              <Text style={{ color: meeting.defaultPermissions.screenShare ? tokens.success : tokens.textMain }}>
                {meeting.defaultPermissions.screenShare ? 'Allowed' : 'Requires Approval'}
              </Text>
            </Text>
            <Text style={[styles.permItem, { color: tokens.textMuted }]}>
              Chat Messaging:{' '}
              <Text style={{ color: meeting.defaultPermissions.chat ? tokens.success : tokens.textMain }}>
                {meeting.defaultPermissions.chat ? 'Allowed' : 'Disabled initially'}
              </Text>
            </Text>
          </View>
        </View>

        {/* Invitees & Roles */}
        <View
          style={[
            styles.card,
            { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
          ]}
        >
          <Text style={[styles.cardTitle, { color: tokens.textMain }]}>
            Invitees ({meeting.invitees.length})
          </Text>

          {meeting.invitees.length === 0 ? (
            <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
              No specific invitees listed. Anyone with the code can join if guest access is enabled.
            </Text>
          ) : (
            <View style={styles.inviteeList}>
              {meeting.invitees.map((inv) => (
                <View
                  key={inv.id}
                  style={[
                    styles.inviteeRow,
                    { borderColor: tokens.borderSubtle, backgroundColor: tokens.surfaceSubtle },
                  ]}
                >
                  <View style={styles.inviteeInfo}>
                    <Text style={[styles.inviteeName, { color: tokens.textMain }]}>
                      {inv.displayName}
                    </Text>
                    <Text style={[styles.inviteeContact, { color: tokens.textMuted }]}>
                      {inv.email || inv.phoneE164}
                    </Text>
                  </View>
                  <View style={styles.inviteeStatusWrap}>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor:
                            inv.role === 'co_host' ? tokens.primarySurface : tokens.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          {
                            color:
                              inv.role === 'co_host' ? tokens.primary : tokens.textMuted,
                          },
                        ]}
                      >
                        {inv.role === 'co_host' ? 'Co-Host' : 'Guest'}
                      </Text>
                    </View>
                    <Text style={[styles.invStatus, { color: tokens.textMuted }]}>
                      {inv.status ?? inv.invitationStatus}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.actionSection}>
          {meeting.status === 'cancelled' ? (
            <View style={[styles.cancelledBox, { backgroundColor: tokens.dangerSurface }]}>
              <Text style={[styles.cancelledText, { color: tokens.danger }]}>
                This meeting was cancelled by the host.
              </Text>
            </View>
          ) : meeting.status === 'ended' ? (
            <AppButton
              title="View Meeting Summary"
              onPress={() => navigation.navigate(ROUTES.MEETING_SUMMARY, { meetingId: meeting.id })}
              variant="secondary"
            />
          ) : (
            <>
              <AppButton
                title={
                  hasHostPrivileges
                    ? meeting.status === 'live'
                      ? 'Re-join Meeting Room'
                      : 'Start Meeting Now'
                    : isEligibleToJoin
                    ? 'Enter Meeting Lobby'
                    : `Starts at ${new Date(
                        meeting.timing.kind === 'scheduled'
                          ? meeting.timing.startsAt
                          : Date.now(),
                      ).toLocaleTimeString()}`
                }
                onPress={handleStartOrJoin}
                variant="primary"
                loading={isStarting}
                disabled={!hasHostPrivileges && !isEligibleToJoin}
              />

              {hasHostPrivileges && (
                <View style={styles.cancelBtnWrap}>
                  <AppButton
                    title="Cancel Meeting"
                    onPress={handleCancel}
                    variant="danger"
                    loading={isCancelling}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
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
  noticeBanner: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  meetingDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  infoGrid: {
    gap: 10,
  },
  infoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeWrap: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 12,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkWrap: {
    flex: 1,
    marginRight: 8,
  },
  linkText: {
    fontSize: 13,
    marginTop: 2,
  },
  copyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  shareBtnWrap: {
    marginTop: 6,
  },
  permList: {
    gap: 6,
  },
  permItem: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  inviteeList: {
    gap: 8,
  },
  inviteeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  inviteeInfo: {
    flex: 1,
  },
  inviteeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteeContact: {
    fontSize: 11,
    marginTop: 2,
  },
  inviteeStatusWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roleBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invStatus: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  actionSection: {
    marginTop: 8,
    gap: 12,
  },
  cancelBtnWrap: {
    marginTop: 4,
  },
  cancelledBox: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

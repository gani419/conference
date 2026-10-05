import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MeetingListItem } from '../../types/meeting';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { StatusBadge } from '../feedback/StatusBadge';
import { formatMeetingDateTime, getCountdownToMeeting } from '../../utils/dates';
import { AVATARS } from '../../constants/avatars';

export interface MeetingCardProps {
  meeting: MeetingListItem;
  onJoin?: (meetingId: string) => void;
  onView?: (meetingId: string) => void;
  currentServerTime?: string;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onJoin,
  onView,
  currentServerTime,
}) => {
  const { tokens } = useResolvedTheme();

  const formattedDate = formatMeetingDateTime(meeting.scheduledStartTime, meeting.timezone);
  const countdown = getCountdownToMeeting(meeting.scheduledStartTime, currentServerTime);
  const isEligible = meeting.canJoin;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <Text style={[styles.title, { color: tokens.textMain }]} numberOfLines={1}>
            {meeting.title}
          </Text>
          <View style={styles.dateRow}>
            <Text style={styles.calendarIcon}>📅</Text>
            <Text style={[styles.dateText, { color: tokens.textMuted }]}>
              {formattedDate}
            </Text>
          </View>
        </View>
        <StatusBadge variant={meeting.status} />
      </View>

      <View style={styles.bottomRow}>
        {/* Avatar Stack */}
        <View style={styles.avatarStack}>
          {meeting.participantAvatars.slice(0, 3).map((avatarId, idx) => {
            const avatarDef = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
            return (
              <View
                key={`${avatarId}-${idx}`}
                style={[
                  styles.stackedAvatar,
                  {
                    backgroundColor: avatarDef?.backgroundColor ?? '#4F46E5',
                    borderColor: tokens.surface,
                    marginLeft: idx > 0 ? -8 : 0,
                  },
                ]}
              >
                <Text style={styles.stackedInitials}>
                  {avatarDef?.initials ?? 'U'}
                </Text>
              </View>
            );
          })}
          {meeting.participantCount > 3 && (
            <View
              style={[
                styles.stackedBadge,
                { backgroundColor: tokens.surfaceSubtle, borderColor: tokens.surface },
              ]}
            >
              <Text style={[styles.stackedCount, { color: tokens.textMuted }]}>
                +{meeting.participantCount - 3}
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {meeting.status === 'live' || meeting.status === 'scheduled' ? (
            <View style={styles.joinBtnGroup}>
              <TouchableOpacity
                onPress={() => onJoin && onJoin(meeting.id)}
                disabled={!isEligible}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isEligible ? tokens.primary : tokens.surfaceSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: isEligible ? '#FFFFFF' : tokens.textSubtle },
                  ]}
                >
                  Join
                </Text>
              </TouchableOpacity>
              {!isEligible && (
                <Text style={[styles.unlockHint, { color: tokens.textSubtle }]}>
                  {countdown.label === 'Now' ? 'Starts soon' : `Unlocks ${countdown.label}`}
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => onView && onView(meeting.id)}
              style={[styles.viewBtn, { borderColor: tokens.border }]}
            >
              <Text style={[styles.viewBtnText, { color: tokens.primary }]}>View</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleInfo: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  dateText: {
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedInitials: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  stackedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    marginLeft: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  joinBtnGroup: {
    alignItems: 'flex-end',
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  unlockHint: {
    fontSize: 10,
    marginTop: 4,
  },
  viewBtn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

import { feedback } from '../../services/feedback';
import { AppIcon } from '../icons/AppIcon';
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  } from 'react-native';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { SEEDED_USERS } from '../../backend/mock/seed';
import { mockScenarioControls } from '../../backend/mock/scenarios';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setSession } from '../../store/slices/authSlice';
import { AppUser, RegisteredUser, GuestUser } from '../../types/user';
import { Session } from '../../types/auth';
import { ENV } from '../../config/environment';

export interface DevControlsModalProps {
  visible: boolean;
  onClose: () => void;
  activeMeetingId?: string | null;
}

export const DevControlsModal: React.FC<DevControlsModalProps> = ({
  visible,
  onClose,
  activeMeetingId,
}) => {
  const { tokens } = useResolvedTheme();
  const dispatch = useAppDispatch();
  const currentSession = useAppSelector((state) => state.auth.session);
  const [networkFailing, setNetworkFailing] = useState(ENV.mockFailureRate > 0);

  if (!__DEV__ || !visible) return null;

  const handleSwitchUser = (user: AppUser): void => {
    const session: Session =
      user.kind === 'registered'
        ? {
            kind: 'registered',
            user: user as RegisteredUser,
            tokens: {
              accessToken: `mock-token-${user.id}`,
              refreshToken: `mock-refresh-${user.id}`,
              expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
            },
          }
        : {
            kind: 'guest',
            user: user as GuestUser,
            tokens: {
              accessToken: `mock-token-${user.id}`,
              refreshToken: `mock-refresh-${user.id}`,
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
            },
          };
    dispatch(setSession(session));
    feedback.alert('Identity Switched', `Active user is now: ${user.displayName} (${user.kind})`);
  };

  const handleNetworkToggle = (val: boolean): void => {
    setNetworkFailing(val);
    mockScenarioControls.toggleNetworkFailure(val);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: tokens.surface }]}>
          <View style={[styles.header, { borderBottomColor: tokens.border }]}>
            <View>
              <Text style={[styles.title, { color: tokens.textMain }]}> Dev Scenario Controls</Text>
              <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
                Simulate events, switch roles & test edge cases
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <AppIcon style={[styles.closeText, { color: tokens.textMain }]} name="x" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Identity Switcher */}
            <Text style={[styles.sectionTitle, { color: tokens.primary }]}>Switch Seeded Identity</Text>
            <View style={styles.identitiesGrid}>
              {Object.entries(SEEDED_USERS).map(([key, user]) => {
                const isActive = currentSession?.user.id === user.id;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleSwitchUser(user)}
                    style={[
                      styles.identityBtn,
                      {
                        backgroundColor: isActive ? tokens.primaryLight : tokens.surfaceSubtle,
                        borderColor: isActive ? tokens.primary : tokens.border,
                      },
                    ]}
                  >
                    <Text style={[styles.identityName, { color: tokens.textMain }]}>
                      {user.displayName}
                    </Text>
                    <Text style={[styles.identityRole, { color: tokens.textMuted }]}>
                      {key.toLowerCase().replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Event Simulation */}
            <Text style={[styles.sectionTitle, { color: tokens.primary, marginTop: 16 }]}>
              Simulate Realtime Events
            </Text>

            <View style={styles.actionList}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: tokens.surfaceSubtle }]}
                onPress={() => {
                  mockScenarioControls.simulateNotification();
                  feedback.alert('Simulated', 'Incoming meeting invitation notification sent.');
                }}
              >
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}><AppIcon name='bell' size={16} /><Text style={[styles.actionText, { color: tokens.textMain }]}>
                   Trigger Incoming Notification
                </Text></View>
              </TouchableOpacity>

              {activeMeetingId && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: tokens.surfaceSubtle }]}
                    onPress={() => {
                      mockScenarioControls.simulateHostApproval(activeMeetingId, 'part-lobby-casey');
                      feedback.alert('Simulated', 'Casey Park admitted from lobby.');
                    }}
                  >
                    <Text style={[styles.actionText, { color: tokens.textMain }]}>
                       Host Approves Lobby User (Casey)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: tokens.surfaceSubtle }]}
                    onPress={() => {
                      mockScenarioControls.simulatePermissionRevocation(activeMeetingId, 'part-guest-priya');
                      feedback.alert('Simulated', 'Permissions revoked for Priya Shah.');
                    }}
                  >
                    <Text style={[styles.actionText, { color: tokens.textMain }]}>
                       Host Revokes Permissions (Priya)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: tokens.surfaceSubtle }]}
                    onPress={() => {
                      mockScenarioControls.simulateIncomingChatMessage(
                        activeMeetingId,
                        'Host Announcement: Please wrap up questions in 5 minutes.',
                      );
                      feedback.alert('Simulated', 'Announcement broadcasted.');
                    }}
                  >
                    <Text style={[styles.actionText, { color: tokens.textMain }]}>
                       Host Broadcasts Announcement
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: tokens.dangerBg }]}
                    onPress={() => {
                      mockScenarioControls.simulateMeetingCancellation(activeMeetingId);
                      feedback.alert('Simulated', 'Meeting marked cancelled.');
                    }}
                  >
                    <Text style={[styles.actionText, { color: tokens.danger }]}>
                       Host Cancels Active Meeting
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Network Failure Simulation */}
            <Text style={[styles.sectionTitle, { color: tokens.primary, marginTop: 16 }]}>
              Network Conditions
            </Text>
            <View style={[styles.switchRow, { backgroundColor: tokens.surfaceSubtle }]}>
              <View>
                <Text style={[styles.switchLabel, { color: tokens.textMain }]}>
                  Simulate Network Failure
                </Text>
                <Text style={[styles.switchDesc, { color: tokens.textMuted }]}>
                  Reject backend calls with simulated network exception
                </Text>
              </View>
              <Switch value={networkFailing} onValueChange={handleNetworkToggle} />
            </View>

            {/* Reset Database */}
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: tokens.dangerBg, marginTop: 20 }]}
              onPress={() => {
                mockScenarioControls.resetDatabase();
                feedback.alert('Database Reset', 'Mock database restored to initial seed.');
              }}
            >
              <Text style={[styles.resetText, { color: tokens.danger }]}>
                 Reset Mock Database to Seed
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  identitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  identityBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  identityName: {
    fontSize: 13,
    fontWeight: '600',
  },
  identityRole: {
    fontSize: 11,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  actionList: {
    gap: 8,
  },
  actionBtn: {
    padding: 12,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  resetBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

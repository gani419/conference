import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMeetingRoomController } from './useMeetingRoomController';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ParticipantTile } from '../../components/meeting/ParticipantTile';
import { ControlBar } from '../../components/meeting/ControlBar';
import { ChatDrawer } from '../../components/meeting/ChatDrawer';
import { LobbyApprovalSheet } from '../../components/meeting/LobbyApprovalSheet';
import { PermissionRequestsSheet } from '../../components/meeting/PermissionRequestsSheet';
import { RaisedHandsQueue } from '../../components/meeting/RaisedHandsQueue';

export const MeetingRoomMobile: React.FC<ReturnType<typeof useMeetingRoomController>> = (
  c,
) => {
  const { tokens } = useResolvedTheme();
  const insets = useSafeAreaInsets();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pinnedParticipant = c.inMeetingParticipants.find(
    (p) => p.id === c.pinnedParticipantId,
  );

  return (
    <View style={[styles.container, { backgroundColor: '#0f172a' }]}>
      {/* Top Meeting Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.meetingTitle} numberOfLines={1}>
            {c.meeting?.title || 'Meeting Room'}
          </Text>
          <View style={styles.timerBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
          </View>
        </View>

        {/* Quick action notification pills for Host */}
        <View style={styles.headerRight}>
          {c.isHostOrCoHost && c.lobbyParticipants.length > 0 && (
            <TouchableOpacity
              style={[styles.pillBadge, { backgroundColor: '#eab308' }]}
              onPress={() => c.setActivePanel('lobby')}
            >
              <Text style={styles.pillBadgeText}>
                Lobby ({c.lobbyParticipants.length})
              </Text>
            </TouchableOpacity>
          )}

          {c.isHostOrCoHost && c.pendingRequests.length > 0 && (
            <TouchableOpacity
              style={[styles.pillBadge, { backgroundColor: '#3b82f6' }]}
              onPress={() => c.setActivePanel('requests')}
            >
              <Text style={styles.pillBadgeText}>
                Perms ({c.pendingRequests.length})
              </Text>
            </TouchableOpacity>
          )}

          {c.raisedHandParticipants.length > 0 && (
            <TouchableOpacity
              style={[styles.pillBadge, { backgroundColor: '#8b5cf6' }]}
              onPress={() => c.setActivePanel('hands')}
            >
              <Text style={styles.pillBadgeText}>
                ✋ {c.raisedHandParticipants.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Video Stage */}
      <View style={styles.stage}>
        {pinnedParticipant ? (
          <View style={styles.pinnedContainer}>
            <View style={styles.mainPinnedTile}>
              <ParticipantTile
                participant={pinnedParticipant}
                isPinned={true}
                onPinPress={() => c.setPinnedParticipantId(null)}
                onParticipantPress={() => c.setSelectedParticipant(pinnedParticipant)}
              />
            </View>
            {/* Filmstrip below */}
            <ScrollView horizontal style={styles.filmstrip} showsHorizontalScrollIndicator={false}>
              {c.inMeetingParticipants
                .filter((p) => p.id !== pinnedParticipant.id)
                .map((p) => (
                  <View key={p.id} style={styles.filmstripItem}>
                    <ParticipantTile
                      participant={p}
                      isPinned={false}
                      onPinPress={() => c.setPinnedParticipantId(p.id)}
                      onParticipantPress={() => c.setSelectedParticipant(p)}
                    />
                  </View>
                ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {c.inMeetingParticipants.length === 0 ? (
              <View style={styles.emptyStage}>
                <Text style={styles.emptyStageText}>
                  Waiting for other participants to join...
                </Text>
              </View>
            ) : (
              c.inMeetingParticipants.slice(0, 4).map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.gridItem,
                    c.inMeetingParticipants.length === 1 && styles.gridItemSingle,
                    c.inMeetingParticipants.length === 2 && styles.gridItemTwo,
                  ]}
                >
                  <ParticipantTile
                    participant={p}
                    isPinned={false}
                    onPinPress={() => c.setPinnedParticipantId(p.id)}
                    onParticipantPress={() => c.setSelectedParticipant(p)}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </View>

      {/* Bottom Control Bar */}
      <ControlBar
        userRole={c.myRole}
        myPermissions={c.myPermissions}
        isMicOn={c.isMicOn}
        isCameraOn={c.isCameraOn}
        isScreenSharing={c.isScreenSharing}
        isHandRaised={c.isHandRaised}
        activePanelTab={c.activePanel}
        onToggleMic={c.handleToggleMic}
        onRequestMicPermission={() => c.handleRequestPermission('microphone')}
        onToggleCamera={c.handleToggleCamera}
        onRequestCameraPermission={() => c.handleRequestPermission('camera')}
        onToggleScreenShare={c.handleToggleScreenShare}
        onRequestScreenSharePermission={() => c.handleRequestPermission('screenShare')}
        onToggleChatPanel={() =>
          c.setActivePanel((prev) => (prev === 'chat' ? 'none' : 'chat'))
        }
        onToggleParticipantsPanel={() =>
          c.setActivePanel((prev) => (prev === 'participants' ? 'none' : 'participants'))
        }
        onToggleRaiseHand={c.handleToggleRaiseHand}
        onLeavePress={c.isHostOrCoHost?c.handleEndMeetingForAll:c.handleLeaveMeeting}
        onMuteAll={c.isHostOrCoHost ? c.handleMuteAll : undefined}
        onStopCameras={c.isHostOrCoHost ? c.handleStopAllCameras : undefined}
        onToggleLockEntry={c.isHostOrCoHost ? c.handleToggleLockMeeting : undefined}
        isLocked={c.isLocked}
      />

      {/* Slide-over Drawer / Modal Panels */}
      <Modal
        visible={c.activePanel !== 'none'}
        transparent={true}
        animationType="slide"
        onRequestClose={() => c.setActivePanel('none')}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: tokens.surface, paddingBottom: insets.bottom }]}>
            {c.activePanel === 'chat' && (
              <ChatDrawer
                messages={c.chatMessages}
                canChat={c.myPermissions.chat || c.isHostOrCoHost}
                onSendMessage={c.handleSendMessage}
                onSendAnnouncement={c.isHostOrCoHost?c.handleSendAnnouncement:undefined}
                onClose={() => c.setActivePanel('none')}
              />
            )}

            {c.activePanel === 'lobby' && (
              <View style={styles.sheetInner}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: tokens.textMain }]}>
                    Waiting in Lobby
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <Text style={[styles.closeText, { color: tokens.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <LobbyApprovalSheet
                  lobbyParticipants={c.lobbyParticipants}
                  onAdmit={c.handleAdmit}
                  onDeny={c.handleDeny}
                />
              </View>
            )}

            {c.activePanel === 'requests' && (
              <View style={styles.sheetInner}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: tokens.textMain }]}>
                    Permission Requests
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <Text style={[styles.closeText, { color: tokens.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <PermissionRequestsSheet
                  requests={c.pendingRequests}
                  onApprove={(id) => c.handleDecidePermission(id, 'approved')}
                  onDeny={(id) => c.handleDecidePermission(id, 'denied')}
                />
              </View>
            )}

            {c.activePanel === 'hands' && (
              <View style={styles.sheetInner}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: tokens.textMain }]}>
                    Raised Hands
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <Text style={[styles.closeText, { color: tokens.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <RaisedHandsQueue
                  participantsWithHandsRaised={c.raisedHandParticipants}
                  onLowerHand={c.handleLowerHand}
                />
              </View>
            )}

            {c.activePanel === 'participants' && (
              <View style={styles.sheetInner}>
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: tokens.textMain }]}>
                    Participants ({c.inMeetingParticipants.length})
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <Text style={[styles.closeText, { color: tokens.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.participantScroll}>
                  {c.inMeetingParticipants.map((p) => (
                    <View
                      key={p.id}
                      style={[styles.pRow, { borderColor: tokens.borderSubtle }]}
                    >
                      <View style={styles.pInfo}>
                        <Text style={[styles.pName, { color: tokens.textMain }]}>
                          {p.displayName}
                        </Text>
                        <Text style={[styles.pRole, { color: tokens.textMuted }]}>
                          {p.role} {p.media.isMuted ? '• Muted' : '• Speaking'}
                        </Text>
                      </View>
                      {c.isHostOrCoHost && (
                        <View style={styles.pActions}>
                          <TouchableOpacity
                            style={[styles.miniBtn, { backgroundColor: tokens.surfaceSubtle }]}
                            onPress={() => c.handleMuteParticipant(p.id)}
                          >
                            <Text style={styles.miniBtnText}>🔇</Text>
                          </TouchableOpacity>
                          {c.myRole === 'host' && (
                            <TouchableOpacity
                              style={[
                                styles.miniBtn,
                                {
                                  backgroundColor:
                                    p.role === 'co_host'
                                      ? tokens.primarySurface
                                      : tokens.surfaceSubtle,
                                },
                              ]}
                              onPress={() =>
                                c.handleChangeRole(
                                  p.id,
                                  p.role === 'co_host' ? 'participant' : 'co_host',
                                )
                              }
                            >
                              <Text style={styles.miniBtnText}>
                                {p.role === 'co_host' ? '⭐ Co-Host' : '☆ Make Co-Host'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.miniBtn, { backgroundColor: tokens.dangerSurface }]}
                            onPress={() => c.handleRemoveParticipant(p.id)}
                          >
                            <Text style={[styles.miniBtnText, { color: tokens.danger }]}>
                              ✕
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Participant Quick Action Sheet */}
      {c.selectedParticipant && c.isHostOrCoHost && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => c.setSelectedParticipant(null)}
        >
          <TouchableOpacity
            style={styles.actionModalBackdrop}
            activeOpacity={1}
            onPress={() => c.setSelectedParticipant(null)}
          >
            <View
              style={[
                styles.participantActionSheet,
                { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
              ]}
            >
              <Text style={[styles.actionSheetTitle, { color: tokens.textMain }]}>
                {c.selectedParticipant.displayName}
              </Text>
              <Text style={[styles.actionSheetSub, { color: tokens.textMuted }]}>
                Role: {c.selectedParticipant.role}
              </Text>

              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: tokens.borderSubtle }]}
                onPress={() => {
                  c.handleMuteParticipant(c.selectedParticipant!.id);
                }}
              >
                <Text style={[styles.actionText, { color: tokens.textMain }]}>
                  🔇 Mute Participant
                </Text>
              </TouchableOpacity>

              {c.myRole === 'host' && (
                <TouchableOpacity
                  style={[styles.actionRow, { borderBottomColor: tokens.borderSubtle }]}
                  onPress={() => {
                    const newRole =
                      c.selectedParticipant!.role === 'co_host'
                        ? 'participant'
                        : 'co_host';
                    c.handleChangeRole(c.selectedParticipant!.id, newRole);
                  }}
                >
                  <Text style={[styles.actionText, { color: tokens.textMain }]}>
                    {c.selectedParticipant.role === 'co_host'
                      ? 'Demote from Co-Host'
                      : 'Promote to Co-Host'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: tokens.borderSubtle }]}
                onPress={() => {
                  c.setPinnedParticipantId(c.selectedParticipant!.id);
                  c.setSelectedParticipant(null);
                }}
              >
                <Text style={[styles.actionText, { color: tokens.textMain }]}>
                  📌 Pin to Main Stage
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  c.handleRemoveParticipant(c.selectedParticipant!.id);
                }}
              >
                <Text style={[styles.actionText, { color: tokens.danger }]}>
                  🚫 Remove from Meeting
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  meetingTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    maxWidth: 160,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  timerText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 6,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    padding: 8,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48%',
    height: '48%',
  },
  gridItemSingle: {
    width: '100%',
    height: '100%',
  },
  gridItemTwo: {
    width: '100%',
    height: '48%',
  },
  pinnedContainer: {
    flex: 1,
    gap: 8,
  },
  mainPinnedTile: {
    flex: 1,
  },
  filmstrip: {
    maxHeight: 90,
  },
  filmstripItem: {
    width: 110,
    height: 85,
    marginRight: 8,
  },
  emptyStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStageText: {
    color: '#64748b',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetInner: {
    flex: 1,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 18,
    padding: 4,
  },
  participantScroll: {
    flex: 1,
  },
  pRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pInfo: {
    flex: 1,
  },
  pName: {
    fontSize: 14,
    fontWeight: '600',
  },
  pRole: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  pActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  miniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  participantActionSheet: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionSheetSub: {
    fontSize: 12,
    marginBottom: 14,
    marginTop: 2,
  },
  actionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

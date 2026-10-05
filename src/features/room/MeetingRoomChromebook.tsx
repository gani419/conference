import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useMeetingRoomController } from './useMeetingRoomController';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { ParticipantTile } from '../../components/meeting/ParticipantTile';
import { ControlBar } from '../../components/meeting/ControlBar';
import { ChatDrawer } from '../../components/meeting/ChatDrawer';
import { LobbyApprovalSheet } from '../../components/meeting/LobbyApprovalSheet';
import { PermissionRequestsSheet } from '../../components/meeting/PermissionRequestsSheet';
import { RaisedHandsQueue } from '../../components/meeting/RaisedHandsQueue';

export const MeetingRoomChromebook: React.FC<ReturnType<typeof useMeetingRoomController>> = (
  c,
) => {
  const { tokens } = useResolvedTheme();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
    <View style={[styles.container, { backgroundColor: '#090d16' }]}>
      {/* Top Chromebook App Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>🎥</Text>
          </View>
          <View>
            <Text style={styles.meetingTitle}>{c.meeting?.title || 'Conference Room'}</Text>
            <Text style={styles.meetingCodeSub}>
              Code: {c.meeting?.code || '---'} • {c.inMeetingParticipants.length} in room
            </Text>
          </View>
          <View style={styles.timerBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
          </View>
        </View>

        {/* Top Right Badges */}
        <View style={styles.topBarRight}>
          {c.isHostOrCoHost && (
            <View style={styles.hostIndicator}>
              <Text style={styles.hostIndicatorText}>
                🛡️ Moderation: {c.myRole.toUpperCase()}
              </Text>
            </View>
          )}

          {c.isHostOrCoHost && c.lobbyParticipants.length > 0 && (
            <TouchableOpacity
              style={[styles.alertPill, { backgroundColor: '#eab308' }]}
              onPress={() => c.setActivePanel('lobby')}
            >
              <Text style={styles.alertPillText}>
                Lobby Waiting ({c.lobbyParticipants.length})
              </Text>
            </TouchableOpacity>
          )}

          {c.isHostOrCoHost && c.pendingRequests.length > 0 && (
            <TouchableOpacity
              style={[styles.alertPill, { backgroundColor: '#3b82f6' }]}
              onPress={() => c.setActivePanel('requests')}
            >
              <Text style={styles.alertPillText}>
                Permissions ({c.pendingRequests.length})
              </Text>
            </TouchableOpacity>
          )}

          {c.raisedHandParticipants.length > 0 && (
            <TouchableOpacity
              style={[styles.alertPill, { backgroundColor: '#8b5cf6' }]}
              onPress={() => c.setActivePanel('hands')}
            >
              <Text style={styles.alertPillText}>
                ✋ Hands ({c.raisedHandParticipants.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Layout: Center Stage + Right Collapsible Drawer */}
      <View style={styles.mainLayout}>
        {/* Video Grid / Stage */}
        <View
          style={[
            styles.stageArea,
            c.activePanel !== 'none' ? styles.stageWithPanel : styles.stageFull,
          ]}
        >
          {pinnedParticipant ? (
            <View style={styles.pinnedStage}>
              <View style={styles.mainPresenter}>
                <ParticipantTile
                  participant={pinnedParticipant}
                  isPinned={true}
                  onPinPress={() => c.setPinnedParticipantId(null)}
                  onParticipantPress={() => c.setSelectedParticipant(pinnedParticipant)}
                />
              </View>
              <ScrollView horizontal style={styles.bottomFilmstrip} showsHorizontalScrollIndicator={false}>
                {c.inMeetingParticipants
                  .filter((p) => p.id !== pinnedParticipant.id)
                  .map((p) => (
                    <View key={p.id} style={styles.filmstripCard}>
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
              {c.inMeetingParticipants.map((p) => (
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
              ))}
            </View>
          )}
        </View>

        {/* Right Collapsible Panel */}
        {c.activePanel !== 'none' && (
          <View
            style={[
              styles.sideDock,
              { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
            ]}
          >
            {c.activePanel === 'chat' && (
              <ChatDrawer
                messages={c.chatMessages}
                canChat={c.myPermissions.chat || c.isHostOrCoHost}
                onSendMessage={c.handleSendMessage}
                onClose={() => c.setActivePanel('none')}
              />
            )}

            {c.activePanel === 'lobby' && (
              <View style={styles.dockInner}>
                <View style={styles.dockHeader}>
                  <Text style={[styles.dockTitle, { color: tokens.textMain }]}>
                    Lobby Admission Queue
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
              <View style={styles.dockInner}>
                <View style={styles.dockHeader}>
                  <Text style={[styles.dockTitle, { color: tokens.textMain }]}>
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
              <View style={styles.dockInner}>
                <View style={styles.dockHeader}>
                  <Text style={[styles.dockTitle, { color: tokens.textMain }]}>
                    Raised Hands
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <Text style={[styles.closeText, { color: tokens.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <RaisedHandsQueue
                  participantsWithHandsRaised={c.raisedHandParticipants}
                  onLowerHand={(pId) => c.handleMuteParticipant(pId)}
                />
              </View>
            )}

            {c.activePanel === 'participants' && (
              <View style={styles.dockInner}>
                <View style={styles.dockHeader}>
                  <Text style={[styles.dockTitle, { color: tokens.textMain }]}>
                    Meeting Roster ({c.inMeetingParticipants.length})
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <Text style={[styles.closeText, { color: tokens.textMuted }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.rosterScroll}>
                  {c.inMeetingParticipants.map((p) => (
                    <View
                      key={p.id}
                      style={[styles.rosterRow, { borderColor: tokens.borderSubtle }]}
                    >
                      <View style={styles.rosterInfo}>
                        <Text style={[styles.rosterName, { color: tokens.textMain }]}>
                          {p.displayName}
                        </Text>
                        <Text style={[styles.rosterSub, { color: tokens.textMuted }]}>
                          {p.role} • {p.media.isMuted ? 'Muted' : 'Speaking'}
                        </Text>
                      </View>
                      {c.isHostOrCoHost && (
                        <View style={styles.rosterActions}>
                          <TouchableOpacity
                            style={[styles.actionChip, { backgroundColor: tokens.surfaceSubtle }]}
                            onPress={() => c.handleMuteParticipant(p.id)}
                          >
                            <Text style={styles.actionChipText}>Mute</Text>
                          </TouchableOpacity>
                          {c.myRole === 'host' && (
                            <TouchableOpacity
                              style={[
                                styles.actionChip,
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
                              <Text style={styles.actionChipText}>
                                {p.role === 'co_host' ? '⭐ Co-Host' : 'Make Co-Host'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.actionChip, { backgroundColor: tokens.dangerSurface }]}
                            onPress={() => c.handleRemoveParticipant(p.id)}
                          >
                            <Text style={[styles.actionChipText, { color: tokens.danger }]}>
                              Remove
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
        )}
      </View>

      {/* Control Bar */}
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
        onLeavePress={c.handleLeaveMeeting}
        onMuteAll={c.isHostOrCoHost ? c.handleMuteAll : undefined}
        onStopCameras={c.isHostOrCoHost ? c.handleStopAllCameras : undefined}
        onToggleLockEntry={c.isHostOrCoHost ? c.handleToggleLockMeeting : undefined}
        isLocked={c.isLocked}
      />

      {/* Participant Action Dialog */}
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
                onPress={() => c.handleMuteParticipant(c.selectedParticipant!.id)}
              >
                <Text style={[styles.actionText, { color: tokens.textMain }]}>
                  🔇 Mute Microphone
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
                onPress={() => c.handleRemoveParticipant(c.selectedParticipant!.id)}
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
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
  },
  meetingTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  meetingCodeSub: {
    color: '#94a3b8',
    fontSize: 12,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginLeft: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  timerText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hostIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  hostIndicatorText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  alertPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  alertPillText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  stageArea: {
    padding: 16,
  },
  stageFull: {
    flex: 1,
  },
  stageWithPanel: {
    flex: 0.72,
  },
  sideDock: {
    flex: 0.28,
    borderLeftWidth: 1,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gridItem: {
    width: '48.8%',
    height: '48.5%',
  },
  gridItemSingle: {
    width: '100%',
    height: '100%',
  },
  gridItemTwo: {
    width: '48.8%',
    height: '98%',
  },
  pinnedStage: {
    flex: 1,
    gap: 14,
  },
  mainPresenter: {
    flex: 1,
  },
  bottomFilmstrip: {
    maxHeight: 140,
  },
  filmstripCard: {
    width: 190,
    height: 125,
    marginRight: 12,
  },
  dockInner: {
    flex: 1,
    padding: 18,
  },
  dockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dockTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 18,
    padding: 4,
  },
  rosterScroll: {
    flex: 1,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rosterInfo: {
    flex: 1,
  },
  rosterName: {
    fontSize: 14,
    fontWeight: '600',
  },
  rosterSub: {
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  rosterActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  participantActionSheet: {
    width: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 22,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionSheetSub: {
    fontSize: 13,
    marginBottom: 16,
    marginTop: 2,
  },
  actionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

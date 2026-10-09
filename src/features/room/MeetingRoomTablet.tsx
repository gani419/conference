import { AppIcon } from '../../components/icons/AppIcon';
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

export const MeetingRoomTablet: React.FC<ReturnType<typeof useMeetingRoomController>> = (
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

  const hasDockedSidePanel = c.activePanel !== 'none';

  return (
    <View style={[styles.container, { backgroundColor: '#0b0f19' }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.meetingTitle}>{c.meeting?.title || 'Meeting Room'}</Text>
          <View style={styles.timerBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {c.isHostOrCoHost && c.lobbyParticipants.length > 0 && (
            <TouchableOpacity
              style={[styles.pillBadge, { backgroundColor: '#eab308' }]}
              onPress={() => c.setActivePanel('lobby')}
            >
              <Text style={styles.pillBadgeText}>
                Lobby Waiting ({c.lobbyParticipants.length})
              </Text>
            </TouchableOpacity>
          )}

          {c.isHostOrCoHost && c.pendingRequests.length > 0 && (
            <TouchableOpacity
              style={[styles.pillBadge, { backgroundColor: '#3b82f6' }]}
              onPress={() => c.setActivePanel('requests')}
            >
              <Text style={styles.pillBadgeText}>
                Permission Requests ({c.pendingRequests.length})
              </Text>
            </TouchableOpacity>
          )}

          {c.raisedHandParticipants.length > 0 && (
            <TouchableOpacity
              style={[styles.pillBadge, { backgroundColor: '#8b5cf6' }]}
              onPress={() => c.setActivePanel('hands')}
            >
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}><AppIcon name='hand' size={16} /><Text style={styles.pillBadgeText}>
                 {c.raisedHandParticipants.length} Hand Raised
              </Text></View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Body: Stage + Docked Side Panel */}
      <View style={styles.body}>
        {/* Video Stage Area */}
        <View style={[styles.stage, hasDockedSidePanel ? styles.stageWithPanel : styles.stageFull]}>
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

        {/* Docked Side Panel for Tablet */}
        {hasDockedSidePanel && (
          <View
            style={[
              styles.dockedSidePanel,
              { backgroundColor: tokens.surface, borderColor: tokens.borderSubtle },
            ]}
          >
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
              <View style={styles.panelInner}>
                <View style={styles.panelHeader}>
                  <Text style={[styles.panelTitle, { color: tokens.textMain }]}>
                    Lobby Admission
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <AppIcon style={[styles.closeText, { color: tokens.textMuted }]} name="x" />
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
              <View style={styles.panelInner}>
                <View style={styles.panelHeader}>
                  <Text style={[styles.panelTitle, { color: tokens.textMain }]}>
                    Permissions
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <AppIcon style={[styles.closeText, { color: tokens.textMuted }]} name="x" />
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
              <View style={styles.panelInner}>
                <View style={styles.panelHeader}>
                  <Text style={[styles.panelTitle, { color: tokens.textMain }]}>
                    Raised Hands Queue
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <AppIcon style={[styles.closeText, { color: tokens.textMuted }]} name="x" />
                  </TouchableOpacity>
                </View>
                <RaisedHandsQueue
                  participantsWithHandsRaised={c.raisedHandParticipants}
                  onLowerHand={c.handleLowerHand}
                />
              </View>
            )}

            {c.activePanel === 'participants' && (
              <View style={styles.panelInner}>
                <View style={styles.panelHeader}>
                  <Text style={[styles.panelTitle, { color: tokens.textMain }]}>
                    Participants ({c.inMeetingParticipants.length})
                  </Text>
                  <TouchableOpacity onPress={() => c.setActivePanel('none')}>
                    <AppIcon style={[styles.closeText, { color: tokens.textMuted }]} name="x" />
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
                            <View style={{flexDirection:'row',alignItems:'center',gap:6}}><AppIcon name='mic-off' size={16} /><Text style={styles.miniBtnText}> Mute</Text></View>
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
                                {p.role === 'co_host' ? ' Co-Host' : ' Co-Host'}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.miniBtn, { backgroundColor: tokens.dangerSurface }]}
                            onPress={() => c.handleRemoveParticipant(p.id)}
                          >
                            <Text style={[styles.miniBtnText, { color: tokens.danger }]}>
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

      {/* Floating / Docked Bottom Control Bar */}
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
        onEndMeetingPress={c.handleEndMeetingForAll}
        onMuteAll={c.isHostOrCoHost ? c.handleMuteAll : undefined}
        onStopCameras={c.isHostOrCoHost ? c.handleStopAllCameras : undefined}
        onToggleLockEntry={c.isHostOrCoHost ? c.handleToggleLockMeeting : undefined}
        isLocked={c.isLocked}
      />

      {/* Host Participant Action Dialog */}
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
                Current Role: {c.selectedParticipant.role}
              </Text>

              <TouchableOpacity
                style={[styles.actionRow, { borderBottomColor: tokens.borderSubtle }]}
                onPress={() => c.handleMuteParticipant(c.selectedParticipant!.id)}
              >
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}><AppIcon name='mic-off' size={16} /><Text style={[styles.actionText, { color: tokens.textMain }]}>
                   Mute Microphone
                </Text></View>
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
                   Pin to Main Stage
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => c.handleRemoveParticipant(c.selectedParticipant!.id)}
              >
                <Text style={[styles.actionText, { color: tokens.danger }]}>
                   Remove from Meeting
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meetingTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
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
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  pillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pillBadgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  stage: {
    padding: 12,
  },
  stageFull: {
    flex: 1,
  },
  stageWithPanel: {
    flex: 0.68,
  },
  dockedSidePanel: {
    flex: 0.32,
    borderLeftWidth: 1,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48.5%',
    height: '48.5%',
  },
  gridItemSingle: {
    width: '100%',
    height: '100%',
  },
  gridItemTwo: {
    width: '48.5%',
    height: '98%',
  },
  pinnedContainer: {
    flex: 1,
    gap: 12,
  },
  mainPinnedTile: {
    flex: 1,
  },
  filmstrip: {
    maxHeight: 120,
  },
  filmstripItem: {
    width: 160,
    height: 110,
    marginRight: 10,
  },
  panelInner: {
    flex: 1,
    padding: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 16,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniBtnText: {
    fontSize: 12,
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
    width: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  actionSheetSub: {
    fontSize: 13,
    marginBottom: 16,
    marginTop: 2,
  },
  actionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

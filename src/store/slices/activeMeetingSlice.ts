import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ParticipantPermissions, UserMeetingRole } from '../../types/meeting';

export type RoomPanelTab = 'none' | 'chat' | 'participants' | 'requests' | 'settings';

export interface ActiveMeetingState {
  meetingId: string | null;
  userRole: UserMeetingRole | null;
  inLobby: boolean;
  isAdmitted: boolean;
  isHandRaised: boolean;
  myPermissions: ParticipantPermissions;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  activePanelTab: RoomPanelTab;
  speakerView: 'speaker' | 'grid';
}

const initialState: ActiveMeetingState = {
  meetingId: null,
  userRole: null,
  inLobby: false,
  isAdmitted: false,
  isHandRaised: false,
  myPermissions: {
    microphone: false,
    camera: false,
    screenShare: false,
    chat: false,
  },
  isMicOn: false,
  isCameraOn: false,
  isScreenSharing: false,
  activePanelTab: 'none',
  speakerView: 'speaker',
};

export const activeMeetingSlice = createSlice({
  name: 'activeMeeting',
  initialState,
  reducers: {
    enterMeetingRoom(
      state,
      action: PayloadAction<{
        meetingId: string;
        userRole: UserMeetingRole;
        requiresLobby: boolean;
        permissions: ParticipantPermissions;
      }>,
    ) {
      state.meetingId = action.payload.meetingId;
      state.userRole = action.payload.userRole;
      state.inLobby = action.payload.requiresLobby;
      state.isAdmitted = !action.payload.requiresLobby;
      state.myPermissions = action.payload.permissions;
      state.isMicOn = false;
      state.isCameraOn = false;
      state.isScreenSharing = false;
      state.isHandRaised = false;
      state.activePanelTab = 'none';
    },
    admitFromLobby(state) {
      state.inLobby = false;
      state.isAdmitted = true;
    },
    setMyPermissions(state, action: PayloadAction<ParticipantPermissions>) {
      state.myPermissions = action.payload;
      // If mic or camera permission revoked, automatically disable them locally
      if (!action.payload.microphone) {
        state.isMicOn = false;
      }
      if (!action.payload.camera) {
        state.isCameraOn = false;
      }
      if (!action.payload.screenShare) {
        state.isScreenSharing = false;
      }
    },
    toggleMic(state) {
      if (state.myPermissions.microphone) {
        state.isMicOn = !state.isMicOn;
      }
    },
    toggleCamera(state) {
      if (state.myPermissions.camera) {
        state.isCameraOn = !state.isCameraOn;
      }
    },
    toggleScreenShare(state) {
      if (state.myPermissions.screenShare) {
        state.isScreenSharing = !state.isScreenSharing;
      }
    },
    toggleHandRaised(state) {
      state.isHandRaised = !state.isHandRaised;
    },
    setActivePanelTab(state, action: PayloadAction<RoomPanelTab>) {
      state.activePanelTab = action.payload;
    },
    setSpeakerView(state, action: PayloadAction<'speaker' | 'grid'>) {
      state.speakerView = action.payload;
    },
    leaveMeeting(state) {
      state.meetingId = null;
      state.userRole = null;
      state.inLobby = false;
      state.isAdmitted = false;
      state.isHandRaised = false;
      state.isMicOn = false;
      state.isCameraOn = false;
      state.isScreenSharing = false;
      state.activePanelTab = 'none';
    },
  },
});

export const {
  enterMeetingRoom,
  admitFromLobby,
  setMyPermissions,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
  toggleHandRaised,
  setActivePanelTab,
  setSpeakerView,
  leaveMeeting,
} = activeMeetingSlice.actions;

export default activeMeetingSlice.reducer;

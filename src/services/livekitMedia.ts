import { Room, RoomEvent, ConnectionState, Track } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import { hostedRequest } from '../backend/SupabaseBackendAdapter';
import type {
  MediaAdapter,
  LocalMediaState,
  MediaConnectionState,
  RemoteParticipantTrackState,
} from './mediaService';

export const liveRoom = new Room({ adaptiveStream: true, dynacast: true });
export async function requestDevicePermission(kind: 'camera' | 'microphone') {
  if (Platform.OS !== 'android') return;
  const permission =
    kind === 'camera'
      ? PermissionsAndroid.PERMISSIONS.CAMERA
      : PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  const result = await PermissionsAndroid.request(permission);
  if (result !== PermissionsAndroid.RESULTS.GRANTED)
    throw new Error(
      `${
        kind === 'camera' ? 'Camera' : 'Microphone'
      } access was denied. Enable it in device settings.`,
    );
}
export class LiveKitMediaAdapter implements MediaAdapter {
  private connectionListeners = new Set<
    (state: MediaConnectionState) => void
  >();
  private trackListeners = new Set<
    (states: RemoteParticipantTrackState[]) => void
  >();
  private output: LocalMediaState['activeAudioDevice'] = 'speaker';
  private lifecycle: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.lifecycle.then(operation, operation);
    this.lifecycle = next.catch(() => undefined);
    return next;
  }
  constructor() {
    liveRoom.on(RoomEvent.ConnectionStateChanged, () =>
      this.connectionListeners.forEach(l => l(this.getConnectionState())),
    );
    for (const event of [
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.ActiveSpeakersChanged,
    ]) {
      liveRoom.on(event, this.notifyTracks);
    }
  }
  private notifyTracks = () => {
    const states = [
      liveRoom.localParticipant,
      ...liveRoom.remoteParticipants.values(),
    ].map(p => ({
      participantId: p.identity,
      isAudioActive: p.isMicrophoneEnabled,
      isVideoActive: p.isCameraEnabled,
      isScreenSharing: p.isScreenShareEnabled,
      audioLevel: p.audioLevel,
    }));
    this.trackListeners.forEach(l => l(states));
  };
  connect(_token: string, meetingId: string): Promise<boolean> {
    const generation = ++this.generation;
    return this.enqueue(async () => {
      if (generation !== this.generation) return false;
      const data = await hostedRequest<{ token: string; serverUrl: string }>(
        'media-token',
        { meetingId },
      );
      if (generation !== this.generation) return false;
      await AudioSession.startAudioSession();
      try {
        await liveRoom.connect(data.serverUrl, data.token);
        if (generation !== this.generation) {
          await liveRoom.disconnect();
          await AudioSession.stopAudioSession();
          return false;
        }
        this.notifyTracks();
        return true;
      } catch (error) {
        await AudioSession.stopAudioSession();
        throw error;
      }
    });
  }
  disconnect() {
    ++this.generation;
    return this.enqueue(async () => {
      await liveRoom.disconnect();
      await AudioSession.stopAudioSession();
      this.notifyTracks();
    });
  }
  getConnectionState(): MediaConnectionState {
    return liveRoom.state === ConnectionState.SignalReconnecting
      ? 'reconnecting'
      : (liveRoom.state as MediaConnectionState);
  }
  getLocalMediaState(): LocalMediaState {
    const p = liveRoom.localParticipant;
    return {
      isAudioEnabled: p.isMicrophoneEnabled,
      isVideoEnabled: p.isCameraEnabled,
      isScreenShareEnabled: p.isScreenShareEnabled,
      activeAudioDevice: this.output,
    };
  }
  async toggleMicrophone(enabled: boolean) {
    if (enabled) await requestDevicePermission('microphone');
    await liveRoom.localParticipant.setMicrophoneEnabled(enabled);
    this.notifyTracks();
    return true;
  }
  async toggleCamera(enabled: boolean) {
    if (enabled) await requestDevicePermission('camera');
    await liveRoom.localParticipant.setCameraEnabled(enabled);
    this.notifyTracks();
    return true;
  }
  async toggleScreenShare(enabled: boolean) {
    if (enabled && Platform.OS === 'ios')
      throw new Error(
        'iOS screen sharing requires the Broadcast Extension to be configured in Xcode.',
      );
    await liveRoom.localParticipant.setScreenShareEnabled(enabled);
    this.notifyTracks();
    return true;
  }
  async setAudioOutput(device: 'speaker' | 'earpiece' | 'bluetooth') {
    const output =
      Platform.OS === 'ios'
        ? device === 'speaker'
          ? 'force_speaker'
          : 'default'
        : device;
    await AudioSession.selectAudioOutput(output);
    this.output = device;
  }
  onTrackStateChange(
    listener: (states: RemoteParticipantTrackState[]) => void,
  ) {
    this.trackListeners.add(listener);
    this.notifyTracks();
    return () => {
      this.trackListeners.delete(listener);
    };
  }
  onConnectionStateChange(listener: (state: MediaConnectionState) => void) {
    this.connectionListeners.add(listener);
    listener(this.getConnectionState());
    return () => {
      this.connectionListeners.delete(listener);
    };
  }
  getVideo(identity: string) {
    const p =
      identity === liveRoom.localParticipant.identity
        ? liveRoom.localParticipant
        : liveRoom.remoteParticipants.get(identity);
    if (!p) return undefined;
    const screen = p.getTrackPublication(Track.Source.ScreenShare);
    const camera = p.getTrackPublication(Track.Source.Camera);
    const publication = screen?.track && !screen.isMuted ? screen : camera;
    if (!publication?.track || publication.isMuted) return undefined;
    return { participant: p, source: publication.source, publication };
  }
}

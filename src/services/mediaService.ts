import { LiveKitMediaAdapter } from './livekitMedia';
import { ENV } from '../config/environment';

export type MediaConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface LocalMediaState {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenShareEnabled: boolean;
  activeAudioDevice: 'speaker' | 'earpiece' | 'bluetooth' | 'headphones';
}

export interface RemoteParticipantTrackState {
  participantId: string;
  isAudioActive: boolean;
  isVideoActive: boolean;
  isScreenSharing: boolean;
  audioLevel: number; // 0.0 to 1.0
}

export interface MediaAdapter {
  connect(roomToken: string, meetingId: string): Promise<boolean>;
  disconnect(): Promise<void>;
  getConnectionState(): MediaConnectionState;
  getLocalMediaState(): LocalMediaState;
  toggleMicrophone(enabled: boolean): Promise<boolean>;
  toggleCamera(enabled: boolean): Promise<boolean>;
  toggleScreenShare(enabled: boolean): Promise<boolean>;
  setAudioOutput(device: 'speaker' | 'earpiece' | 'bluetooth'): Promise<void>;
  onTrackStateChange(listener: (states: RemoteParticipantTrackState[]) => void): () => void;
  onConnectionStateChange(listener: (state: MediaConnectionState) => void): () => void;
}

export class MockMediaAdapter implements MediaAdapter {
  private connectionState: MediaConnectionState = 'disconnected';
  private localState: LocalMediaState = {
    isAudioEnabled: false,
    isVideoEnabled: false,
    isScreenShareEnabled: false,
    activeAudioDevice: 'speaker',
  };
  private connectionListeners: ((state: MediaConnectionState) => void)[] = [];
  private trackListeners: ((states: RemoteParticipantTrackState[]) => void)[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private simulatedTracks: RemoteParticipantTrackState[] = [];

  async connect(_roomToken: string, _meetingId: string): Promise<boolean> {
    this.connectionState = 'connecting';
    this.notifyConnectionState();

    await new Promise((resolve) => setTimeout(resolve, 400));
    this.connectionState = 'connected';
    this.notifyConnectionState();

    this.startSimulatedAudioMeter();
    return true;
  }

  async disconnect(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.connectionState = 'disconnected';
    this.localState = {
      isAudioEnabled: false,
      isVideoEnabled: false,
      isScreenShareEnabled: false,
      activeAudioDevice: 'speaker',
    };
    this.notifyConnectionState();
  }

  getConnectionState(): MediaConnectionState {
    return this.connectionState;
  }

  getLocalMediaState(): LocalMediaState {
    return { ...this.localState };
  }

  async toggleMicrophone(enabled: boolean): Promise<boolean> {
    this.localState.isAudioEnabled = enabled;
    return true;
  }

  async toggleCamera(enabled: boolean): Promise<boolean> {
    this.localState.isVideoEnabled = enabled;
    return true;
  }

  async toggleScreenShare(enabled: boolean): Promise<boolean> {
    this.localState.isScreenShareEnabled = enabled;
    return true;
  }

  async setAudioOutput(device: 'speaker' | 'earpiece' | 'bluetooth'): Promise<void> {
    this.localState.activeAudioDevice = device;
  }

  onTrackStateChange(listener: (states: RemoteParticipantTrackState[]) => void): () => void {
    this.trackListeners.push(listener);
    return () => {
      this.trackListeners = this.trackListeners.filter((l) => l !== listener);
    };
  }

  onConnectionStateChange(listener: (state: MediaConnectionState) => void): () => void {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== listener);
    };
  }

  private notifyConnectionState(): void {
    for (const listener of this.connectionListeners) {
      listener(this.connectionState);
    }
  }

  private startSimulatedAudioMeter(): void {
    this.timer = setInterval(() => {
      // Simulate subtle audio fluctuations for active speakers
      this.simulatedTracks = [
        {
          participantId: 'seed-p-1',
          isAudioActive: true,
          isVideoActive: true,
          isScreenSharing: false,
          audioLevel: Math.random() * 0.8,
        },
        {
          participantId: 'seed-p-2',
          isAudioActive: false,
          isVideoActive: true,
          isScreenSharing: false,
          audioLevel: 0,
        },
      ];
      for (const listener of this.trackListeners) {
        listener(this.simulatedTracks);
      }
    }, 1200);
  }
}

export const mediaService = ENV.mediaMode === 'livekit' ? new LiveKitMediaAdapter() : new MockMediaAdapter();

import { useEffect, useMemo, useRef, useState } from 'react';
import { ConnectionState, Room, RoomEvent, Track } from 'livekit-client';
import type {
  Participant as MediaParticipant,
  TrackPublication,
} from 'livekit-client';
import { backend } from './backend/supabase';
import type { Participant, Permissions } from './backend/types';
import { Avatar } from './ui';
export function useMedia(
  meetingId: string,
  enabled: boolean,
  permissions?: Permissions,
) {
  const room = useMemo(
    () => new Room({ adaptiveStream: true, dynacast: true }),
    [meetingId],
  );
  const [revision, setRevision] = useState(0),
    [state, setState] = useState<ConnectionState>(ConnectionState.Disconnected),
    [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0),
    [sound, setSound] = useState(true);
  useEffect(() => {
    const update = () => setRevision(n => n + 1);
    const connected = () => {
      setState(room.state);
      update();
    };
    const playback = () => setSound(room.canPlaybackAudio);
    const events = [
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.ActiveSpeakersChanged,
    ];
    events.forEach(event => room.on(event, update));
    room.on(RoomEvent.ConnectionStateChanged, connected);
    room.on(RoomEvent.AudioPlaybackStatusChanged, playback);
    return () => {
      events.forEach(event => room.off(event, update));
      room.off(RoomEvent.ConnectionStateChanged, connected);
      room.off(RoomEvent.AudioPlaybackStatusChanged, playback);
    };
  }, [room]);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    setError('');
    setState(ConnectionState.Connecting);
    async function connect() {
      try {
        const access = await backend.mediaToken(meetingId);
        if (disposed) return;
        await room.connect(access.serverUrl, access.token);
        if (disposed) {
          await room.disconnect();
          return;
        }
        setSound(room.canPlaybackAudio);
      } catch (e) {
        if (!disposed) {
          setError(
            e instanceof Error ? e.message : 'Could not connect to the call.',
          );
          setState(ConnectionState.Disconnected);
        }
      }
    }
    void connect();
    return () => {
      disposed = true;
      void room.disconnect();
    };
  }, [room, meetingId, enabled, attempt]);
  useEffect(() => {
    if (!enabled || !permissions) return;
    const local = room.localParticipant;
    const work: Promise<unknown>[] = [];
    if (!permissions.microphone && local.isMicrophoneEnabled)
      work.push(local.setMicrophoneEnabled(false));
    if (!permissions.camera && local.isCameraEnabled)
      work.push(local.setCameraEnabled(false));
    if (!permissions.screenShare && local.isScreenShareEnabled)
      work.push(local.setScreenShareEnabled(false));
    void Promise.all(work).catch(e =>
      setError(e instanceof Error ? e.message : 'Could not stop media.'),
    );
  }, [
    room,
    enabled,
    permissions?.microphone,
    permissions?.camera,
    permissions?.screenShare,
    revision,
  ]);
  const participants = [
    room.localParticipant,
    ...room.remoteParticipants.values(),
  ];
  return {
    room,
    state,
    error,
    sound,
    revision,
    participants,
    reconnect: () => setAttempt(n => n + 1),
  };
}
function AttachedTrack({
  publication,
  kind,
  local,
}: {
  publication: TrackPublication;
  kind: 'audio' | 'video';
  local: boolean;
}) {
  const [element, setElement] = useState<HTMLMediaElement | null>(null);
  const track = publication.track;
  useEffect(() => {
    if (!element || !track) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [element, track]);
  return kind === 'video' ? (
    <video
      ref={setElement}
      autoPlay
      playsInline
      muted={local}
      className={
        publication.source === Track.Source.ScreenShare ? 'screen-video' : ''
      }
    />
  ) : (
    <audio ref={setElement} autoPlay />
  );
}
export function VideoTile({
  participant,
  media,
  local,
}: {
  participant: Participant;
  media?: MediaParticipant;
  local: boolean;
}) {
  const screen = media?.getTrackPublication(Track.Source.ScreenShare),
    camera = media?.getTrackPublication(Track.Source.Camera);
  const video =
    screen?.track && !screen.isMuted
      ? screen
      : camera?.track && !camera.isMuted
      ? camera
      : undefined;
  const audio = media?.getTrackPublication(Track.Source.Microphone);
  return (
    <article
      className={`video-tile ${media?.isSpeaking ? 'speaking' : ''}`}
      data-participant={participant.user_id}
    >
      {video ? (
        <AttachedTrack publication={video} kind="video" local={local} />
      ) : (
        <div className="video-placeholder">
          <Avatar name={participant.display_name} />
        </div>
      )}
      {!local && audio?.track && (
        <AttachedTrack publication={audio} kind="audio" local={false} />
      )}
      <div className="video-caption">
        <strong>
          {participant.display_name}
          {local ? ' (You)' : ''}
        </strong>
        <span>
          {['host', 'co_host'].includes(participant.role)
            ? participant.role.replace('_', '-')
            : ''}
        </span>
        {participant.is_hand_raised && <span aria-label="Hand raised">✋</span>}
        <span
          aria-label={
            media?.isMicrophoneEnabled ? 'Microphone on' : 'Microphone off'
          }
        >
          {media?.isMicrophoneEnabled ? '◉' : '⊘'}
        </span>
      </div>
    </article>
  );
}
export function CameraPreview() {
  const [stream, setStream] = useState<MediaStream | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [element, setElement] = useState<HTMLVideoElement | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(
    () => () => stream?.getTracks().forEach(track => track.stop()),
    [stream],
  );
  useEffect(() => {
    if (element) element.srcObject = stream;
  }, [element, stream]);
  return (
    <div className="preview">
      <div className="preview-surface">
        {stream ? (
          <video ref={setElement} autoPlay playsInline muted />
        ) : (
          <span>Check your camera before joining</span>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
            return;
          }
          setBusy(true);
          try {
            const next = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            if (!alive.current) {
              next.getTracks().forEach(track => track.stop());
              return;
            }
            setStream(next);
            setError('');
          } catch {
            if (alive.current)
              setError(
                'Camera access is unavailable. Check browser permissions.',
              );
          } finally {
            if (alive.current) setBusy(false);
          }
        }}
      >
        {stream ? 'Stop camera preview' : 'Preview camera'}
      </button>
    </div>
  );
}

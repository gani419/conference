import { Mic, Video, MonitorUp, Hand, PhoneOff, CircleStop, MicOff, VideoOff, Lock, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConnectionState } from 'livekit-client';
import { backend } from './backend/supabase';
import type {
  Attendance,
  ChatMessage,
  Identity,
  Meeting,
  Participant,
  Permission,
  PermissionRequest,
} from './backend/types';
import { permissionKeys, permissionNames } from './backend/types';
import {
  Avatar,
  Empty,
  ErrorNotice,
  formatTime,
  useAction,
  useRemote,
} from './ui';
import { CameraPreview, useMedia, VideoTile } from './media';
import { MeetingForm } from './MeetingForm';
export function MeetingPage({
  identity,
  meetingId,
  onBack,
}: {
  identity: Identity;
  meetingId: string;
  onBack: () => void;
}) {
  const action = useAction();
  const [edit, setEdit] = useState(false),
    [panel, setPanel] = useState<'people' | 'chat'>('people');
  const [copy, setCopy] = useState('');
  const query = useRemote(
    async () => {
      const [meeting, participants, chat, requests] = await Promise.all([
        backend.read<Meeting>('meeting_details', { meetingId }),
        backend.read<Participant[]>('participants', { meetingId }),
        backend.read<ChatMessage[]>('chat', { meetingId }),
        backend.read<PermissionRequest[]>('permission_requests', { meetingId }),
      ]);
      const attendance = ['ended', 'cancelled'].includes(meeting.status)
        ? await backend.read<Attendance[]>('attendance', { meetingId })
        : [];
      return { meeting, participants, chat, requests, attendance };
    },
    [meetingId, identity.id],
    identity.id,
    meetingId,
  );
  const data = query.data;
  const meeting = data?.meeting,
    me = data?.participants.find(p => p.user_id === identity.id);
  const admitted = meeting?.status === 'live' && me?.status === 'in_meeting';
  const host =
    meeting?.organizer_id === identity.id ||
    (me?.role === 'co_host' && me.status === 'in_meeting');
  const organizer = meeting?.organizer_id === identity.id;
  const media = useMedia(meetingId, admitted, me?.permissions);
  const command = (name: string, payload: object = {}) =>
    action.run(async () => {
      await backend.command(name, { meetingId, ...payload });
      query.refresh();
    });
  const live = data?.participants.filter(p => p.status === 'in_meeting') || [],
    lobby = data?.participants.filter(p => p.status === 'in_lobby') || [];
  useEffect(() => {
    if (me?.status === 'removed')
      action.setError('The host removed you from this meeting.');
  }, [me?.status]);
  const share = async (kind: 'web' | 'mobile' | 'code') => {
    const value =
      kind === 'code'
        ? meeting!.code
        : kind === 'mobile'
        ? `conference://join/${meeting!.code}`
        : `${location.origin}/?join=${meeting!.code}`;
    await navigator.clipboard.writeText(value);
    setCopy(`${kind === 'code' ? 'Code' : 'Link'} copied`);
  };
  if (!data)
    return (
      <main className="page">
        <button onClick={onBack}>← Dashboard</button>
        <ErrorNotice message={query.error} />
        {query.loading ? (
          <Empty>Opening meeting…</Empty>
        ) : (
          <button onClick={query.refresh}>Retry</button>
        )}
      </main>
    );
  const m = data.meeting;
  const header = (
    <div className="room-heading">
      <div>
        <button className="quiet" onClick={onBack}>
          ← Dashboard
        </button>
        <h1>{m.title}</h1>
        <p className="muted">
          Hosted by {m.organizer_name || 'Meeting host'} ·{' '}
          {formatTime(m.starts_at)}
        </p>
      </div>
      <div className="button-row">
        <span className={`badge ${m.status}`}>
          {m.status === 'live' ? '● Live' : m.status}
        </span>
        {m.is_locked && <span className="badge">Locked</span>}
        <button onClick={() => void action.run(() => share('code'))}>
          Copy code
        </button>
        <button onClick={() => void action.run(() => share('web'))}>
          Copy web invite
        </button>
        <button onClick={() => void action.run(() => share('mobile'))}>
          Copy mobile invite
        </button>
      </div>
    </div>
  );
  if (['ended', 'cancelled'].includes(m.status))
    return (
      <main className="page">
        {header}
        <ErrorNotice message={query.error} />
        <section className="surface">
          <span className="eyebrow">MEETING SUMMARY</span>
          <h2>
            {m.status === 'ended'
              ? 'Thanks for showing up.'
              : 'This meeting was cancelled.'}
          </h2>
          <p className="muted">
            {m.actual_start_time &&
              `Started ${formatTime(m.actual_start_time)}`}
            {m.ended_at && ` · Ended ${formatTime(m.ended_at)}`}
          </p>
          <h3>Attendance ({data.attendance.length})</h3>
          {data.attendance.map(a => (
            <div className="list-card" key={a.id}>
              <div className="host-line">
                <Avatar name={a.display_name} />
                <strong>{a.display_name}</strong>
                <span className="muted">{a.role}</span>
              </div>
              <span className="small muted">
                {formatTime(a.joined_at)} → {formatTime(a.left_at)}
              </span>
            </div>
          ))}
          {!data.attendance.length && (
            <Empty>No attendance records available.</Empty>
          )}
          <button className="primary" onClick={onBack}>
            Return to dashboard
          </button>
        </section>
      </main>
    );
  return (
    <main className={`page ${admitted ? 'room-page' : ''}`}>
      {header}
      <ErrorNotice message={action.error || query.error} />
      {copy && (
        <p className="notice" role="status">
          {copy}
        </p>
      )}
      {!admitted ? (
        <section className="lobby-layout">
          <div className="surface">
            <span className="eyebrow">MEETING LOBBY</span>
            <h2>
              {me?.status === 'in_lobby'
                ? 'Waiting for the host'
                : 'Ready when you are.'}
            </h2>
            <p className="muted">
              {me?.status === 'in_lobby'
                ? 'Your join request is sent. You will enter when the host admits you.'
                : m.description ||
                  'Your camera and microphone stay off until you choose to enable them.'}
            </p>
            {me?.status !== 'removed' && <CameraPreview />}
            <div className="button-row">
              {me?.status === 'in_lobby' ? (
                <button
                  disabled={action.busy}
                  onClick={() => void command('leave_meeting')}
                >
                  Cancel join request
                </button>
              ) : me?.status === 'removed' ? (
                <button onClick={onBack}>Return to dashboard</button>
              ) : (
                <button
                  className="primary"
                  disabled={
                    action.busy ||
                    (m.status === 'scheduled' &&
                      Date.parse(m.starts_at) > Date.now() + 300000 &&
                      !host)
                  }
                  onClick={() => void command('join_meeting')}
                >
                  {host
                    ? 'Enter meeting'
                    : action.busy
                    ? 'Joining…'
                    : 'Ask to join'}
                </button>
              )}
              {host && m.status === 'scheduled' && (
                <button
                  className="primary"
                  disabled={action.busy}
                  onClick={() => void command('start_meeting')}
                >
                  Start meeting
                </button>
              )}
              <button
                disabled={action.busy}
                onClick={() =>
                  void command('save_meeting', { reminderMinutes: 5 })
                }
              >
                Save meeting
              </button>
            </div>
          </div>
          <aside className="surface">
            <h3>Meeting details</h3>
            <p>
              <strong>Code</strong>
              <br />
              <code>{m.code}</code>
            </p>
            <p>
              <strong>Guest access</strong>
              <br />
              {m.guest_access ? 'Enabled' : 'Accounts only'}
            </p>
            <p>
              <strong>Starts</strong>
              <br />
              {formatTime(m.starts_at)}
            </p>
            {m.expires_at && <p><strong>Active until</strong><br />{formatTime(m.expires_at)}</p>}
            <p><strong>{live.length} active now</strong></p>
            {live.map(person => <p className="small" key={person.id}>{person.display_name} ({person.role.replace('_', '-')} )</p>)}
            {m.is_locked && (
              <p className="notice">The host has locked entry.</p>
            )}
            {host && (
              <>
                <button onClick={() => setEdit(true)}>Edit meeting</button>
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void command('send_invitations', { channels: [] })
                  }
                >
                  Notify invitees
                </button>
                {m.status === 'scheduled' && (
                  <button
                    className="danger"
                    disabled={action.busy}
                    onClick={() => {
                      if (confirm('Cancel this scheduled meeting?'))
                        void command('cancel_meeting', {
                          expectedVersion: m.version,
                        });
                    }}
                  >
                    Cancel meeting
                  </button>
                )}
              </>
            )}
          </aside>
        </section>
      ) : (
        <>
          <div className="call-status" role="status">
            <span
              className={`status-dot ${
                media.state === ConnectionState.Connected ? '' : 'offline'
              }`}
            />
            {media.state === ConnectionState.Connected
              ? 'Connected'
              : `Call ${media.state}`}
            <span className="muted">{live.length} in the room</span>
            {(media.error || media.state === ConnectionState.Disconnected) && (
              <button onClick={media.reconnect}>Reconnect call</button>
            )}
            {!media.sound && (
              <button
                className="primary"
                onClick={() => void action.run(() => media.room.startAudio())}
              >
                Enable sound
              </button>
            )}
          </div>
          <ErrorNotice message={media.error} />
          <div className="call-layout">
            <section className="stage" aria-label="Meeting video">
              <div
                className={`video-grid ${live.length === 1 ? 'single' : ''}`}
              >
                {live.map(p => (
                  <VideoTile
                    key={p.id}
                    participant={p}
                    local={p.user_id === identity.id}
                    media={media.participants.find(
                      remote => remote.identity === p.user_id,
                    )}
                  />
                ))}
              </div>
              <div className="call-controls">
                <button aria-label={!me?.permissions.microphone
                    ? 'Request microphone'
                    : media.room.localParticipant.isMicrophoneEnabled
                    ? 'Mute'
                    : 'Unmute'}
                  disabled={
                    action.busy || media.state !== ConnectionState.Connected
                  }
                  onClick={() =>
                    void (me?.permissions.microphone
                      ? action.run(() =>
                          media.room.localParticipant.setMicrophoneEnabled(
                            !media.room.localParticipant.isMicrophoneEnabled,
                          ),
                        )
                      : command('request_permission', {
                          permission: 'microphone',
                        }))
                  }
                >
                  <Mic size={20} aria-hidden="true" /><span>{!me?.permissions.microphone
                    ? 'Request microphone'
                    : media.room.localParticipant.isMicrophoneEnabled
                    ? 'Mute'
                    : 'Unmute'}</span>
                </button>
                <button aria-label={!me?.permissions.camera
                    ? 'Request camera'
                    : media.room.localParticipant.isCameraEnabled
                    ? 'Stop video'
                    : 'Start video'}
                  disabled={
                    action.busy || media.state !== ConnectionState.Connected
                  }
                  onClick={() =>
                    void (me?.permissions.camera
                      ? action.run(() =>
                          media.room.localParticipant.setCameraEnabled(
                            !media.room.localParticipant.isCameraEnabled,
                          ),
                        )
                      : command('request_permission', { permission: 'camera' }))
                  }
                >
                  <Video size={20} aria-hidden="true" /><span>{!me?.permissions.camera
                    ? 'Request camera'
                    : media.room.localParticipant.isCameraEnabled
                    ? 'Stop video'
                    : 'Start video'}</span>
                </button>
                <button aria-label={!me?.permissions.screenShare
                    ? 'Request screen share'
                    : media.room.localParticipant.isScreenShareEnabled
                    ? 'Stop sharing'
                    : 'Share screen'}
                  disabled={
                    action.busy || media.state !== ConnectionState.Connected
                  }
                  onClick={() =>
                    void (me?.permissions.screenShare
                      ? action.run(() =>
                          media.room.localParticipant.setScreenShareEnabled(
                            !media.room.localParticipant.isScreenShareEnabled,
                          ),
                        )
                      : command('request_permission', {
                          permission: 'screenShare',
                        }))
                  }
                >
                  <MonitorUp size={20} aria-hidden="true" /><span>{!me?.permissions.screenShare
                    ? 'Request screen share'
                    : media.room.localParticipant.isScreenShareEnabled
                    ? 'Stop sharing'
                    : 'Share screen'}</span>
                </button>
                <button aria-label={me?.is_hand_raised ? 'Lower hand' : 'Raise hand'}
                  disabled={action.busy}
                  onClick={() =>
                    void command('raise_hand', { raised: !me?.is_hand_raised })
                  }
                >
                  <Hand size={20} aria-hidden="true" /><span>{me?.is_hand_raised ? 'Lower hand' : 'Raise hand'}</span>
                </button>
                <button
                  aria-label="Leave"
                  className="danger"
                  disabled={action.busy}
                  onClick={() => {
                    if (
                      confirm(
                        'Leave this meeting? You can rejoin before expiry.',
                      )
                    )
                      void action.run(async () => {
                        await backend.command(
                          'leave_meeting',
                          { meetingId },
                        );
                        await media.room.disconnect();
                        onBack();
                      });
                  }}
                >
                  <PhoneOff size={20} aria-hidden="true" /><span>Leave</span>
                </button>
              </div>
              {host && (
                <div className="host-controls">
                  <span className="eyebrow">HOST CONTROLS</span>
                  <button className="danger" disabled={action.busy} onClick={() => { if (confirm('End this meeting for everyone? This prevents rejoining.')) void command('end_meeting'); }} aria-label="End for everyone"><CircleStop size={18} aria-hidden="true" />End for everyone</button>
                  <button
                    disabled={action.busy}
                    onClick={() => {
                      if (confirm('Mute all attendees?'))
                        void command('bulk_permissions', {
                          action: { kind: 'mute_all' },
                        });
                    }}
                  >
                    <MicOff size={18} aria-hidden="true" />Mute all
                  </button>
                  <button
                    disabled={action.busy}
                    onClick={() => {
                      if (confirm('Stop all attendee cameras?'))
                        void command('bulk_permissions', {
                          action: { kind: 'stop_all_cameras' },
                        });
                    }}
                  >
                    <VideoOff size={18} aria-hidden="true" />Stop all cameras
                  </button>
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      void command('bulk_permissions', {
                        action: { kind: 'lock_meeting', locked: !m.is_locked },
                      })
                    }
                  >
                    {m.is_locked ? 'Unlock meeting' : 'Lock meeting'}
                  </button>
                  <button onClick={() => setEdit(true)}>Edit meeting</button>
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      void command('send_invitations', { channels: [] })
                    }
                  >
                    Notify invitees
                  </button>
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      void command('bulk_permissions', {
                        action: { kind: 'disable_all_chat' },
                      })
                    }
                  >
                    Disable all chat
                  </button>
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      void command('bulk_permissions', {
                        action: { kind: 'enable_all_chat' },
                      })
                    }
                  >
                    Enable all chat
                  </button>
                </div>
              )}
            </section>
            <aside className="room-panel">
              <nav className="tabs">
                <button
                  className={panel === 'people' ? 'active' : ''}
                  aria-pressed={panel === 'people'}
                  onClick={() => setPanel('people')}
                >
                  People ({live.length})
                  {host && lobby.length ? ` · Lobby (${lobby.length})` : ''}
                </button>
                <button
                  className={panel === 'chat' ? 'active' : ''}
                  aria-pressed={panel === 'chat'}
                  onClick={() => setPanel('chat')}
                >
                  Chat ({data.chat.length})
                </button>
              </nav>
              {panel === 'people' ? (
                <div className="panel-body">
                  {host && lobby.length > 0 && (
                    <section>
                      <h3>Waiting in lobby</h3>
                      {lobby.map(p => (
                        <div className="participant-row" key={p.id}>
                          <Avatar name={p.display_name} />
                          <div>
                            <strong>{p.display_name}</strong>
                            <div className="button-row">
                              <button
                                disabled={action.busy}
                                onClick={() =>
                                  void command('admit_participant', {
                                    participantId: p.id,
                                    decision: 'admit',
                                  })
                                }
                              >
                                Admit
                              </button>
                              <button
                                disabled={action.busy}
                                onClick={() =>
                                  void command('remove_participant', {
                                    participantId: p.id,
                                  })
                                }
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </section>
                  )}
                  {host && data.requests.length > 0 && (
                    <section>
                      <h3>Permission requests</h3>
                      {data.requests.map(r => (
                        <div className="request-card" key={r.id}>
                          <strong>{r.participant_name}</strong>
                          <p className="small muted">
                            Requests {permissionNames[r.permission]}
                          </p>
                          <div className="button-row">
                            <button
                              disabled={action.busy}
                              onClick={() =>
                                void command('decide_permission', {
                                  requestId: r.id,
                                  decision: 'approve',
                                })
                              }
                            >
                              Approve
                            </button>
                            <button
                              disabled={action.busy}
                              onClick={() =>
                                void command('decide_permission', {
                                  requestId: r.id,
                                  decision: 'deny',
                                })
                              }
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>
                  )}
                  <h3>In the room</h3>
                  {live.map(p => (
                    <div className="participant-card" key={p.id}>
                      <div className="participant-row">
                        <Avatar name={p.display_name} />
                        <div>
                          <strong>{p.display_name}</strong>
                          <small className="muted">
                            {p.role.replace('_', '-')}
                            {p.user_id === identity.id ? ' · You' : ''}
                          </small>
                        </div>
                        {p.is_hand_raised && <span>✋</span>}
                      </div>
                      {host &&
                        p.user_id !== identity.id &&
                        p.role !== 'host' && (
                          <details>
                            <summary>Manage participant</summary>
                            <div className="permission-options">
                              {permissionKeys.map(key => (
                                <label className="check" key={key}>
                                  <input
                                    disabled={action.busy}
                                    type="checkbox"
                                    checked={p.permissions[key]}
                                    onChange={e =>
                                      void command('update_permissions', {
                                        participantId: p.id,
                                        permissions: {
                                          [key]: e.target.checked,
                                        },
                                      })
                                    }
                                  />
                                  {permissionNames[key]}
                                </label>
                              ))}
                            </div>
                            <div className="button-row">
                              {p.is_hand_raised && (
                                <button
                                  disabled={action.busy}
                                  onClick={() =>
                                    void command('lower_hand', {
                                      participantId: p.id,
                                    })
                                  }
                                >
                                  Lower hand
                                </button>
                              )}
                              {organizer && p.role !== 'guest' && (
                                <button
                                  disabled={action.busy}
                                  onClick={() =>
                                    void command('change_role', {
                                      participantId: p.id,
                                      newRole:
                                        p.role === 'co_host'
                                          ? 'participant'
                                          : 'co_host',
                                    })
                                  }
                                >
                                  {p.role === 'co_host'
                                    ? 'Remove co-host'
                                    : 'Make co-host'}
                                </button>
                              )}
                              <button
                                className="danger"
                                disabled={action.busy}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Remove ${p.display_name}? They cannot rejoin.`,
                                    )
                                  )
                                    void command('remove_participant', {
                                      participantId: p.id,
                                    });
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </details>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <Chat
                  messages={data.chat}
                  allowed={!!me?.permissions.chat || host}
                  host={host}
                  busy={action.busy}
                  request={() =>
                    void command('request_permission', { permission: 'chat' })
                  }
                  send={async (text, announcement) =>
                    action.run(async () => {
                      await backend.command(
                        announcement ? 'send_announcement' : 'send_chat',
                        { meetingId, content: text },
                      );
                      query.refresh();
                    })
                  }
                />
              )}
            </aside>
          </div>
        </>
      )}
      {edit && (
        <MeetingForm
          meeting={m}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            query.refresh();
          }}
        />
      )}
    </main>
  );
}
function Chat({
  messages,
  allowed,
  host,
  busy,
  send,
  request,
}: {
  messages: ChatMessage[];
  allowed: boolean;
  host: boolean;
  busy: boolean;
  send: (text: string, announcement: boolean) => Promise<boolean>;
  request: () => void;
}) {
  const [text, setText] = useState(''),
    [announcement, setAnnouncement] = useState(false);
  return (
    <div className="chat-panel">
      <div className="messages" aria-live="polite">
        {!messages.length && <Empty>No messages yet. Say hello.</Empty>}
        {messages.map(m => (
          <article
            className={`message ${
              m.type === 'announcement' ? 'announcement' : ''
            }`}
            key={m.id}
          >
            {m.type === 'announcement' ? (
              <strong>Host announcement</strong>
            ) : (
              <strong>{m.sender_name || 'Participant'}</strong>
            )}
            <p>{m.content}</p>
            <time>
              {new Date(m.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </article>
        ))}
      </div>
      {allowed ? (
        <form
          className="chat-form"
          onSubmit={async e => {
            e.preventDefault();
            if (text.trim() && (await send(text.trim(), announcement)))
              setText('');
          }}
        >
          {host && (
            <label className="check">
              <input
                type="checkbox"
                checked={announcement}
                onChange={e => setAnnouncement(e.target.checked)}
              />
              Send as announcement
            </label>
          )}
          <label className="sr-only" htmlFor="chat-message">
            Message
          </label>
          <textarea
            id="chat-message"
            required
            maxLength={2000}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={
              announcement ? 'Send an announcement' : 'Write a message'
            }
          />
          <button className="primary" disabled={busy || !text.trim()}>
            Send
          </button>
        </form>
      ) : (
        <div className="notice">
          Chat is disabled by the host.
          <button disabled={busy} onClick={request}>
            Request chat permission
          </button>
        </div>
      )}
    </div>
  );
}

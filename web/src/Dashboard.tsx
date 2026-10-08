import { User } from 'lucide-react';
import { getAvatarDefinition } from '../../shared/avatars';
import { dashboardTabs, type DashboardTab } from '../../shared/dashboard';
import { useEffect, useState } from 'react';
import { backend } from './backend/supabase';
import type {
  Identity,
  Invitation,
  Meeting,
  Notification,
} from './backend/types';
import { MeetingForm } from './MeetingForm';
import {
  Avatar,
  Empty,
  ErrorNotice,
  formatTime,
  useAction,
  useRemote,
} from './ui';
export function Dashboard({
  identity,
  pendingCode,
  onResolved,
  onMeeting,
}: {
  identity: Identity;
  pendingCode: string;
  onResolved: () => void;
  onMeeting: (id: string) => void;
}) {
  const action = useAction();
  const [create, setCreate] = useState(false),
    [tab, setTab] = useState<DashboardTab>('upcoming'),
    [pages, setPages] = useState(1);
  const query = useRemote(
    async () => {
      const [meetingPages, invitations, notificationPages] = await Promise.all([
        Promise.all(
          Array.from({ length: pages }, (_, index) =>
            backend.read<Meeting[]>('meetings', {
              limit: 30,
              offset: index * 30,
            }),
          ),
        ),
        backend.read<Invitation[]>('invitations'),
        Promise.all(
          Array.from({ length: pages }, (_, index) =>
            backend.read<Notification[]>('notifications', {
              limit: 30,
              offset: index * 30,
            }),
          ),
        ),
      ]);
      return {
        meetings: [
          ...new Map(meetingPages.flat().map(m => [m.id, m])).values(),
        ],
        invitations,
        notifications: [
          ...new Map(notificationPages.flat().map(n => [n.id, n])).values(),
        ],
        more:
          meetingPages.at(-1)?.length === 30 ||
          notificationPages.at(-1)?.length === 30,
      };
    },
    [identity.id, pages],
    identity.id,
  );
  const resolve = async (value: string) => {
    let code = value.trim();
    try {
      const link = new URL(code);
      code =
        link.searchParams.get('join') ||
        link.pathname.split('/').filter(Boolean).pop() ||
        '';
    } catch {
      /* A plain meeting code is valid. */
    }
    if (!code) throw new Error('Enter a meeting code or link.');
    const meeting = await backend.command<Meeting>('resolve_meeting', { code });
    onResolved();
    onMeeting(meeting.id);
  };
  useEffect(() => {
    if (pendingCode) void action.run(() => resolve(pendingCode));
  }, [pendingCode]);
  const meetings =
    query.data?.meetings.filter(m =>
      tab === 'recent'
        ? ['ended', 'cancelled'].includes(m.status)
        : ['scheduled', 'live'].includes(m.status),
    ) || [];
  return (
    <main className="page dashboard">
      <section className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>
            Hello, {identity.name.split(' ')[0]}
            <span className="wave"> ✦</span>
          </h1>
          <p className="muted">
            Bring people together. Keep the conversation moving.
          </p>
        </div>
        {!identity.guest && (
          <button className="primary" onClick={() => setCreate(true)}>
            + New meeting
          </button>
        )}
      </section>
      <section className="surface dashboard-user-card"><span className="user-avatar" style={{backgroundColor:getAvatarDefinition(identity.avatarId).backgroundColor,color:getAvatarDefinition(identity.avatarId).textColor}}><User size={28} aria-hidden="true" /></span><div><strong>{identity.name}</strong><p className="small muted">{identity.guest ? 'Guest account' : identity.email || 'Registered account'}</p></div></section>
      <ErrorNotice message={action.error || query.error} />
      <section className="join-card">
        <div>
          <span className="join-icon">↗</span>
          <h2>Have a meeting code?</h2>
          <p className="muted">Your next conversation is one click away.</p>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            const code = String(new FormData(e.currentTarget).get('code'));
            void action.run(() => resolve(code));
          }}
        >
          <label className="sr-only" htmlFor="join-code">
            Meeting code or link
          </label>
          <input
            id="join-code"
            name="code"
            required
            placeholder="Enter a code or invitation link"
          />
          <button className="primary" disabled={action.busy}>
            Join meeting →
          </button>
        </form>
      </section>
      <nav className="tabs" aria-label="Dashboard sections">
        {dashboardTabs.map(({ id: value, label }) => (
          <button
            key={value}
            aria-pressed={tab === value}
            className={tab === value ? 'active' : ''}
            onClick={() => setTab(value)}
          >
            {label}
            {value === 'notifications' &&
              query.data?.notifications.some(n => !n.is_read) && (
                <span className="unread-dot" />
              )}
          </button>
        ))}
        <button className="quiet refresh" onClick={query.refresh}>
          Refresh
        </button>
      </nav>
      {query.loading ? (
        <Empty>Loading your workspace…</Empty>
      ) : tab === 'upcoming' || tab === 'recent' ? (
        <>
          <div className="section-heading">
            <h2>
              {tab === 'upcoming' ? 'Your meetings' : 'Past conversations'}
            </h2>
            <span className="muted small">{meetings.length} meetings</span>
          </div>
          {!meetings.length ? (
            <Empty>
              {tab === 'upcoming'
                ? 'No meetings yet. Create one or join with a code.'
                : 'Your completed meetings will appear here.'}
            </Empty>
          ) : (
            <div className="meeting-grid">
              {meetings.map(m => (
                <article className="meeting-card" key={m.id}>
                  <div className="card-top">
                    <span className={`badge ${m.status}`}>
                      {m.status === 'live' ? '● Live' : m.status}
                    </span>
                    <span className="small muted">
                      {m.is_locked ? 'Locked' : ''}
                    </span>
                  </div>
                  <h3>{m.title}</h3>
                  <div className="host-line">
                    <Avatar name={m.organizer_name || 'Host'} />
                    <span>
                      {m.organizer_name || 'Meeting host'}
                      {m.organizer_id === identity.id ? ' · You' : ''}
                    </span>
                  </div>
                  <p className="small muted">{formatTime(m.starts_at)}</p>
                  <div className="card-bottom">
                    <code>{m.code}</code>
                    <button onClick={() => onMeeting(m.id)}>
                      {tab === 'recent'
                        ? 'View summary'
                        : m.organizer_id === identity.id
                        ? 'Open meeting'
                        : 'Join'}{' '}
                      →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : tab === 'invitations' ? (
        <>
          <h2>Your invitations</h2>
          {!query.data?.invitations.length ? (
            <Empty>No invitations yet.</Empty>
          ) : (
            query.data.invitations.map(i => (
              <article className="list-card" key={i.id}>
                <div>
                  <h3>{i.meeting_title}</h3>
                  <p className="muted small">
                    {i.organizer_name} · {formatTime(i.scheduled_start_time)} ·{' '}
                    {i.role} · {i.status}
                  </p>
                </div>
                <div className="button-row">
                  {i.status === 'pending' && (
                    <>
                      <button
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(async () => {
                            await backend.command('decline_invitation', {
                              invitationId: i.id,
                            });
                            query.refresh();
                          })
                        }
                      >
                        Decline
                      </button>
                      <button
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(async () => {
                            await backend.command('accept_invitation', {
                              invitationId: i.id,
                            });
                            query.refresh();
                          })
                        }
                      >
                        Accept
                      </button>
                    </>
                  )}
                  <button onClick={() => onMeeting(i.meeting_id)}>Open</button>
                </div>
              </article>
            ))
          )}
        </>
      ) : (
        <>
          <div className="section-heading">
            <h2>Notifications</h2>
            <button
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await backend.command('mark_all_notifications_read', {});
                  query.refresh();
                })
              }
            >
              Mark all read
            </button>
          </div>
          {!query.data?.notifications.length ? (
            <Empty>You're all caught up.</Empty>
          ) : (
            query.data.notifications.map(n => (
              <article className="list-card" key={n.id}>
                <div>
                  <h3>{n.title || n.kind.replaceAll('_', ' ')}</h3>
                  <p>{n.body}</p>
                  <small className="muted">{formatTime(n.created_at)}</small>
                </div>
                <button
                  disabled={action.busy || n.is_read}
                  onClick={() =>
                    void action.run(async () => {
                      await backend.command('mark_notification_read', {
                        notificationId: n.id,
                      });
                      query.refresh();
                    })
                  }
                >
                  {n.is_read ? 'Read' : 'Mark read'}
                </button>
                {n.meeting_id && (
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        if (!n.is_read)
                          await backend.command('mark_notification_read', {
                            notificationId: n.id,
                          });
                        onMeeting(n.meeting_id!);
                      })
                    }
                  >
                    Open
                  </button>
                )}
              </article>
            ))
          )}
        </>
      )}
      {query.data?.more && (
        <button onClick={() => setPages(value => value + 1)}>
          Load more history
        </button>
      )}
      {create && (
        <MeetingForm onClose={() => setCreate(false)} onSaved={onMeeting} />
      )}
      <footer className="page-footer">
        Conference · Every voice has a place.
      </footer>
    </main>
  );
}

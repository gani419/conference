import { useEffect, useRef, useState } from 'react';
import { backend } from './backend/supabase';
import type { Meeting, MeetingDraft, Permissions } from './backend/types';
import { permissionKeys, permissionNames } from './backend/types';
import { ErrorNotice, useAction } from './ui';
export function MeetingForm({
  meeting,
  onSaved,
  onClose,
}: {
  meeting?: Meeting;
  onSaved: (id: string) => void;
  onClose: () => void;
}) {
  const toLocal = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [expiry, setExpiry] = useState(toLocal(new Date(meeting?.expires_at || Date.now() + 2 * 60 * 60 * 1000)));
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
  return () => previous?.focus();
  }, []);
  const action = useAction();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<{email:string;display_name:string}[]>([]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { backend.read<{email:string;display_name:string}[]>('invitee_suggestions', {query:search}).then(rows => {if(active) setSuggestions(rows);}).catch(() => {if(active) setSuggestions([]);}); }, 300);
    return () => { active=false; clearTimeout(timer); };
  }, [search]);
  const [scheduled, setScheduled] = useState(
    meeting?.timing_kind === 'scheduled',
  );
  const [permissions, setPermissions] = useState<Permissions>(
    meeting?.default_permissions || {
      microphone: false,
      camera: false,
      screenShare: false,
      chat: true,
    },
  );
  const [invitees, setInvitees] = useState(
    (meeting?.invitees || [])
      .filter(i => i.status !== 'revoked')
      .map(i => ({
        clientId: i.id,
        displayName: i.display_name,
        email: i.email,
        role: i.role,
      })),
  );
  const localTime = meeting
    ? new Date(
        new Date(meeting.starts_at).getTime() -
          new Date(meeting.starts_at).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : '';
  return (
    <div className="dialog-backdrop">
      <section
        ref={dialog}
        onKeyDown={event => {
          if (event.key === 'Escape' && !action.busy) {
            event.preventDefault();
            onClose();
          }
          if (event.key === 'Tab') {
            const elements = Array.from(
              dialog.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
              ) || [],
            ).filter(element => element.offsetParent !== null);
            const first = elements[0],
              last = elements.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-form-title"
      >
        <div className="section-heading">
          <h2 id="meeting-form-title">
            {meeting ? 'Edit meeting' : 'Make space for a meeting'}
          </h2>
          <button
            disabled={action.busy}
            aria-label="Close meeting form"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <ErrorNotice message={action.error} />
        <form
          onSubmit={async e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const startsAt = String(f.get('startsAt') || '');
            await action.run(async () => {
              const start = scheduled ? new Date(startsAt).getTime() : Date.now();
              if (scheduled && !meeting && start <= Date.now()) throw new Error('Choose a future start date and time.');
              if (new Date(expiry).getTime() <= start) throw new Error('Expiry must be after the meeting start.');
              const draft: MeetingDraft = {
                expiresAt: new Date(expiry).toISOString(),
                title: String(f.get('title')).trim(),
                description: String(f.get('description')).trim(),
                timing: {
                  kind: scheduled ? 'scheduled' : 'instant',
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  ...(scheduled
                    ? { startsAt: new Date(startsAt).toISOString() }
                    : {}),
                },
                guestAccess: f.get('guestAccess') === 'on',
                defaultPermissions: permissions,
                invitees,
              };
              const m = await backend.command<Meeting>(
                meeting ? 'update_meeting' : 'create_meeting',
                {
                  ...draft,
                  ...(meeting
                    ? {
                        meetingId: meeting.id,
                        expectedVersion: meeting.version,
                      }
                    : {}),
                },
              );
              onSaved(m.id);
            });
          }}
        >
          <label>
            Meeting title
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={meeting?.title}
              placeholder="e.g. Weekly team catch-up"
              autoFocus
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              maxLength={2000}
              defaultValue={meeting?.description}
              placeholder="What are we getting together for?"
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={scheduled}
              disabled={!!meeting}
              onChange={e => setScheduled(e.target.checked)}
            />
            Schedule for later
          </label>
          {scheduled && (
            <label>
              Starts at
              <input
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={localTime || toLocal(new Date(Math.ceil(Date.now() / 60000) * 60000))}
                onChange={e => { const start = new Date(e.target.value); if (start.getTime() >= new Date(expiry).getTime()) setExpiry(toLocal(new Date(start.getTime() + 2 * 60 * 60 * 1000))); }}
                disabled={meeting?.status === 'live'}
              />
              {meeting?.status === 'live' && (
                <input type="hidden" name="startsAt" value={localTime} />
              )}
            </label>
          )}
          <label>Active until<input name="expiresAt" type="datetime-local" required value={expiry} onChange={e => setExpiry(e.target.value)} /></label>
          <p className="small muted">Leaving lets you rejoin before expiry. End for everyone closes the meeting immediately.</p>
          <label className="check">
            <input
              type="checkbox"
              name="guestAccess"
              defaultChecked={meeting?.guest_access ?? true}
            />
            Allow guests with the meeting code
          </label>
          <fieldset>
            <legend>Permissions on admission</legend>
            <div className="permission-options">
              {permissionKeys.map(key => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={e =>
                      setPermissions({
                        ...permissions,
                        [key]: e.target.checked,
                      })
                    }
                  />
                  {permissionNames[key]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Invite people</legend>
            <p className="small muted">
              Invitations appear in Conference. Share the link directly while
              email delivery is deferred. Co-hosts require the organizer's
              approval.
            </p>
            <label>Find a recent invitee or registered email<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or exact email address" /></label>
            {suggestions.map(person => <button type="button" key={person.email} onClick={() => {setInvitees(previous => previous.some(i => i.email.toLowerCase() === person.email.toLowerCase()) ? previous : [...previous, {clientId:crypto.randomUUID(),displayName:person.display_name,email:person.email,role:'guest'}]);setSearch('');}}>{person.display_name} - {person.email}</button>)}
            {invitees.map((i, index) => (
              <div className="invite-row" key={i.clientId}>
                <input
                  aria-label={`Invitee ${index + 1} name`}
                  required
                  placeholder="Name"
                  value={i.displayName}
                  onChange={e =>
                    setInvitees(
                      invitees.map((v, n) =>
                        n === index ? { ...v, displayName: e.target.value } : v,
                      ),
                    )
                  }
                />
                <input
                  aria-label={`Invitee ${index + 1} email`}
                  type="email"
                  required
                  placeholder="Email"
                  value={i.email}
                  onChange={e =>
                    setInvitees(
                      invitees.map((v, n) =>
                        n === index ? { ...v, email: e.target.value } : v,
                      ),
                    )
                  }
                />
                <select
                  aria-label={`Invitee ${index + 1} role`}
                  value={i.role}
                  onChange={e =>
                    setInvitees(
                      invitees.map((v, n) =>
                        n === index
                          ? {
                              ...v,
                              role: e.target.value as 'guest' | 'co_host',
                            }
                          : v,
                      ),
                    )
                  }
                >
                  <option value="guest">Guest</option>
                  <option value="co_host">Co-host</option>
                </select>
                <button
                  type="button"
                  aria-label={`Remove invitee ${index + 1}`}
                  onClick={() =>
                    setInvitees(invitees.filter((_, n) => n !== index))
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setInvitees([
                  ...invitees,
                  {
                    clientId: crypto.randomUUID(),
                    displayName: '',
                    email: '',
                    role: 'guest',
                  },
                ])
              }
            >
              + Add invitee
            </button>
          </fieldset>
          <div className="form-footer">
            <button type="button" disabled={action.busy} onClick={onClose}>
              Cancel
            </button>
            <button className="primary" disabled={action.busy}>
              {action.busy
                ? 'Saving…'
                : meeting
                ? 'Save changes'
                : scheduled
                ? 'Schedule meeting'
                : 'Create meeting'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

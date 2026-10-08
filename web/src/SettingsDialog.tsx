import { useEffect, useRef, useState } from 'react';
import type { Identity } from './backend/types';
import type { ThemePreference } from './theme';
import { disablePush, enablePush, pushEnabled } from './push';
import { ErrorNotice, useAction } from './ui';
export function SettingsDialog({
  identity,
  preference,
  onPreference,
  onClose,
  onSignOut,
}: {
  identity: Identity;
  preference: ThemePreference;
  onPreference: (value: ThemePreference) => void;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const action = useAction();
  const [enabled, setEnabled] = useState(() => pushEnabled(identity.id));
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="dialog settings-dialog"
      onCancel={onClose}
      aria-labelledby="settings-title"
    >
      <div className="section-heading">
        <h2 id="settings-title">Settings</h2>
        <button onClick={onClose} aria-label="Close settings">
          Close
        </button>
      </div>
      <section className="settings-section">
        <h3>Account</h3>
        <p>{identity.name}</p>
        <p className="muted">
          {identity.guest
            ? 'Guest account'
            : identity.email || 'Registered account'}
        </p>
      </section>
      <section className="settings-section">
        <h3>Appearance</h3>
        <div className="button-row" role="group" aria-label="Appearance">
          {(['system', 'light', 'dark'] as const).map(value => (
            <button
              key={value}
              aria-pressed={preference === value}
              className={preference === value ? 'primary' : ''}
              onClick={() => onPreference(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <p className="small muted">
          Your appearance preference is saved on this device.
        </p>
      </section>
      <section className="settings-section">
        <h3>Notifications</h3>
        <p className="muted">
          Meeting invitations and updates appear in your dashboard. Enable push
          notifications to receive invitations when Conference is in the
          background.
        </p>
        {identity.guest ? (
          <p className="muted">
            Sign in with email and password to receive push notifications.
          </p>
        ) : (
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                if (enabled) await disablePush(identity.id);
                else await enablePush(identity.id);
                setEnabled(!enabled);
                window.dispatchEvent(new Event('conference-push-preference'));
              })
            }
          >
            {action.busy
              ? 'Updating notifications...'
              : enabled
              ? 'Disable notifications'
              : 'Enable notifications'}
          </button>
        )}
      </section>
      <ErrorNotice message={action.error} />
      <button
        className="danger"
        disabled={action.busy}
        onClick={() => void action.run(onSignOut)}
      >
        Sign out
      </button>
    </dialog>
  );
}

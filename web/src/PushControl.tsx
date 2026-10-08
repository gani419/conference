import { useEffect, useState } from 'react';
import { disablePush, enablePush, pushEnabled, setPushAccount } from './push';
export function PushControl({
  userId,
  onMeeting,
}: {
  userId: string;
  onMeeting: (id: string) => void;
}) {
  const [enabled, setEnabled] = useState(() => pushEnabled(userId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState('');
  useEffect(() => {
    const off = setPushAccount(userId, payload =>
      setInvitation(payload.data?.meetingId || ''),
    );
    const open = (event: MessageEvent) => {
      if (
        event.data?.type === 'CONFERENCE_OPEN_MEETING' &&
        event.data.userId === userId
      )
        onMeeting(event.data.meetingId);
    };
    navigator.serviceWorker?.addEventListener('message', open);
    return () => {
      off();
      navigator.serviceWorker?.removeEventListener('message', open);
    };
  }, [userId, onMeeting, enabled]);
  useEffect(() => {
    const refresh = () => setEnabled(pushEnabled(userId));
    window.addEventListener('conference-push-preference', refresh);
    return () =>
      window.removeEventListener('conference-push-preference', refresh);
  }, [userId]);
  return (
    <div>
      <button
        className="quiet"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError('');
          const action = enabled ? disablePush(userId) : enablePush(userId);
          void action
            .then(() => {
              setEnabled(!enabled);
              window.dispatchEvent(new Event('conference-push-preference'));
            })
            .catch(e => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        {busy
          ? 'Updating notifications...'
          : enabled
          ? 'Disable notifications'
          : 'Enable notifications'}
      </button>
      {error && <span role="alert">{error}</span>}
      {invitation && (
        <button
          onClick={() => {
            onMeeting(invitation);
            setInvitation('');
          }}
        >
          Open new invitation
        </button>
      )}
    </div>
  );
}

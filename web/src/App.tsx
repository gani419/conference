import { User } from 'lucide-react';
import { AVATARS } from '../../shared/avatars';
import { useTheme } from './theme';
import { SettingsDialog } from './SettingsDialog';
import { PushControl } from './PushControl';
import { disablePush, setPushAccount } from './push';
import {
  useCallback,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react';
import { backend, configurationReady } from './backend/supabase';
import type { Identity } from './backend/types';
import { Dashboard } from './Dashboard';
const MeetingPage = lazy(() =>
  import('./MeetingPage').then(module => ({ default: module.MeetingPage })),
);
import { ErrorNotice, useAction } from './ui';
function initialLink() {
  const url = new URL(window.location.href);
  return (
    url.searchParams.get('join') ||
    (url.pathname.startsWith('/join/') ? url.pathname.split('/')[2] : '') ||
    ''
  );
}
export function App() {
  const theme = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [meetingId, setMeetingId] = useState(
    new URL(window.location.href).searchParams.get('meeting') || '',
  );
  const [pendingCode, setPendingCode] = useState(initialLink);
  const [retry, setRetry] = useState(0);
  const restoreVersion = useRef(0);
  useEffect(() => {
    let disposed = false;
    async function restore() {
      const version = ++restoreVersion.current;
      try {
        const user = await backend.restore();
        if (!disposed && version === restoreVersion.current) {
          setIdentity(user);
          setError('');
        }
      } catch (e) {
        if (!disposed)
          setError(
            e instanceof Error ? e.message : 'Unable to restore your session.',
          );
      } finally {
        if (!disposed) setLoading(false);
      }
    }
    void restore();
    const off = backend.onIdentityChange(() => void restore());
    return () => {
      disposed = true;
      off();
    };
  }, [retry]);
  const go = useCallback((id: string) => {
    setMeetingId(id);
    const url = new URL(location.href);
    url.search = '';
    if (id) url.searchParams.set('meeting', id);
    url.pathname = '/';
    history.replaceState({}, '', url);
  }, []);
  useEffect(() => {
    if (!identity || identity.guest) return setPushAccount('', () => {});
  }, [identity?.id, identity?.guest]);
  const signOut = async () => {
    if (identity && !identity.guest) await disablePush(identity.id);
    await backend.signOut();
    setSettingsOpen(false);
    setIdentity(null);
    go('');
    setPendingCode('');
  };
  if (!configurationReady)
    return (
      <main className="auth-shell">
        <h1>Configure Conference</h1>
        <p>
          Add the Supabase public configuration to the root .env and run the web
          configuration script.
        </p>
      </main>
    );
  if (loading)
    return (
      <main className="auth-shell" role="status">
        Opening Conference…
      </main>
    );
  return (
    <>
      <header className="app-header">
        <button className="brand" onClick={() => go('')}>
          <span className="brand-mark">C</span>Conference
        </button>
        <span className="header-caption">A little more connected.</span>
        {identity && (
          <div className="account">
            {!identity.guest && (
              <PushControl
                key={identity.id}
                userId={identity.id}
                onMeeting={go}
              />
            )}
            <button className="quiet" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
            <span>
              {identity.name}
              {identity.guest ? ' · Guest' : ''}
            </span>
            <button
              className="quiet"
              onClick={() => void signOut().catch(e => setError(e.message))}
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      {identity && settingsOpen && (
        <SettingsDialog
          identity={identity}
          preference={theme.preference}
          onPreference={theme.setPreference}
          onClose={() => setSettingsOpen(false)}
          onSignOut={signOut}
        />
      )}
      {error && (
        <div className="page">
          <ErrorNotice message={error} />
          <button onClick={() => setRetry(n => n + 1)}>Retry session</button>
        </div>
      )}
      <Suspense
        fallback={
          <main className="page" role="status">
            Opening your meeting…
          </main>
        }
      >
        {identity ? (
          meetingId ? (
            <MeetingPage
              key={`${identity.id}:${meetingId}`}
              identity={identity}
              meetingId={meetingId}
              onBack={() => go('')}
            />
          ) : (
            <Dashboard
              key={identity.id}
              identity={identity}
              pendingCode={pendingCode}
              onResolved={() => setPendingCode('')}
              onMeeting={go}
            />
          )
        ) : (
          <Auth />
        )}
      </Suspense>
    </>
  );
}
function Auth() {
  const [mode, setMode] = useState<'login' | 'register' | 'guest'>('login');
  const [avatarId, setAvatarId] = useState('avatar-1');
  const action = useAction();
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <span className="eyebrow">YOUR ROOM. YOUR RULES.</span>
        <h1>
          Good meetings
          <br />
          start here.
        </h1>
        <p>
          A focused space to connect, share ideas, and keep everyone in the
          conversation.
        </p>
        <div className="story-cards">
          <div>
            <span>01</span>
            <strong>Make room for everyone</strong>
            <p>Invite your team or welcome a guest.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Stay in control</strong>
            <p>Manage the lobby and who can share.</p>
          </div>
        </div>
        <div className="story-footer">
          <span className="status-dot" />
          Real conversations, wherever you are.
        </div>
      </section>
      <section className="auth-card">
        <span className="eyebrow">WELCOME TO CONFERENCE</span>
        <h2>
          {mode === 'login'
            ? 'Welcome back'
            : mode === 'register'
            ? 'Create your account'
            : 'Join as a guest'}
        </h2>
        <p className="muted">
          {mode === 'guest'
            ? 'Choose a name others will see in the meeting.'
            : 'A meeting space for you and your team.'}
        </p>
        <ErrorNotice message={action.error} />
        <form
          onSubmit={async e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await action.run(() =>
              mode === 'guest'
                ? backend.guest(String(f.get('name')).trim())
                : mode === 'register'
                ? backend.signUp(
                    String(f.get('name')).trim(),
                    String(f.get('email')).trim(),
                    String(f.get('password')),
                    avatarId,
                  )
                : backend.signIn(
                    String(f.get('email')).trim(),
                    String(f.get('password')),
                  ),
            );
          }}
        >
          {mode !== 'login' && (
            <label>
              Display name
              <input
                name="name"
                required
                maxLength={80}
                autoComplete="nickname"
                placeholder="Your name"
              />
            </label>
          )}
          {mode === 'register' && <fieldset><legend>Choose an avatar</legend><div className="avatar-options">{AVATARS.map(avatar => <button type="button" key={avatar.id} aria-label={'Select '+avatar.label} aria-pressed={avatarId === avatar.id} onClick={() => setAvatarId(avatar.id)} style={{backgroundColor:avatar.backgroundColor,color:avatar.textColor,border:avatarId === avatar.id ? '3px solid var(--text)' : '3px solid transparent'}}><User size={24} aria-hidden="true" /></button>)}</div></fieldset>}
          {mode !== 'guest' && (
            <>
              <label>
                Email address
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  autoComplete={
                    mode === 'register' ? 'new-password' : 'current-password'
                  }
                  placeholder="Enter your password"
                />
              </label>
            </>
          )}
          <button className="primary full" disabled={action.busy}>
            {action.busy
              ? 'Please wait…'
              : mode === 'login'
              ? 'Log in'
              : mode === 'register'
              ? 'Create account'
              : 'Continue as guest'}
          </button>
        </form>
        <div className="auth-options">
          {(['login', 'register', 'guest'] as const)
            .filter(x => x !== mode)
            .map(x => (
              <button
                disabled={action.busy}
                key={x}
                className="quiet"
                onClick={() => {
                  setMode(x);
                  action.setError('');
                }}
              >
                {x === 'login'
                  ? 'Back to login'
                  : x === 'register'
                  ? 'Create an account'
                  : 'Continue as guest'}
              </button>
            ))}
        </div>
        {mode === 'login' && (
          <details className="muted small">
            <summary>Password recovery</summary>
            <p>
              Password recovery email will be available once email delivery is
              configured.
            </p>
          </details>
        )}
      </section>
    </main>
  );
}

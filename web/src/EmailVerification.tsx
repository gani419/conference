import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { backend } from './backend/supabase';
import { ErrorNotice, useAction } from './ui';
import {
  EMAIL_CODE_LENGTH,
  EMAIL_RESEND_SECONDS,
} from '../../shared/emailVerification';
export function EmailVerification({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState(
    'Check your inbox and spam folder. If the code has expired, request a new one.',
  );
  const action = useAction();
  useEffect(() => {
    const timer = setInterval(
      () => setCooldown(value => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Mail size={48} aria-hidden="true" />
        <h1>Check your email.</h1>
        <p>
          Confirm your email address to finish creating your Conference account.
        </p>
      </section>
      <section className="auth-card">
        <h2>Verify your email</h2>
        <p>
          Enter the {EMAIL_CODE_LENGTH}-digit code sent to{' '}
          <strong>{email}</strong>.
        </p>
        <p className="muted" role="status">
          {notice}
        </p>
        <ErrorNotice message={action.error} />
        <form
          onSubmit={async event => {
            event.preventDefault();
            if (!new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`).test(code)) {
              action.setError(
                `Enter the ${EMAIL_CODE_LENGTH}-digit email code.`,
              );
              return;
            }
            await action.run(async () => {
              await backend.verifyEmail(email, code);
              sessionStorage.removeItem('conference-pending-email');
            });
          }}
        >
          <label>
            Email verification code
            <input
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern={`[0-9]{${EMAIL_CODE_LENGTH}}`}
              required
              minLength={EMAIL_CODE_LENGTH}
              maxLength={EMAIL_CODE_LENGTH}
              value={code}
              onChange={event =>
                setCode(
                  event.target.value
                    .replace(/[^0-9]/g, '')
                    .slice(0, EMAIL_CODE_LENGTH),
                )
              }
              disabled={action.busy}
              autoFocus
            />
          </label>
          <button className="primary full" disabled={action.busy}>
            {action.busy ? 'Please wait?' : 'Verify email'}
          </button>
        </form>
        <div className="auth-options">
          <button
            disabled={action.busy || cooldown > 0}
            onClick={() =>
              void action.run(async () => {
                await backend.resendEmailVerification(email);
                setCooldown(EMAIL_RESEND_SECONDS);
                setCode('');
                setNotice('A new code was sent. Use the most recent email.');
              })
            }
          >
            {cooldown ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
          <button disabled={action.busy} onClick={onBack}>
            Back to login
          </button>
        </div>
      </section>
    </main>
  );
}

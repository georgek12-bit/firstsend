'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FlowShell } from '@/components/Flow';
import SocialAuth from '@/components/SocialAuth';
import { Field } from '@/components/ui';
import { authErrorFromUrl } from '@/lib/supabase';
import { errorText, nextRoute, useStore } from '@/lib/store';

export default function Login() {
  const { state, ready, login, resetPassword, live } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Coming back from Google/Microsoft/Apple: show what went wrong, or carry on once signed in.
  useEffect(() => {
    if (live) {
      const msg = authErrorFromUrl();
      if (msg) setError(errorText(new Error(msg)));
    }
  }, [live]);
  useEffect(() => {
    if (ready && state.account?.loggedIn) router.replace(nextRoute(state));
  }, [ready, state, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      const res = await login(email, password);
      if (res === 'invalid') setError("That email and password don't match. Try again or reset your password.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError('Enter your email first, then click "Forgot password".');
    setBusy(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FlowShell>
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">Log in</h1>
      </div>
      {resetSent ? (
        <div className="ui-card ui-stack">
          <h2 className="ui-h2">Check your inbox</h2>
          <p className="ui-muted">We sent a link to {email.trim()} to set a new password. You can close this tab.</p>
          <div>
            <button type="button" className="ui-link" onClick={() => setResetSent(false)}>
              Back to log in
            </button>
          </div>
        </div>
      ) : (
        <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <SocialAuth returnTo="/login/" onError={setError} />
          <form className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties} onSubmit={submit} noValidate>
            <Field id="email" label="Work email">
              <input
                id="email"
                className="ui-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setError(null);
                }}
              />
            </Field>
            <Field
              id="password"
              label="Password"
              hint={
                <button type="button" className="ui-link" onClick={forgot} disabled={busy}>
                  Forgot password?
                </button>
              }
            >
              <input
                id="password"
                className="ui-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
            </Field>
            {error && (
              <p className="ui-error" role="alert">
                {error}
              </p>
            )}
            <div className="flow__actions">
              <button type="submit" className="ui-btn" disabled={busy}>
                {busy ? 'Logging in…' : 'Log in'}
              </button>
              <span className="ui-small ui-muted">
                New here? <Link href="/signup" className="ui-link">Start sending</Link>
              </span>
            </div>
          </form>
        </div>
      )}
    </FlowShell>
  );
}

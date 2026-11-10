'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FlowShell, Loading } from '@/components/Flow';
import { Field } from '@/components/ui';
import { MIN_PASSWORD } from '@/lib/state';
import { errorText, nextRoute, useStore } from '@/lib/store';

/** Where the "set a new password" email lands. The link signs the person in, then they pick a password. */
export default function Reset() {
  const { state, ready, setPassword } = useStore();
  const router = useRouter();
  const [password, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return <Loading />;

  if (!state.account?.loggedIn) {
    return (
      <FlowShell>
        <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <h1 className="ui-h1">This link has expired</h1>
          <p className="ui-sub">Reset links only work once and for a short time. Ask for a new one from the log in page.</p>
          <div>
            <Link href="/login" className="ui-btn">
              Back to log in
            </Link>
          </div>
        </div>
      </FlowShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    setBusy(true);
    try {
      await setPassword(password);
      router.replace(nextRoute(state));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <FlowShell>
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">Set a new password</h1>
        <p className="ui-sub">For {state.account.email}.</p>
      </div>
      <form className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties} onSubmit={submit} noValidate>
        <Field id="password" label="New password" hint={`At least ${MIN_PASSWORD} characters.`} error={error}>
          <input
            id="password"
            className="ui-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => {
              setPw(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'password-error' : undefined}
          />
        </Field>
        <div className="flow__actions">
          <button type="submit" className="ui-btn" disabled={busy}>
            {busy ? 'Saving…' : 'Save and continue'}
          </button>
        </div>
      </form>
    </FlowShell>
  );
}

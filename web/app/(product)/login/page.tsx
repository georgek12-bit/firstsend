'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FlowShell } from '@/components/Flow';
import { Field } from '@/components/ui';
import { nextRoute, useStore } from '@/lib/store';

export default function Login() {
  const { state, login } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(email)) {
      setError("We couldn't find an account with that email. Check the spelling or sign up.");
      return;
    }
    setSent(true);
  };

  return (
    <FlowShell>
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">Log in</h1>
        <p className="ui-sub">We&apos;ll email you a sign-in link. No password to remember.</p>
      </div>
      {sent ? (
        <div className="ui-card ui-stack">
          <h2 className="ui-h2">Check your inbox</h2>
          <p className="ui-muted">
            In the live product you&apos;d click the link we sent to {email}. In this demo you can go straight in.
          </p>
          <div>
            <button type="button" className="ui-btn ui-btn--orange" onClick={() => router.push(nextRoute({ ...state, account: state.account && { ...state.account, loggedIn: true } }))}>
              Open my dashboard <span className="mono">→</span>
            </button>
          </div>
        </div>
      ) : (
        <form className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties} onSubmit={submit} noValidate>
          <Field id="email" label="Work email" error={error}>
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
              aria-invalid={!!error}
              aria-describedby={error ? 'email-error' : undefined}
            />
          </Field>
          <div className="flow__actions">
            <button type="submit" className="ui-btn">
              Send sign-in link
            </button>
            <span className="ui-small ui-muted">
              New here? <Link href="/signup" className="ui-link">Start sending</Link>
            </span>
          </div>
        </form>
      )}
    </FlowShell>
  );
}

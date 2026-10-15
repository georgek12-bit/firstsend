'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { FlowShell } from '@/components/Flow';
import PlanSummary from '@/components/PlanSummary';
import { Choice, Field, money } from '@/components/ui';
import { PLANS, fmt, type PlanId } from '@/lib/plans';
import { checkSignupEmail, errorText, nextRoute, useStore } from '@/lib/store';

function Signup() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, ready, signup } = useStore();
  const initial = PLANS.find(p => p.id === params.get('plan'))?.id ?? PLANS[0].id;
  const [plan, setPlan] = useState<PlanId>(initial);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const signedIn = ready && state.account?.loggedIn;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      name: name.trim() ? undefined : 'Enter your name.',
      email: checkSignupEmail(email) ?? undefined,
    };
    setErrors(next);
    if (next.name || next.email) return;
    setBusy(true);
    try {
      const { sent } = await signup({ name, email, plan });
      if (sent) setSentTo(email.trim());
      else router.push(`/checkout?plan=${plan}`);
    } catch (err) {
      setErrors({ form: errorText(err) });
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <FlowShell step={0} aside={<PlanSummary planId={plan} />}>
        <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
          <h1 className="ui-h1">Check your email</h1>
          <p className="ui-sub">
            We sent a sign-in link to <b>{sentTo}</b>. Click it to confirm your email and go straight to payment. You can close this tab.
          </p>
        </div>
        <p className="ui-small ui-muted">
          Nothing there after a minute? Check spam, or{' '}
          <button type="button" className="ui-link" onClick={() => setSentTo(null)}>
            try again
          </button>
          .
        </p>
      </FlowShell>
    );
  }

  return (
    <FlowShell step={0} aside={<PlanSummary planId={plan} />}>
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">Start sending today.</h1>
        <p className="ui-sub">Create your account, pay with a card, and we start setting up right away. No call needed.</p>
      </div>

      {signedIn && (
        <div className="ui-banner">
          <span>
            You&apos;re signed in as <b>{state.account!.email}</b>.
          </span>
          <Link href={nextRoute(state)} className="ui-btn ui-btn--sm">
            Continue where you left off
          </Link>
        </div>
      )}

      <form className="ui-stack" style={{ '--gap': '22px' } as React.CSSProperties} onSubmit={submit} noValidate>
        <fieldset className="ui-fieldset">
          <legend className="ui-legend" style={{ marginBottom: 8 }}>
            How many emails a day?
          </legend>
          <div className="ui-choices">
            {PLANS.map(p => (
              <Choice
                key={p.id}
                name="plan"
                value={p.id}
                checked={plan === p.id}
                onChange={v => setPlan(v as PlanId)}
                title={`${fmt(p.perDay)} a day`}
                desc={`${p.name} · ${money(p.price)}/mo`}
              />
            ))}
          </div>
        </fieldset>

        <Field id="name" label="Your name" error={errors.name}>
          <input
            id="name"
            className="ui-input"
            autoComplete="name"
            value={name}
            onChange={e => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
        </Field>
        <Field id="email" label="Work email" hint="Use your agency email. Free and disposable addresses aren't accepted." error={errors.email}>
          <input
            id="email"
            className="ui-input"
            type="email"
            autoComplete="email"
            placeholder="you@youragency.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </Field>

        <div className="flow__actions">
          <button type="submit" className="ui-btn ui-btn--orange" disabled={busy}>
            {busy ? 'Sending…' : 'Continue to payment'} {!busy && <span className="mono">→</span>}
          </button>
          <span className="ui-small ui-muted">
            Have an account? <Link href="/login" className="ui-link">Log in</Link>
          </span>
        </div>
        {errors.form && (
          <p className="ui-error" role="alert">
            {errors.form}
          </p>
        )}
        {state.account && !signedIn && (
          <p className="ui-small ui-muted">Signing up again starts a fresh demo account in this browser.</p>
        )}
      </form>
    </FlowShell>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Signup />
    </Suspense>
  );
}

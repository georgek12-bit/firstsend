'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FlowShell, Loading, useGuard } from '@/components/Flow';
import { Choice, Field } from '@/components/ui';
import { SEQUENCER_OPTIONS } from '@/lib/sequencers';
import { asset } from '@/lib/asset';
import { errorText, useStore } from '@/lib/store';
import type { Business, ClientCount, LeadSource, UseCase } from '@/lib/types';

const CLIENTS: { v: ClientCount; t: string }[] = [
  { v: '0', t: 'None yet' },
  { v: '1-3', t: '1 to 3' },
  { v: '4-10', t: '4 to 10' },
  { v: '10+', t: 'More than 10' },
];

const USE_CASES: { v: UseCase; t: string; d: string }[] = [
  { v: 'agency', t: 'Booking meetings for clients', d: 'You run outbound for other businesses.' },
  { v: 'own', t: 'Selling my own product or service', d: 'B2B outreach for your own company.' },
  { v: 'recruiting', t: 'Recruiting', d: 'Reaching candidates or hiring managers.' },
  { v: 'b2c', t: 'Promoting to consumers', d: 'Emailing individuals, not businesses.' },
];

const LEADS: { v: LeadSource; t: string }[] = [
  { v: 'build', t: 'I build my own lists (Apollo, Clay, etc.)' },
  { v: 'bought', t: 'I buy ready-made lists' },
  { v: 'unsure', t: 'Not sure yet' },
];

export default function Onboarding() {
  const ok = useGuard('/onboarding');
  const router = useRouter();
  const { state, submitBusiness } = useStore();
  const prev = state.business;
  const [b, setB] = useState<Partial<Business>>({});
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);

  if (!ok) return <Loading />;

  const v = { ...prev, ...b };
  const set = (patch: Partial<Business>) => setB(x => ({ ...x, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!v.company?.trim()) errs.company = 'Enter your company or agency name.';
    if (!v.website?.trim() || !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v.website.trim())) errs.website = 'Enter your website, like youragency.com.';
    if (!v.clients) errs.clients = 'Pick one.';
    if (!v.useCase) errs.useCase = 'Pick one.';
    if (!v.leadSource) errs.leadSource = 'Pick one.';
    if (!v.sequencer) errs.sequencer = 'Pick the tool you send from.';
    if (!agree) errs.agree = 'You need to agree to the acceptable use policy.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setChecking(true);
    submitBusiness(v as Business)
      .then(res => router.push(res.result === 'approved' ? '/onboarding/domains' : '/onboarding/declined'))
      .catch(err => {
        setErrors({ form: errorText(err) });
        setChecking(false);
      });
  };

  return (
    <FlowShell
      step={2}
      aside={
        <div className="ui-card ui-card--soft ui-stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <span className="ui-label">Why we ask</span>
          <p>
            Everyone&apos;s inboxes share the same servers. A few quick checks keep spammers out, so your emails keep landing.
          </p>
          <p className="ui-muted ui-small">
            New accounts start at half their daily volume for two weeks. It goes up automatically as long as bounce and spam
            rates stay healthy.
          </p>
        </div>
      }
    >
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">Tell us about your business</h1>
        <p className="ui-sub">Takes about a minute. We use it to set up your inboxes and keep everyone&apos;s deliverability safe.</p>
      </div>
      <form className="ui-stack" style={{ '--gap': '26px' } as React.CSSProperties} onSubmit={submit} noValidate>
        <div className="ui-grid-2">
          <Field id="company" label="Company or agency name" error={errors.company}>
            <input id="company" className="ui-input" autoComplete="organization" value={v.company ?? ''} onChange={e => set({ company: e.target.value })} aria-invalid={!!errors.company} />
          </Field>
          <Field id="website" label="Website" error={errors.website}>
            <input id="website" className="ui-input" inputMode="url" placeholder="youragency.com" value={v.website ?? ''} onChange={e => set({ website: e.target.value })} aria-invalid={!!errors.website} />
          </Field>
        </div>

        <fieldset className="ui-fieldset">
          <legend className="ui-legend" style={{ marginBottom: 8 }}>How many clients do you have?</legend>
          <div className="ui-choices" style={{ '--min': '130px' } as React.CSSProperties} id="clients" tabIndex={-1}>
            {CLIENTS.map(c => (
              <Choice key={c.v} name="clients" value={c.v} checked={v.clients === c.v} onChange={x => set({ clients: x as ClientCount })} title={c.t} />
            ))}
          </div>
          {errors.clients && <span className="ui-error">{errors.clients}</span>}
        </fieldset>

        <fieldset className="ui-fieldset">
          <legend className="ui-legend" style={{ marginBottom: 8 }}>What will you use cold email for?</legend>
          <div className="ui-choices" style={{ '--min': '240px' } as React.CSSProperties} id="useCase" tabIndex={-1}>
            {USE_CASES.map(c => (
              <Choice key={c.v} name="useCase" value={c.v} checked={v.useCase === c.v} onChange={x => set({ useCase: x as UseCase })} title={c.t} desc={c.d} />
            ))}
          </div>
          {errors.useCase && <span className="ui-error">{errors.useCase}</span>}
        </fieldset>

        <fieldset className="ui-fieldset">
          <legend className="ui-legend" style={{ marginBottom: 8 }}>Where do your leads come from?</legend>
          <div className="ui-stack" style={{ '--gap': '8px' } as React.CSSProperties} id="leadSource" tabIndex={-1}>
            {LEADS.map(c => (
              <Choice key={c.v} name="leadSource" value={c.v} checked={v.leadSource === c.v} onChange={x => set({ leadSource: x as LeadSource })} title={c.t} />
            ))}
          </div>
          {v.leadSource === 'bought' && (
            <span className="ui-hint">That&apos;s fine. Verify bought lists before sending. We include a guide in your launch kit.</span>
          )}
          {errors.leadSource && <span className="ui-error">{errors.leadSource}</span>}
        </fieldset>

        <Field id="sequencer" label="Which sequencer do you use?" error={errors.sequencer}>
          <select id="sequencer" className="ui-select" value={v.sequencer ?? ''} onChange={e => set({ sequencer: e.target.value as Business['sequencer'] })} aria-invalid={!!errors.sequencer}>
            <option value="" disabled>
              Choose one
            </option>
            {SEQUENCER_OPTIONS.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="other">Something else (CSV export)</option>
          </select>
        </Field>

        <div className="ui-stack" style={{ '--gap': '6px' } as React.CSSProperties}>
          <div id="agree" tabIndex={-1}>
            <Choice
              type="checkbox"
              name="agree"
              value="yes"
              checked={agree}
              onChange={() => setAgree(a => !a)}
              title="I agree to the acceptable use policy"
              desc={
                <>
                  B2B outreach only. No purchased consumer data, phishing or misleading content. Breaking it means instant suspension.{' '}
                  <a href={asset('/acceptable-use/')} target="_blank" rel="noreferrer" className="ui-link">
                    Read the policy
                  </a>
                </>
              }
            />
          </div>
          {errors.agree && <span className="ui-error">{errors.agree}</span>}
        </div>

        {errors.form && (
          <p className="ui-error" role="alert">
            {errors.form}
          </p>
        )}
        <div className="flow__actions">
          <button type="submit" className="ui-btn ui-btn--orange" disabled={checking}>
            {checking ? 'Checking…' : 'Continue to domains'} {!checking && <span className="mono">→</span>}
          </button>
        </div>
      </form>
    </FlowShell>
  );
}

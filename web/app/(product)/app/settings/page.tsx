'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Field, useToast } from '@/components/ui';
import { SEQUENCER_OPTIONS, sequencerName } from '@/lib/sequencers';
import { checkSignupEmail } from '@/lib/store';
import type { Business } from '@/lib/types';
import { useView } from '@/lib/view';

export default function Settings() {
  const { state, updateAccount, updateBusiness, disconnect, demo } = useView();
  const router = useRouter();
  const [toast, show] = useToast();
  const [name, setName] = useState(state.account!.name);
  const [email, setEmail] = useState(state.account!.email);
  const [biz, setBiz] = useState<Business>(state.business!);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  const saveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Enter your name.';
    const emailErr = checkSignupEmail(email);
    if (emailErr) errs.email = emailErr;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    updateAccount({ name, email });
    show('Account saved.');
  };

  const saveBiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!biz.company.trim()) {
      setErrors({ company: 'Enter your company name.' });
      return;
    }
    updateBusiness(biz);
    show('Business details saved.');
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Settings</span>
          <h1 className="ui-h1">Settings</h1>
        </div>
      </div>

      <div className="cols">
        <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <form className="ui-card ui-stack" onSubmit={saveAccount} noValidate aria-labelledby="acct-h">
            <h2 id="acct-h" className="ui-h2">
              Account
            </h2>
            <div className="ui-grid-2">
              <Field id="s-name" label="Name" error={errors.name}>
                <input id="s-name" className="ui-input" value={name} onChange={e => setName(e.target.value)} aria-invalid={!!errors.name} />
              </Field>
              <Field id="s-email" label="Work email" error={errors.email}>
                <input id="s-email" className="ui-input" type="email" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!errors.email} />
              </Field>
            </div>
            <div>
              <button type="submit" className="ui-btn">
                Save account
              </button>
            </div>
          </form>

          <form className="ui-card ui-stack" onSubmit={saveBiz} noValidate aria-labelledby="biz-h">
            <h2 id="biz-h" className="ui-h2">
              Business
            </h2>
            <div className="ui-grid-2">
              <Field id="s-company" label="Company" error={errors.company}>
                <input id="s-company" className="ui-input" value={biz.company} onChange={e => setBiz({ ...biz, company: e.target.value })} />
              </Field>
              <Field id="s-site" label="Website">
                <input id="s-site" className="ui-input" value={biz.website} onChange={e => setBiz({ ...biz, website: e.target.value })} />
              </Field>
            </div>
            <Field id="s-seq" label="Main sequencer">
              <select id="s-seq" className="ui-select" value={biz.sequencer} onChange={e => setBiz({ ...biz, sequencer: e.target.value as Business['sequencer'] })}>
                {SEQUENCER_OPTIONS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="other">Something else (CSV export)</option>
              </select>
            </Field>
            <div>
              <button type="submit" className="ui-btn">
                Save business
              </button>
            </div>
          </form>
        </div>

        <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <section className="ui-card ui-stack" aria-labelledby="conn-h" style={{ '--gap': '12px' } as React.CSSProperties}>
            <h2 id="conn-h" className="ui-h3">
              Connected sequencers
            </h2>
            {state.connections.length ? (
              state.connections.map(c => (
                <div key={c.sequencer} className="ui-between" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
                  <span>{sequencerName(c.sequencer)}</span>
                  <button
                    type="button"
                    className="ui-link ui-small"
                    onClick={() => {
                      disconnect(c.sequencer);
                      show(`${sequencerName(c.sequencer)} disconnected.`);
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              ))
            ) : (
              <p className="ui-muted ui-small">None yet. Export from the Inboxes page.</p>
            )}
          </section>

          <section className="demo" aria-labelledby="demo-h">
            <h2 id="demo-h" className="ui-h3">
              Demo controls
            </h2>
            <p className="ui-small ui-muted">These only exist in the demo, to show states that normally take days.</p>
            <div className="ui-row" style={{ '--gap': '8px' } as React.CSSProperties}>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => (demo.skipWarmup(), show('Setup and warmup finished.'))}>
                Finish setup and warmup
              </button>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => (demo.burnOne(), show('One inbox burned. Check Inboxes.'))}>
                Burn an inbox
              </button>
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => (demo.advanceMonth(), show('Jumped to renewal day.'))}>
                Jump to renewal
              </button>
            </div>
            {confirmReset ? (
              <div className="ui-row" style={{ '--gap': '8px' } as React.CSSProperties}>
                <span className="ui-small">Delete all demo data in this browser?</span>
                <button
                  type="button"
                  className="ui-btn ui-btn--danger ui-btn--sm"
                  onClick={() => {
                    demo.reset();
                    router.push('/');
                  }}
                >
                  Yes, reset
                </button>
                <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setConfirmReset(false)}>
                  No
                </button>
              </div>
            ) : (
              <div>
                <button type="button" className="ui-link ui-small" onClick={() => setConfirmReset(true)}>
                  Reset demo
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
      {toast}
    </>
  );
}

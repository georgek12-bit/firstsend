'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FlowShell, Loading, useGuard } from '@/components/Flow';
import { Choice, Field } from '@/components/ui';
import { domainsFor, planById } from '@/lib/plans';
import type { DomainStatus } from '@/lib/state';
import { DOMAIN_RE, suggestDomains } from '@/lib/sim';
import { errorText, useStore } from '@/lib/store';

export default function Domains() {
  const ok = useGuard('/onboarding/domains');
  const router = useRouter();
  const { state, chooseDomains, checkDomains } = useStore();
  const [mode, setMode] = useState<'pick' | 'own'>('pick');
  const [picked, setPicked] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [status, setStatus] = useState<Record<string, DomainStatus>>({});
  const [checking, setChecking] = useState(false);
  const [search, setSearch] = useState('');
  const [searchMsg, setSearchMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [own, setOwn] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const company = state.business?.company ?? '';
  const suggested = useMemo(() => suggestDomains(company).map(d => d.name), [company]);
  const suggestions = useMemo(() => [...extra, ...suggested.filter(n => !extra.includes(n))], [extra, suggested]);

  // Look up the suggested names in the domain registries.
  useEffect(() => {
    if (!ok || !company) return;
    let stale = false;
    checkDomains(suggested)
      .then(r => !stale && setStatus(s => ({ ...s, ...r })))
      .catch(() => !stale && setStatus(s => ({ ...s, ...Object.fromEntries(suggested.map(n => [n, 'unknown' as const])) })));
    return () => {
      stale = true;
    };
  }, [ok, company, suggested, checkDomains]);

  if (!ok) return <Loading />;

  const plan = planById(state.subscription!.plan);
  const need = domainsFor(plan);
  const ownList = Array.from({ length: need }, (_, i) => own[i] ?? '');

  const toggle = (name: string) => {
    setError(null);
    setPicked(p => (p.includes(name) ? p.filter(x => x !== name) : p.length < need ? [...p, name] : p));
  };

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = search.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const full = name.includes('.') ? name : `${name}.com`;
    if (!DOMAIN_RE.test(full)) {
      setSearchMsg({ text: 'Use letters, numbers and hyphens, like getacme.com.', bad: true });
      return;
    }
    if (suggestions.includes(full)) {
      setSearchMsg({ text: `${full} is already in the list.`, bad: false });
      return;
    }
    setChecking(true);
    setSearchMsg({ text: `Checking ${full}…`, bad: false });
    let result: DomainStatus = 'unknown';
    try {
      result = (await checkDomains([full]))[full] ?? 'unknown';
    } catch {}
    setChecking(false);
    if (result === 'taken') {
      setSearchMsg({ text: `${full} is taken. Try another.`, bad: true });
      return;
    }
    setStatus(s => ({ ...s, [full]: result }));
    setExtra(x => [full, ...x]);
    const pick = picked.length < need;
    setSearchMsg({
      text:
        result === 'available'
          ? `${full} is available${pick ? ' and picked' : ''}.`
          : `We couldn't confirm ${full} right now. ${pick ? "It's picked, and w" : 'W'}e'll check it before buying.`,
      bad: false,
    });
    if (pick) setPicked(p => [...p, full]);
    setSearch('');
  };

  const submit = async () => {
    let names: string[];
    if (mode === 'pick') {
      if (picked.some(n => status[n] === 'taken')) {
        setError('One of your picks has been taken. Choose another.');
        return;
      }
      if (picked.length !== need) {
        setError(`Pick ${need} domains. You have ${picked.length}.`);
        return;
      }
      names = picked;
    } else {
      names = ownList.map(d => d.trim().toLowerCase());
      const bad = names.findIndex(d => !DOMAIN_RE.test(d));
      if (bad >= 0) {
        setError(`Domain ${bad + 1} doesn't look right. Use the format yourdomain.com.`);
        return;
      }
      if (new Set(names).size !== names.length) {
        setError('Each domain needs to be different.');
        return;
      }
    }
    setBusy(true);
    try {
      await chooseDomains(names, mode === 'own');
      router.push('/app/setup');
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <FlowShell
      step={3}
      aside={
        <div className="ui-card ui-card--soft ui-stack" style={{ '--gap': '12px' } as React.CSSProperties}>
          <span className="ui-label">Why separate domains?</span>
          <p>Never send cold email from your main domain. If something goes wrong, these take the hit, not the address your clients use.</p>
          <p className="ui-muted ui-small">Names that look like your brand get better replies. Domain costs are included in your plan.</p>
        </div>
      }
    >
      <div className="ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
        <h1 className="ui-h1">Pick your sending domains</h1>
        <p className="ui-sub">
          Your plan uses {need} domains. Choose from names based on {company || 'your company'}, or bring domains you already own.
        </p>
      </div>

      <div className="filters" role="group" aria-label="Domain source">
        <button type="button" aria-pressed={mode === 'pick'} onClick={() => (setMode('pick'), setError(null))}>
          Suggested names
        </button>
        <button type="button" aria-pressed={mode === 'own'} onClick={() => (setMode('own'), setError(null))}>
          Use my own
        </button>
      </div>

      {mode === 'pick' ? (
        <div className="ui-stack" style={{ '--gap': '18px' } as React.CSSProperties}>
          <form className="ui-field" onSubmit={check}>
            <label htmlFor="domain-search">Check a name</label>
            <div className="ui-row" style={{ flexWrap: 'nowrap' }}>
              <input id="domain-search" className="ui-input" placeholder="getacme.com" value={search} onChange={e => setSearch(e.target.value)} />
              <button type="submit" className="ui-btn ui-btn--ghost" disabled={checking}>
                {checking ? 'Checking…' : 'Check'}
              </button>
            </div>
            {searchMsg && (
              <span className={searchMsg.bad ? 'ui-error' : 'ui-hint'} role="status">
                {searchMsg.text}
              </span>
            )}
          </form>
          <div className="ui-between">
            <span className="ui-label">
              {picked.length} of {need} picked
            </span>
            {picked.length > 0 && (
              <button type="button" className="ui-link ui-small" onClick={() => setPicked([])}>
                Clear
              </button>
            )}
          </div>
          <div className="domain-list">
            {suggestions.map(name => {
              const st = status[name];
              const isPicked = picked.includes(name);
              return (
                <Choice
                  key={name}
                  type="checkbox"
                  name="domain"
                  value={name}
                  checked={isPicked}
                  disabled={!st || st === 'taken' || (!isPicked && picked.length >= need)}
                  onChange={toggle}
                  title={name}
                  desc={!st ? 'Checking…' : st === 'taken' ? 'Taken' : st === 'unknown' ? "We'll confirm before buying" : undefined}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="ui-stack" style={{ '--gap': '16px' } as React.CSSProperties}>
          {ownList.map((d, i) => (
            <Field key={i} id={`own-${i}`} label={`Domain ${i + 1}`}>
              <input
                id={`own-${i}`}
                className="ui-input"
                placeholder="youragency-mail.com"
                value={d}
                onChange={e => {
                  setError(null);
                  const next = [...ownList];
                  next[i] = e.target.value;
                  setOwn(next);
                }}
              />
            </Field>
          ))}
          <p className="ui-hint">
            After setup we&apos;ll show you one step: point each domain&apos;s nameservers to us. We handle every DNS record after that.
          </p>
        </div>
      )}

      {error && (
        <div className="ui-error" role="alert">
          {error}
        </div>
      )}
      <div className="flow__actions">
        <button type="button" className="ui-btn ui-btn--orange" onClick={submit} disabled={busy}>
          {busy ? 'Starting…' : 'Start setup'} {!busy && <span className="mono">→</span>}
        </button>
      </div>
    </FlowShell>
  );
}

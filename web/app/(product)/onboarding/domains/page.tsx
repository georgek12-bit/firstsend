'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FlowShell, Loading, useGuard } from '@/components/Flow';
import { Choice, Field } from '@/components/ui';
import { domainsFor, planById } from '@/lib/plans';
import { DOMAIN_RE, hash, suggestDomains } from '@/lib/sim';
import { useStore } from '@/lib/store';

export default function Domains() {
  const ok = useGuard('/onboarding/domains');
  const router = useRouter();
  const { state, chooseDomains } = useStore();
  const [mode, setMode] = useState<'pick' | 'own'>('pick');
  const [picked, setPicked] = useState<string[]>([]);
  const [extra, setExtra] = useState<{ name: string; taken: boolean }[]>([]);
  const [search, setSearch] = useState('');
  const [searchMsg, setSearchMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [own, setOwn] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const company = state.business?.company ?? '';
  const suggestions = useMemo(() => [...extra, ...suggestDomains(company)], [company, extra]);

  if (!ok) return <Loading />;

  const plan = planById(state.subscription!.plan);
  const need = domainsFor(plan);
  const ownList = Array.from({ length: need }, (_, i) => own[i] ?? '');

  const toggle = (name: string) => {
    setError(null);
    setPicked(p => (p.includes(name) ? p.filter(x => x !== name) : p.length < need ? [...p, name] : p));
  };

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    const name = search.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const full = name.includes('.') ? name : `${name}.com`;
    if (!DOMAIN_RE.test(full)) {
      setSearchMsg({ text: 'Use letters, numbers and hyphens, like getacme.com.', bad: true });
      return;
    }
    if (suggestions.some(s => s.name === full)) {
      setSearchMsg({ text: `${full} is already in the list.`, bad: false });
      return;
    }
    const taken = hash(full) % 4 === 0;
    setExtra(x => [{ name: full, taken }, ...x]);
    setSearchMsg(
      taken
        ? { text: `${full} is taken. Try another.`, bad: true }
        : { text: `${full} is available${picked.length < need ? ' and picked' : ''}.`, bad: false },
    );
    if (!taken && picked.length < need) setPicked(p => [...p, full]);
    setSearch('');
  };

  const submit = () => {
    if (mode === 'pick') {
      if (picked.length !== need) {
        setError(`Pick ${need} domains. You have ${picked.length}.`);
        return;
      }
      chooseDomains(picked, false);
    } else {
      const names = ownList.map(d => d.trim().toLowerCase());
      const bad = names.findIndex(d => !DOMAIN_RE.test(d));
      if (bad >= 0) {
        setError(`Domain ${bad + 1} doesn't look right. Use the format yourdomain.com.`);
        return;
      }
      if (new Set(names).size !== names.length) {
        setError('Each domain needs to be different.');
        return;
      }
      chooseDomains(names, true);
    }
    router.push('/app/setup');
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
              <button type="submit" className="ui-btn ui-btn--ghost">
                Check
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
            {suggestions.map(d => (
              <Choice
                key={d.name}
                type="checkbox"
                name="domain"
                value={d.name}
                checked={picked.includes(d.name)}
                disabled={d.taken || (!picked.includes(d.name) && picked.length >= need)}
                onChange={toggle}
                title={d.name}
                desc={d.taken ? 'Taken' : undefined}
              />
            ))}
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
        <button type="button" className="ui-btn ui-btn--orange" onClick={submit}>
          Start setup <span className="mono">→</span>
        </button>
      </div>
    </FlowShell>
  );
}

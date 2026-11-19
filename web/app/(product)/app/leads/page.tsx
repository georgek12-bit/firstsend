'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Field, ago, useToast } from '@/components/ui';
import { LEAD_AMOUNTS, LEAD_DAILY_LIMIT, LEAD_SENIORITY, LEAD_SIZES, type LeadFilters, type LeadRequest } from '@/lib/leads';
import { LIVE, getSupabase } from '@/lib/supabase';
import { useView } from '@/lib/view';

const n = (x: number) => x.toLocaleString('en-US');

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke('leads', { body: { action, ...body } });
  if (error) {
    let msg = error.message;
    try {
      msg = (await (error as { context?: Response }).context?.json())?.error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return data as T;
}

/** Chips plus a text box. With `options`, only values from the list can be added. */
function Tags({
  id,
  values,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  values: string[];
  onChange: (v: string[]) => void;
  options?: string[];
  placeholder: string;
}) {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const next = [...values];
    for (const p of parts) {
      const v = options ? options.find(o => o.toLowerCase() === p.toLowerCase()) : p;
      if (v && !next.some(x => x.toLowerCase() === v.toLowerCase())) next.push(v);
    }
    if (next.length !== values.length) onChange(next);
    setText('');
  };
  return (
    <div className="tags">
      {!!values.length && (
        <ul className="tags__list">
          {values.map(v => (
            <li key={v}>
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter(x => x !== v))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        className="ui-input"
        value={text}
        placeholder={placeholder}
        list={options ? `${id}-list` : undefined}
        autoComplete="off"
        onChange={e => {
          const v = e.target.value;
          // Picking from the dropdown fills the box with an exact option: add it straight away.
          if (options?.includes(v)) add(v);
          else if (!options && v.endsWith(',')) add(v);
          else setText(v);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(text);
          } else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={() => !options && text && add(text)}
      />
      {options && (
        <datalist id={`${id}-list`}>
          {options.map(o => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </div>
  );
}

function Toggles({ values, options, onChange, label }: { values: string[]; options: { v: string; l: string }[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="filters" role="group" aria-label={label}>
      {options.map(o => {
        const on = values.includes(o.v);
        return (
          <button key={o.v} type="button" aria-pressed={on} onClick={() => onChange(on ? values.filter(x => x !== o.v) : [...values, o.v])}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

const EMPTY: LeadFilters = { job_titles: [], exclude_job_titles: [], seniority: [], industries: [], countries: [], company_size: [] };

export default function Leads() {
  const { now } = useView();
  const [toast, show] = useToast();
  const [f, setF] = useState<LeadFilters>(EMPTY);
  const [amount, setAmount] = useState<number>(500);
  const [opts, setOpts] = useState<{ industries: string[]; countries: string[] }>({ industries: [], countries: [] });
  const [count, setCount] = useState<{ total: number; atLeast: boolean } | null>(null);
  const [counting, setCounting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<LeadRequest[]>([]);
  const [usage, setUsage] = useState({ used: 0, limit: LEAD_DAILY_LIMIT });

  const set = <K extends keyof LeadFilters>(k: K, v: LeadFilters[K]) => setF(p => ({ ...p, [k]: v }));
  const enough = !!(f.job_titles.length || f.seniority.length || f.industries.length);
  const left = Math.max(0, usage.limit - usage.used);
  const key = useMemo(() => JSON.stringify(f), [f]);

  const load = useCallback(async () => {
    const { data } = await getSupabase().from('lead_requests').select('*').order('created_at', { ascending: false }).limit(25);
    setHistory((data ?? []) as LeadRequest[]);
    try {
      setUsage(await call('usage'));
    } catch {}
  }, []);

  useEffect(() => {
    if (!LIVE) return;
    load();
    call<typeof opts>('options').then(setOpts, () => {});
  }, [load]);

  // Live match count, a moment after the filters stop changing. Counting is free.
  useEffect(() => {
    if (!LIVE || !enough) {
      setCount(null);
      return;
    }
    setCounting(true);
    const t = setTimeout(async () => {
      try {
        setCount(await call('count', { filters: JSON.parse(key) }));
        setErr(null);
      } catch (e) {
        setCount(null);
        setErr((e as Error).message);
      } finally {
        setCounting(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [key, enough]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enough) return setErr('Add a job title, seniority or industry first.');
    setBusy(true);
    setErr(null);
    try {
      const { request } = await call<{ request: LeadRequest }>('create', { filters: f, n: Math.min(amount, left) });
      await load();
      if (request.rows) {
        show(`${n(request.rows)} leads ready.`);
        download(request.id);
      } else setErr(request.error ?? 'No new leads matched.');
    } catch (e) {
      setErr((e as Error).message);
      load();
    } finally {
      setBusy(false);
    }
  };

  const download = async (id: string) => {
    try {
      const { url } = await call<{ url: string }>('download', { id });
      window.location.href = url;
    } catch (e) {
      show((e as Error).message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Leads</span>
          <h1 className="ui-h1">Free leads, ready to send.</h1>
          <p className="ui-sub">Describe your buyers and get a list with verified work emails. No credits, no extra cost.</p>
        </div>
      </div>

      {!LIVE ? (
        <div className="ui-card ui-card--soft">
          <p>Lead search works on the live site once you&apos;re signed in.</p>
        </div>
      ) : (
        <div className="cols">
          <form className="ui-card ui-stack" style={{ '--gap': '20px' } as React.CSSProperties} onSubmit={submit} noValidate>
            <Field id="titles" label="Job titles" hint="Press Enter after each one. Whole words match, so Founder finds Co-Founder too.">
              <Tags id="titles" values={f.job_titles} onChange={v => set('job_titles', v)} placeholder="e.g. Founder, Head of Sales" />
            </Field>

            <fieldset className="ui-fieldset">
              <legend className="ui-legend">Seniority</legend>
              <Toggles label="Seniority" values={f.seniority} options={LEAD_SENIORITY} onChange={v => set('seniority', v)} />
            </fieldset>

            <Field id="industries" label="Industries" hint={opts.industries.length ? 'Start typing and pick from the list.' : 'Loading the list…'}>
              <Tags id="industries" values={f.industries} options={opts.industries} onChange={v => set('industries', v)} placeholder="e.g. Software Development" />
            </Field>

            <fieldset className="ui-fieldset">
              <legend className="ui-legend">Company size (staff)</legend>
              <Toggles label="Company size" values={f.company_size} options={LEAD_SIZES.map(s => ({ v: s, l: s.replace(' to ', '–') }))} onChange={v => set('company_size', v)} />
            </fieldset>

            <Field id="countries" label="Where they live" hint="Leave empty for anywhere.">
              <Tags id="countries" values={f.countries} options={opts.countries} onChange={v => set('countries', v)} placeholder="e.g. United Kingdom" />
            </Field>

            <Field id="exclude" label="Leave out titles (optional)">
              <Tags id="exclude" values={f.exclude_job_titles} onChange={v => set('exclude_job_titles', v)} placeholder="e.g. Intern, Assistant" />
            </Field>

            <fieldset className="ui-fieldset">
              <legend className="ui-legend">How many</legend>
              <div className="filters" role="group" aria-label="How many leads">
                {LEAD_AMOUNTS.map(a => (
                  <button key={a} type="button" aria-pressed={amount === a} disabled={a > left && left > 0 && a !== LEAD_AMOUNTS[0]} onClick={() => setAmount(a)}>
                    {n(a)}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="leads-count" aria-live="polite">
              {!enough ? (
                <span className="ui-muted">Add a title, seniority or industry to see how many match.</span>
              ) : counting ? (
                <span className="ui-muted">Counting…</span>
              ) : count ? (
                <span>
                  <strong>
                    {n(count.total)}
                    {count.atLeast ? '+' : ''}
                  </strong>{' '}
                  people match with a verified email.
                </span>
              ) : null}
            </div>

            {err && (
              <p className="ui-error" role="alert">
                {err}
              </p>
            )}

            <button type="submit" className="ui-btn ui-btn--orange" disabled={busy || !enough || left === 0 || count?.total === 0}>
              {busy ? 'Building your list… (up to a minute)' : left === 0 ? 'Daily limit reached' : `Get ${n(Math.min(amount, left))} leads`}
            </button>
          </form>

          <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
            <div className="ui-card ui-card--soft ui-stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <span className="ui-label">Today</span>
              <p style={{ fontSize: 18 }}>
                {n(usage.used)} of {n(usage.limit)} leads used. {left ? `${n(left)} left.` : 'More unlock tomorrow.'}
              </p>
              <div className="ui-progress" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
              </div>
              <p className="ui-small ui-muted">
                Every lead has a verified work email, at most 3 per company. You never get the same person twice.
              </p>
            </div>

            <div className="ui-card ui-card--soft ui-stack" style={{ '--gap': '12px' } as React.CSSProperties}>
              <span className="ui-label">Your lists</span>
              {!history.length ? (
                <p className="ui-muted">Lists you build show up here.</p>
              ) : (
                <ul className="leads-history">
                  {history.map(r => (
                    <li key={r.id}>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate">{r.summary || 'Lead list'}</div>
                        <div className="ui-small ui-muted">
                          {r.status === 'running'
                            ? 'Building…'
                            : r.status === 'failed'
                              ? r.error ?? 'Failed'
                              : `${n(r.rows)} leads${r.skipped ? ` · ${n(r.skipped)} repeats left out` : ''}`}{' '}
                          · {ago(new Date(r.created_at).getTime(), now)}
                        </div>
                      </div>
                      {r.status === 'ready' && r.rows > 0 && (
                        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => download(r.id)}>
                          CSV
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      {toast}
    </>
  );
}

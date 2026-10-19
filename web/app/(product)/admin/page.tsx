'use client';

// Fulfilment console for admins (profiles.is_admin). Live mode only.
// Every change goes through an admin_* database function.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Loading } from '@/components/Flow';
import LogoMark from '@/components/LogoMark';
import { STATUS_LABEL, ago, date, money, useToast } from '@/components/ui';
import { BRAND } from '@/lib/content';
import { inboxesFor, planById, type PlanId } from '@/lib/plans';
import { sequencerName } from '@/lib/sequencers';
import { SETUP_STEPS } from '@/lib/sim';
import { errorText, useStore } from '@/lib/store';
import { readProviderFile } from '@/lib/providerCsv';
import { getSupabase } from '@/lib/supabase';
import type { InboxStatus, SetupStage } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

type Customer = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  sub: Row | null;
  biz: Row | null;
  domains: Row[];
  inboxes: Row[];
  openReplacements: Row[];
  target: number;
  needs: string[];
};

const STAGES: { id: SetupStage; label: string }[] = [
  { id: 'queued', label: 'Queued' },
  ...SETUP_STEPS.map(s => ({ id: s.key as SetupStage, label: s.label })),
  { id: 'ready', label: 'Ready to send' },
];

const INBOX_STATUSES: InboxStatus[] = ['warming', 'good', 'watch', 'burned', 'replacing'];

function useAdminData() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const load = useCallback(async () => {
    const sb = getSupabase();
    const [p, s, b, d, i, r] = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('subscriptions').select('*'),
      sb.from('businesses').select('*'),
      sb.from('domains').select('*').order('created_at'),
      sb.from('inboxes').select('*, inbox_logins(inbox_id)').order('addr'),
      sb.from('replacements').select('*').is('done_at', null).order('requested_at'),
    ]);
    const by = (rows: Row[] | null) => {
      const m = new Map<string, Row[]>();
      for (const x of rows ?? []) m.set(x.user_id, [...(m.get(x.user_id) ?? []), x]);
      return m;
    };
    const subs = by(s.data), bizs = by(b.data), doms = by(d.data), inbs = by(i.data), reps = by(r.data);
    setCustomers(
      (p.data ?? [])
        // Admins only show up if they have a plan of their own (e.g. a test order).
        .filter(x => !x.is_admin || subs.has(x.id))
        .map(x => {
          const sub = subs.get(x.id)?.[0] ?? null;
          const inboxes = inbs.get(x.id) ?? [];
          const domains = doms.get(x.id) ?? [];
          const openReplacements = reps.get(x.id) ?? [];
          const target = sub ? inboxesFor(planById(sub.plan as PlanId)) : 0;
          const needs: string[] = [];
          if (sub && domains.length && sub.setup_stage !== 'ready') needs.push('Setup');
          if (sub?.setup_stage === 'ready' && inboxes.length < target) needs.push('More inboxes');
          if (openReplacements.length) needs.push(`${openReplacements.length} replacement${openReplacements.length > 1 ? 's' : ''}`);
          if (inboxes.some(b => b.status === 'burned')) needs.push('Burned inbox');
          if (inboxes.some(b => !b.inbox_logins && b.status !== 'burned')) needs.push('Missing logins');
          return {
            id: x.id,
            name: x.name,
            email: x.email,
            createdAt: x.created_at,
            sub,
            biz: bizs.get(x.id)?.[0] ?? null,
            domains,
            inboxes,
            openReplacements,
            target,
            needs,
          };
        }),
    );
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { customers, load };
}

function CustomerDetail({ c, reload, show }: { c: Customer; reload: () => Promise<void>; show: (m: string) => void }) {
  const [addrs, setAddrs] = useState('');
  const [file, setFile] = useState('');
  const [newDomains, setNewDomains] = useState('');
  const [newAddr, setNewAddr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const run = async (fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      const { error } = await getSupabase().rpc(fn, args);
      if (error) throw new Error(error.message);
      await reload();
      show(ok);
      return true;
    } catch (err) {
      show(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const importFile = async () => {
    let rows;
    try {
      rows = readProviderFile(file);
    } catch (err) {
      show(errorText(err));
      return;
    }
    if (await run('admin_import_inboxes', { p_user: c.id, p_rows: rows }, `${rows.length} inboxes imported with logins.`)) setFile('');
  };

  const plan = c.sub ? planById(c.sub.plan) : null;
  const stage = c.sub?.setup_stage as SetupStage | null;
  const suggested = c.domains.flatMap(d => ['alex', 'sam', 'jo'].map(n => `${n}@${d.name}`)).slice(0, 3).join('\n');

  return (
    <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Customer</span>
          <h1 className="ui-h1">{c.biz?.company || c.name || c.email}</h1>
          <p className="ui-muted">
            {c.name} · {c.email} · joined {date(new Date(c.createdAt).getTime())}
          </p>
        </div>
      </div>

      <div className="cols">
        <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <section className="ui-card ui-stack" aria-labelledby="stage-h">
            <div className="ui-between">
              <h2 id="stage-h" className="ui-h2">
                Setup
              </h2>
              {plan && (
                <span className="ui-tag">
                  {plan.name} · {money(plan.price)}
                </span>
              )}
            </div>
            {!c.domains.length ? (
              <p className="ui-muted">Waiting for the customer to finish onboarding and pick domains.</p>
            ) : (
              <>
                <p className="ui-small ui-muted">Move this along as you work. The customer sees it on their setup page.</p>
                <div className="filters" role="group" aria-label="Setup stage">
                  {STAGES.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={stage === s.id}
                      disabled={busy}
                      onClick={() => run('admin_set_stage', { p_user: c.id, p_stage: s.id }, `Stage set to ${s.label}.`)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {stage === 'ready' || c.inboxes.length ? null : (
                  <p className="ui-small ui-muted">Add their inboxes below before setting Ready to send.</p>
                )}
              </>
            )}
          </section>

          {!!c.domains.length && (
            <section className="ui-card ui-stack" aria-labelledby="add-h">
              <div className="ui-between">
                <h2 id="add-h" className="ui-h2">
                  Inboxes
                </h2>
                <span className={`ui-tag${c.inboxes.length < c.target ? ' ui-tag--orange' : ''}`}>
                  {c.inboxes.length} / {c.target}
                </span>
              </div>
              <div className="ui-field">
                <span className="ui-legend">Import from the provider&apos;s file (adds inboxes and their logins)</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv"
                  className="ui-small"
                  aria-label="Provider file"
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) setFile(await f.text());
                    e.target.value = '';
                  }}
                />
                <textarea
                  className="ui-input mono"
                  rows={4}
                  placeholder="Or paste the rows here, straight from the spreadsheet"
                  value={file}
                  onChange={e => setFile(e.target.value)}
                />
              </div>
              <div>
                <button type="button" className="ui-btn ui-btn--sm" disabled={busy || !file.trim()} onClick={importFile}>
                  Import inboxes and logins
                </button>
              </div>
              <label className="ui-field">
                <span className="ui-legend">Or add addresses only, one per line (no logins yet)</span>
                <textarea
                  className="ui-input mono"
                  rows={5}
                  placeholder={suggested}
                  value={addrs}
                  onChange={e => setAddrs(e.target.value)}
                />
              </label>
              <div>
                <button
                  type="button"
                  className="ui-btn ui-btn--sm"
                  disabled={busy || !addrs.trim()}
                  onClick={async () => {
                    const list = addrs.split(/[\s,]+/).filter(Boolean);
                    if (await run('admin_add_inboxes', { p_user: c.id, p_addrs: list }, `${list.length} inboxes added.`)) setAddrs('');
                  }}
                >
                  Add inboxes
                </button>
              </div>
              {c.inboxes.length > 0 && (
                <div className="ui-table-wrap">
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th scope="col">Inbox</th>
                        <th scope="col">Login</th>
                        <th scope="col">Health</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.inboxes.map(b => (
                        <tr key={b.id}>
                          <td className="mono" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                            {b.addr}
                          </td>
                          <td className="ui-small">{b.inbox_logins ? 'Saved' : <span className="ui-error">Missing</span>}</td>
                          <td>
                            <select
                              className="ui-select"
                              style={{ minHeight: 34, padding: '4px 8px', fontSize: 14 }}
                              value={b.status}
                              disabled={busy}
                              aria-label={`Health of ${b.addr}`}
                              onChange={e => run('admin_set_inbox_status', { p_inbox: b.id, p_status: e.target.value }, `${b.addr}: ${STATUS_LABEL[e.target.value as InboxStatus]}.`)}
                            >
                              {INBOX_STATUSES.map(s => (
                                <option key={s} value={s}>
                                  {STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {c.openReplacements.length > 0 && (
            <section className="ui-card ui-stack" aria-labelledby="rep-h">
              <h2 id="rep-h" className="ui-h2">
                Replacements to do
              </h2>
              {c.openReplacements.map(r => (
                <div key={r.id} className="ui-stack" style={{ '--gap': '8px', borderTop: '1px solid var(--line-soft)', paddingTop: 12 } as React.CSSProperties}>
                  <div className="ui-small">
                    <span className="mono">{r.old_addr}</span>
                    <span className="ui-muted"> · requested {ago(new Date(r.requested_at).getTime(), Date.now())}</span>
                  </div>
                  <div className="ui-row" style={{ flexWrap: 'nowrap' }}>
                    <input
                      className="ui-input mono"
                      placeholder={`new address on ${r.old_addr.split('@')[1]}`}
                      aria-label="New inbox address"
                      value={newAddr[r.id] ?? ''}
                      onChange={e => setNewAddr(m => ({ ...m, [r.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="ui-btn ui-btn--sm"
                      disabled={busy || !newAddr[r.id]?.trim()}
                      onClick={() => run('admin_complete_replacement', { p_replacement: r.id, p_new_addr: newAddr[r.id] }, 'Replacement done.')}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
          <section className="ui-card ui-card--soft ui-stack" aria-labelledby="dom-h" style={{ '--gap': '10px' } as React.CSSProperties}>
            <h2 id="dom-h" className="ui-h3">
              Domains {c.domains.some(d => d.byod) && <span className="ui-tag">Their own</span>}
            </h2>
            {c.domains.length ? (
              c.domains.map(d => (
                <div key={d.id} className="mono ui-small" style={{ wordBreak: 'break-all' }}>
                  {d.name}
                </div>
              ))
            ) : (
              <p className="ui-small ui-muted">None yet.</p>
            )}
            {!!c.domains.length && (
              <div className="ui-row" style={{ flexWrap: 'nowrap', '--gap': '8px' } as React.CSSProperties}>
                <input className="ui-input mono" placeholder="add domains, comma separated" aria-label="Add domains" value={newDomains} onChange={e => setNewDomains(e.target.value)} />
                <button
                  type="button"
                  className="ui-btn ui-btn--sm ui-btn--ghost"
                  disabled={busy || !newDomains.trim()}
                  onClick={async () => {
                    if (await run('admin_add_domains', { p_user: c.id, p_names: newDomains.split(/[\s,]+/).filter(Boolean) }, 'Domains added.')) setNewDomains('');
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </section>

          <section className="ui-card ui-card--soft ui-stack" aria-labelledby="biz-h" style={{ '--gap': '6px' } as React.CSSProperties}>
            <h2 id="biz-h" className="ui-h3">
              Onboarding answers
            </h2>
            {c.biz ? (
              <dl className="ui-small" style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 14px' }}>
                <dt className="ui-muted">Website</dt>
                <dd style={{ margin: 0, wordBreak: 'break-all' }}>{c.biz.website}</dd>
                <dt className="ui-muted">Clients</dt>
                <dd style={{ margin: 0 }}>{c.biz.clients}</dd>
                <dt className="ui-muted">Use case</dt>
                <dd style={{ margin: 0 }}>{c.biz.use_case}</dd>
                <dt className="ui-muted">Leads</dt>
                <dd style={{ margin: 0 }}>{c.biz.lead_source}</dd>
                <dt className="ui-muted">Sequencer</dt>
                <dd style={{ margin: 0 }}>{sequencerName(c.biz.sequencer)}</dd>
                <dt className="ui-muted">Vetting</dt>
                <dd style={{ margin: 0 }}>{c.biz.vetting_result ?? 'pending'}</dd>
              </dl>
            ) : (
              <p className="ui-small ui-muted">Not answered yet.</p>
            )}
          </section>

          {c.sub && (
            <section className="ui-card ui-card--soft ui-stack" aria-labelledby="sub-h" style={{ '--gap': '6px' } as React.CSSProperties}>
              <h2 id="sub-h" className="ui-h3">
                Subscription
              </h2>
              <p className="ui-small">
                {c.sub.status} · renews {date(new Date(c.sub.renews_at).getTime())}
                {c.sub.pending_plan && ` · moving to ${planById(c.sub.pending_plan).name}`}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Admin() {
  const { ready, live, isAdmin, state } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get('u');
  const { customers, load } = useAdminData();
  const [filter, setFilter] = useState<'action' | 'all'>('action');
  const [toast, show] = useToast();

  useEffect(() => {
    if (ready && live && !state.account) router.replace('/login');
    else if (ready && live && !isAdmin) router.replace('/app');
  }, [ready, live, isAdmin, state.account, router]);

  const list = useMemo(() => (customers ?? []).filter(c => filter === 'all' || c.needs.length), [customers, filter]);
  const current = customers?.find(c => c.id === selected);

  if (!live) {
    return (
      <div className="main">
        <h1 className="ui-h1">Admin</h1>
        <p className="ui-sub">The admin console works once the app is connected to Supabase.</p>
      </div>
    );
  }
  if (!ready || !isAdmin || !customers) return <Loading />;

  return (
    <div className="shell">
      <aside className="side">
        <div className="side__brand">
          <Link href="/admin">
            <LogoMark tone="cream" />
            {BRAND}
          </Link>
          <span className="ui-tag" style={{ borderColor: 'var(--ink-line)' }}>
            Admin
          </span>
        </div>
        <div className="filters" role="group" aria-label="Show">
          <button type="button" aria-pressed={filter === 'action'} onClick={() => setFilter('action')} style={{ color: 'inherit' }}>
            Needs action
          </button>
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} style={{ color: 'inherit' }}>
            All ({customers.length})
          </button>
        </div>
        <nav className="side__nav" aria-label="Customers" style={{ overflowY: 'auto' }}>
          {list.map(c => (
            <Link key={c.id} href={`/admin?u=${c.id}`} aria-current={c.id === selected ? 'page' : undefined} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span className="truncate" style={{ maxWidth: '100%' }}>
                {c.biz?.company || c.name || c.email}
              </span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{c.needs.join(' · ') || (c.sub ? 'All good' : 'No plan yet')}</span>
            </Link>
          ))}
          {!list.length && <span style={{ padding: 12, opacity: 0.7 }}>Nothing needs doing.</span>}
        </nav>
        <div className="side__foot">
          <Link href="/app" className="ui-btn ui-btn--ghost ui-btn--sm">
            Back to my app
          </Link>
        </div>
      </aside>
      <main className="main">
        {current ? (
          <CustomerDetail c={current} reload={load} show={show} />
        ) : (
          <div className="ui-stack">
            <h1 className="ui-h1">Orders</h1>
            <p className="ui-sub">Pick a customer on the left. “Needs action” lists anyone waiting on setup, extra inboxes or a replacement.</p>
            <div className="kpis">
              <div className="kpi">
                <span className="ui-label">Customers</span>
                <span className="kpi__value">{customers.filter(c => c.sub).length}</span>
              </div>
              <div className="kpi">
                <span className="ui-label">Waiting on setup</span>
                <span className="kpi__value">{customers.filter(c => c.needs.includes('Setup')).length}</span>
              </div>
              <div className="kpi">
                <span className="ui-label">Open replacements</span>
                <span className="kpi__value">{customers.reduce((n, c) => n + c.openReplacements.length, 0)}</span>
              </div>
              <div className="kpi">
                <span className="ui-label">Monthly revenue</span>
                <span className="kpi__value">
                  {money(customers.filter(c => c.sub?.status === 'active').reduce((n, c) => n + planById(c.sub!.plan).price, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
      {toast}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Admin />
    </Suspense>
  );
}

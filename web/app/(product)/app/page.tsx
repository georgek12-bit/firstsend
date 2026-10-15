'use client';

import Link from 'next/link';
import { StatusPill, ago, date } from '@/components/ui';
import { STARTER_CAP_DAYS, fmt } from '@/lib/plans';
import { sequencerName } from '@/lib/sequencers';
import { DAY, SETUP_MS, SETUP_STEPS } from '@/lib/sim';
import type { InboxStatus } from '@/lib/types';
import { useView } from '@/lib/view';

const ORDER: InboxStatus[] = ['burned', 'replacing', 'watch', 'warming', 'good'];
const BAR: Record<InboxStatus, string> = {
  good: 'var(--good)',
  warming: 'var(--warn)',
  watch: 'var(--warn)',
  burned: 'var(--bad)',
  replacing: 'var(--line)',
};

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

export default function Dashboard() {
  const { state, now, sub, plan, progress, counts, total, cap, fullCap, sent, ready, firstName } = useView();
  const capRisesAt = state.account!.createdAt + STARTER_CAP_DAYS * DAY;
  const sorted = [...state.inboxes].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const preview = sorted.slice(0, 6);
  const connection = state.connections[0];
  const preferred = state.business?.sequencer ?? 'other';

  let headline: { dot: string; text: string };
  if (!ready) headline = { dot: 'var(--warn)', text: `Setting up. About ${Math.max(1, Math.ceil((SETUP_MS - progress.elapsed) / 1000))}s left.` };
  else if (counts.burned) headline = { dot: 'var(--bad)', text: `${counts.burned} inbox${counts.burned > 1 ? 'es' : ''} burned. Replace free in one click.` };
  else if (counts.good === 0) headline = { dot: 'var(--warn)', text: 'Inboxes are warming up. Almost there.' };
  else headline = { dot: 'var(--good)', text: "You're good to send." };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Dashboard</span>
          <h1 className="ui-h1">
            {greeting(now)}, {firstName}.
          </h1>
          <p className="ui-row" style={{ '--gap': '10px', fontSize: 18, flexWrap: 'nowrap', alignItems: 'baseline' } as React.CSSProperties}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: headline.dot, flex: 'none', transform: 'translateY(-1px)' }} aria-hidden="true" />
            {headline.text}
          </p>
        </div>
        <Link href="/app/kit" className="ui-btn ui-btn--ghost">
          Open launch kit
        </Link>
      </div>

      {sub.status === 'canceled' && (
        <div className="ui-banner ui-banner--warn">
          <span>Your plan is canceled. Inboxes keep sending until {date(sub.renewsAt)}.</span>
          <Link href="/app/billing" className="ui-btn ui-btn--sm">
            Keep my plan
          </Link>
        </div>
      )}
      {counts.burned > 0 && (
        <div className="ui-banner ui-banner--bad">
          <span>
            <b>Burned inbox guarantee:</b> we&apos;ll swap {counts.burned > 1 ? 'these' : 'it'} for a fresh inbox at no cost.
          </span>
          <Link href="/app/inboxes?filter=attention" className="ui-btn ui-btn--sm ui-btn--danger">
            Review and replace
          </Link>
        </div>
      )}

      <div className="kpis">
        <div className="kpi">
          <span className="ui-label">Sent today</span>
          <span className="kpi__value">
            {fmt(sent)}
            <small>/ {fmt(cap)}</small>
          </span>
        </div>
        <div className="kpi">
          <span className="ui-label">Inbox health</span>
          <span className="kpi__value">
            {counts.good}
            <small>of {total || '…'} good to send</small>
          </span>
        </div>
        <div className="kpi">
          <span className="ui-label">Daily limit</span>
          <span className="kpi__value">
            {fmt(cap)}
            <small>{cap < fullCap ? `rises to ${fmt(fullCap)} on ${date(capRisesAt)}` : 'full volume'}</small>
          </span>
        </div>
        <div className="kpi">
          <span className="ui-label">Setup</span>
          <span className="kpi__value">
            {ready ? 'Done' : `${Math.round(progress.pct * 100)}%`}
            <small>{state.domains!.names.length} domains</small>
          </span>
        </div>
      </div>

      <div className="cols">
        <section className="ui-card ui-stack" aria-labelledby="inboxes-h" style={{ '--gap': '16px' } as React.CSSProperties}>
          <div className="ui-between">
            <h2 id="inboxes-h" className="ui-h2">
              Inboxes
            </h2>
            <Link href="/app/inboxes" className="ui-link ui-small">
              View all {total || ''}
            </Link>
          </div>
          {total ? (
            <>
              <div className="health-bar" role="img" aria-label={`${counts.good} good, ${counts.warming} warming, ${counts.watch} on watch, ${counts.burned} burned, ${counts.replacing} being replaced`}>
                {ORDER.slice()
                  .reverse()
                  .map(s => (counts[s] ? <span key={s} style={{ flex: counts[s], background: BAR[s] }} /> : null))}
              </div>
              <div>
                {preview.map(b => (
                  <div key={b.id} className="inbox-row">
                    <span className="truncate mono" style={{ fontSize: 13 }}>
                      {b.addr}
                    </span>
                    <StatusPill status={b.status} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">Your inboxes appear here when setup finishes.</div>
          )}
        </section>

        <div className="ui-stack">
          {!ready && (
            <section className="ui-card ui-card--shadow ui-stack" aria-labelledby="setup-h" style={{ '--gap': '14px' } as React.CSSProperties}>
              <div className="ui-between">
                <h2 id="setup-h" className="ui-h2">
                  Setup
                </h2>
                <span className="ui-label">
                  Step {Math.min(progress.current + 1, SETUP_STEPS.length)} of {SETUP_STEPS.length}
                </span>
              </div>
              <div className="ui-progress" aria-hidden="true">
                <span style={{ width: `${progress.pct * 100}%` }} />
              </div>
              <p>{SETUP_STEPS[Math.max(0, Math.min(progress.current, SETUP_STEPS.length - 1))].label}…</p>
              <div>
                <Link href="/app/setup" className="ui-link ui-small">
                  See setup progress
                </Link>
              </div>
            </section>
          )}

          <section className="ui-card ui-card--ink ui-stack" aria-labelledby="seq-h" style={{ '--gap': '12px' } as React.CSSProperties}>
            <span className="ui-label" style={{ color: 'inherit', opacity: 0.7 }} id="seq-h">
              Sequencer
            </span>
            {connection ? (
              <>
                <p style={{ fontSize: 18 }}>
                  Connected to <b>{sequencerName(connection.sequencer)}</b>
                </p>
                <p className="ui-small" style={{ opacity: 0.7 }}>
                  {connection.inboxes} inboxes exported {ago(connection.at, now)}.
                </p>
                <div>
                  <Link href="/app/inboxes?export=1" className="ui-btn ui-btn--ghost ui-btn--sm" style={{ color: 'var(--cream)', borderColor: 'var(--ink-line)' }}>
                    Export again
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 18 }}>
                  {ready ? `Send your inboxes to ${sequencerName(preferred)}.` : 'Connect once setup is done.'}
                </p>
                <div>
                  <Link href="/app/inboxes?export=1" className="ui-btn ui-btn--orange ui-btn--sm" aria-disabled={!ready}>
                    Connect sequencer
                  </Link>
                </div>
              </>
            )}
          </section>

          <section className="ui-card ui-card--soft ui-stack" aria-labelledby="rep-h" style={{ '--gap': '10px' } as React.CSSProperties}>
            <h2 id="rep-h" className="ui-h3">
              Recent replacements
            </h2>
            {state.replacements.length ? (
              state.replacements.slice(0, 4).map(r => (
                <div key={r.id} className="ui-small" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                  <span className="mono">{r.oldAddr}</span>
                  <span className="ui-muted">
                    {' '}
                    {r.doneAt ? <>→ <span className="mono">{r.newAddr}</span></> : '· replacing now'} · {ago(r.requestedAt, now)}
                  </span>
                </div>
              ))
            ) : (
              <p className="ui-small ui-muted">None yet. If an inbox burns, you replace it here for free.</p>
            )}
          </section>
        </div>
      </div>

      <p className="ui-small ui-muted">
        {plan.name} plan · {fmt(plan.perDay)} emails a day · renews {date(sub.renewsAt)}
      </p>
    </>
  );
}

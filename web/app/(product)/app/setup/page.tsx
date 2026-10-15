'use client';

import Link from 'next/link';
import { SETUP_MS, SETUP_STEPS } from '@/lib/sim';
import { useView } from '@/lib/view';

export default function Setup() {
  const { state, progress, ready, total, plan, live } = useView();
  const left = Math.max(0, Math.ceil((SETUP_MS - progress.elapsed) / 1000));
  const byod = state.domains?.byod;

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Setup</span>
          <h1 className="ui-h1">{ready ? "You're set up." : 'Setting everything up'}</h1>
          <p className="ui-sub">
            {ready
              ? `${total} inboxes across ${state.domains!.names.length} domains are warming up. Connect your sequencer next.`
              : live
                ? "Sit back. You don't need to do anything. We'll email you the moment you're ready to send, usually the same day."
                : "Sit back. You don't need to do anything. You can leave this page and come back."}
          </p>
        </div>
      </div>

      <div className="cols">
        <section className="ui-card ui-card--shadow ui-stack" aria-labelledby="progress-h" style={{ '--gap': '18px' } as React.CSSProperties}>
          <div className="ui-between">
            <h2 id="progress-h" className="ui-h2">
              {ready ? 'All done' : `${Math.round(progress.pct * 100)}% done`}
            </h2>
            <span className="ui-label ui-num">{ready ? 'Ready' : live ? 'Usually same day' : `About ${left}s left (demo speed)`}</span>
          </div>
          <div className="ui-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.pct * 100)} aria-label="Setup progress">
            <span style={{ width: `${progress.pct * 100}%` }} />
          </div>
          <ol className="steps">
            {SETUP_STEPS.map((s, i) => {
              const done = i < progress.current || progress.done;
              const active = i === progress.current && !progress.done;
              return (
                <li key={s.key} className={done ? 'is-done' : active ? 'is-active' : undefined} aria-current={active ? 'step' : undefined}>
                  <span className="steps__mark">{done ? '✓' : i + 1}</span>
                  <div>
                    <div className="steps__title">{s.label}</div>
                    <div className="ui-small ui-muted">{s.detail}</div>
                  </div>
                  <span className="ui-small ui-muted">{done ? 'Done' : active ? 'Working…' : progress.current < 0 && i === 0 ? 'In the queue' : 'Waiting'}</span>
                </li>
              );
            })}
          </ol>
          {ready && (
            <div className="ui-row">
              <Link href="/app/inboxes?export=1" className="ui-btn ui-btn--orange">
                Connect your sequencer <span className="mono">→</span>
              </Link>
              <Link href="/app" className="ui-btn ui-btn--ghost">
                Go to dashboard
              </Link>
            </div>
          )}
        </section>

        <aside className="ui-stack">
          <div className="ui-card ui-card--soft ui-stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <span className="ui-label">Your domains</span>
            <ul className="ui-stack" style={{ '--gap': '6px', listStyle: 'none', margin: 0, padding: 0 } as React.CSSProperties}>
              {state.domains!.names.map(d => (
                <li key={d} className="mono ui-small" style={{ wordBreak: 'break-all' }}>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          {byod && (
            <div className="ui-card ui-stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <span className="ui-label">One step for you</span>
              <p>At your domain registrar, change the nameservers for each domain to:</p>
              <code className="mono ui-small" style={{ background: 'var(--cream)', padding: 10, border: '1px solid var(--line)' }}>
                ns1.firstsend-dns.com
                <br />
                ns2.firstsend-dns.com
              </code>
              <p className="ui-small ui-muted">We pick it up automatically. It can take up to an hour.</p>
            </div>
          )}
          <div className="ui-card ui-card--ink ui-stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <span className="ui-label" style={{ color: 'inherit', opacity: 0.7 }}>
              While you wait
            </span>
            <p>Your launch kit is already unlocked: copy templates, a warmup guide and a starter lead list for {plan.name}.</p>
            <div>
              <Link href="/app/kit" className="ui-btn ui-btn--orange ui-btn--sm">
                Open launch kit
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

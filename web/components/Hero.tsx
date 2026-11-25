import Link from 'next/link';
import { dashHours, dashInboxes, dashStats, HEALTH } from '@/lib/content';
import { reveal } from '@/lib/reveal';
import LogoMark from './LogoMark';

// Chart scale: a little headroom above the busiest hour.
const peak = 180;

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero__head">
        <h1 className="hero__title" {...reveal('12px')}>
          Cold email inboxes, ready to send today
        </h1>
        <p className="hero__sub" {...reveal('12px', 60)}>
          Start at 800 emails a day, not 400 inboxes. We set up the domains, inboxes and warmup, and you get unlimited
          verified leads to send to. No sales call.
        </p>
        <div className="hero__buttons" {...reveal('12px', 100)}>
          <Link href="/signup" className="btn btn--orange btn--lg">
            Start sending
          </Link>
          <a href="#volume" className="btn btn--ghost btn--lg">
            See pricing
          </a>
        </div>
      </div>

      <div className="hero__stage">
        <div className="dash" {...reveal('12px', 120)}>
          <div className="dash__bar">
            <div className="dash__crumb">
              <LogoMark size="sm" />
              <b>Acme Outbound</b>
              <span>/ Dashboard</span>
            </div>
            <span className="dash__btn">Open launch kit</span>
          </div>
          <div className="dash__body">
            <div className="dash__head">
              <div>
                <div className="dash__title">Today</div>
                <div className="dash__meta mono">Mon 2 Nov · 16 inboxes · 4 domains</div>
              </div>
              <span className="dash__state">
                <span className="dot dot--8" style={{ background: HEALTH.green }} />
                Good to send
              </span>
            </div>

            <div className="dash__stats">
              {dashStats.map((d, i) => (
                <div key={d.label} className="dash__stat">
                  <span className="label">{d.label}</span>
                  <span className="dash__value">
                    {d.value} <span>{d.sub}</span>
                  </span>
                  {i === 0 && (
                    <span className="dash__progress" aria-hidden="true">
                      <span style={{ width: '74%' }} />
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="dash__grid">
              <div className="dash__panel">
                <div className="dash__panel-head">
                  <span>Inboxes</span>
                  <span className="mono">Sent today</span>
                </div>
                {dashInboxes.map(i => (
                  <div key={i.addr} className="inbox-row">
                    <div className="inbox-row__addr">
                      <span className="dot dot--8" style={{ background: i.dot }} />
                      <span className="truncate mono">{i.addr}</span>
                    </div>
                    <span className="inbox-row__status">{i.status}</span>
                    <span className="inbox-row__sent mono">{i.sent}</span>
                  </div>
                ))}
              </div>

              <div className="dash__panel">
                <div className="dash__panel-head">
                  <span>Sent by hour</span>
                  <span className="mono">1,184 so far</span>
                </div>
                <div className="hours" aria-hidden="true">
                  {dashHours.map((h, i) => (
                    <div key={h.h} className={`hours__col${i === dashHours.length - 1 ? ' is-now' : ''}`}>
                      <div className="hours__bar" style={{ height: `${(h.n / peak) * 100}%` }} />
                      <span className="mono">{h.h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

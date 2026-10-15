import { dashInboxes, dashStats } from '@/lib/content';
import { reveal } from '@/lib/reveal';
import LogoMark from './LogoMark';

export default function Hero() {
  return (
    <section className="hero">
      <div className="eyebrow hero__eyebrow" {...reveal('12px')}>
        Cold email infrastructure for new agencies
      </div>
      <h1 className="hero__title">
        <span className="hero__line">
          <span {...reveal('105%', 80)}>Start small.</span>
        </span>
        <span className="hero__line hero__line--2">
          <span className="accent-italic" {...reveal('105%', 200)}>
            Send today.
          </span>
        </span>
      </h1>
      <div className="hero__row">
        <p className="hero__sub" {...reveal('16px', 340)}>
          Pick how many emails a day you want to send. We set up the inboxes, domains and warmup. You send the same day.
        </p>
        <div className="hero__cta" {...reveal('16px', 420)}>
          <a href="#volume" className="btn btn--orange btn--lg">
            Start sending <span className="mono">→</span>
          </a>
          <span className="hero__note">No sales call · No 400-inbox minimum</span>
        </div>
      </div>

      <div className="hero__stage">
        <div className="hero__band" />
        <div className="dash" {...reveal('80px', 480)}>
          <div className="dash__bar">
            <div className="dash__crumb">
              <LogoMark size="sm" />
              <b>Acme Outbound</b>
              <span>/ Dashboard</span>
            </div>
            <span className="dash__btn">Open launch kit</span>
          </div>
          <div className="dash__body">
            <div className="dash__greet">
              <span className="dot dot--10" style={{ background: dashInboxes[0].dot }} />
              Morning, Alex. You&apos;re good to send.
            </div>
            <div className="dash__stats">
              {dashStats.map(d => (
                <div key={d.label} className="dash__stat">
                  <span className="label">{d.label}</span>
                  <span className="dash__value">
                    {d.value} <span>{d.sub}</span>
                  </span>
                </div>
              ))}
            </div>
            <div>
              {dashInboxes.map(i => (
                <div key={i.addr} className="inbox-row">
                  <div className="inbox-row__addr">
                    <span className="dot dot--8" style={{ background: i.dot }} />
                    <span className="truncate mono">{i.addr}</span>
                  </div>
                  <span className="inbox-row__status">{i.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="hero__tail" />
      </div>
    </section>
  );
}

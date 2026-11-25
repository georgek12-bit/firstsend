import { sequencers } from '@/lib/content';

export default function Marquee() {
  return (
    <section className="marquee" aria-label="Exports to Instantly, Smartlead, EmailBison, lemlist and Apollo">
      <div className="marquee__label">Pushes straight into</div>
      <div className="marquee__row" aria-hidden="true">
        {sequencers.map(l => (
          <div key={l.alt} className="marquee__item">
            <img src={l.src} alt="" style={{ height: l.h * 0.8, filter: l.invert ? 'invert(1)' : undefined }} />
            {l.label && <span>{l.label}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

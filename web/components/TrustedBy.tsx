import { trustLayouts } from '@/lib/content';
import { reveal } from '@/lib/reveal';

export default function TrustedBy() {
  return (
    <section className="trust" {...reveal('16px')}>
      <div className="trust__label">Trusted by</div>
      {/* One fixed row split per breakpoint; CSS shows the one that fits. */}
      {trustLayouts.map(layout => (
        <div key={layout.size} className={`trust__grid trust__grid--${layout.size}`}>
          {layout.rows.map((row, r) => (
            <div key={r} className="trust__row">
              {row.map(t => (
                <img key={t.name} src={t.src} alt={t.name} style={{ height: t.h }} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

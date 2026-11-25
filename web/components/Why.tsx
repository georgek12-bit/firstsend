import { BRAND, why } from '@/lib/content';
import { reveal } from '@/lib/reveal';
import SectionHead from './SectionHead';

export default function Why() {
  return (
    <section id="why" className="why">
      <SectionHead label={`Why ${BRAND}`} title="Made for agencies" muted="on their first clients" />
      <div className="why__grid">
        {why.map((w, i) => (
          <div key={w.title} className="why__card" {...reveal('12px', i * 60)}>
            <h3 className="why__title">{w.title}</h3>
            <p className="why__body">{w.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { reveal } from '@/lib/reveal';
import { stats } from '@/lib/content';

export default function Stats() {
  return (
    <section className="stats">
      <div className="stats__copy" {...reveal()}>
        <p className="sh__label">By the numbers</p>
        <h2 className="sh__title">
          Start small, <span className="sh__muted">send today</span>
        </h2>
      </div>
      <div className="stats__grid" {...reveal('12px', 60)}>
        {stats.map(s => (
          <div key={s.label} className="stat">
            <div className="stat__n">
              {s.to.toLocaleString('en-US')}
              {s.suf}
            </div>
            <div className="stat__label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

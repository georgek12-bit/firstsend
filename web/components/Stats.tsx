import { stats } from '@/lib/content';
import { reveal } from '@/lib/reveal';

export default function Stats() {
  return (
    <section className="stats" data-stats="1" {...reveal()}>
      <div className="shead">
        <div className="badge">By the numbers</div>
        <h2 className="h2">Built for your first campaign.</h2>
      </div>
      <div className="stats__grid">
        {stats.map(s => (
          <div key={s.label} className="stat">
            <div className="stat__n">
              <span data-count={s.to}>{s.to.toLocaleString('en-US')}</span>
              {s.suf}
            </div>
            <div className="stat__label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

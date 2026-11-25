import { healthRows } from '@/lib/content';
import { reveal } from '@/lib/reveal';

export default function Guarantee() {
  return (
    <section className="guarantee">
      <div className="guarantee__copy" {...reveal()}>
        <p className="sh__label">Burned inbox guarantee</p>
        <h2 className="sh__title">
          Inbox died? <span className="sh__muted">We replace it free</span>
        </h2>
        <p>We check every inbox&apos;s health for you. When one burns, you get a new one in a click. No ticket. No argument.</p>
      </div>
      <div className="health" {...reveal('12px', 80)}>
        <div className="health__head">
          <span>Inbox health</span>
          <span className="mono">Checked 4 min ago</span>
        </div>
        {healthRows.map(h => (
          <div key={h.addr} className="health__row">
            <div className="inbox-row__addr">
              <span className="dot dot--10" style={{ background: h.dot }} />
              <span className="truncate mono">{h.addr}</span>
            </div>
            <span className="health__status">{h.status}</span>
          </div>
        ))}
        <div className="health__btn">Replace burned inbox</div>
      </div>
    </section>
  );
}

import { healthRows } from '@/lib/content';
import { reveal } from '@/lib/reveal';

export default function Guarantee() {
  return (
    <section className="guarantee">
      <div className="guarantee__copy" {...reveal()}>
        <div className="kicker kicker--plain">04 / Burned inbox guarantee</div>
        <h2 className="h2 h2--huge">
          Inbox died? <span className="italic">We replace it free.</span>
        </h2>
        <p>We check every inbox&apos;s health for you. When one burns, you get a new one in a click. No ticket. No argument.</p>
      </div>
      <div className="health" {...reveal('40px', 120)}>
        <div className="health__head label">
          <span>Inbox health</span>
          <span>live</span>
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

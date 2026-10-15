'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SLIDER } from '@/lib/content';
import { PLANS, fmt, planFor } from '@/lib/plans';
import { reveal } from '@/lib/reveal';

const pos = (x: number) => (((x - SLIDER.min) / (SLIDER.max - SLIDER.min)) * 100).toFixed(2) + '%';

export default function Volume() {
  const [v, setV] = useState(SLIDER.initial);
  const [shown, setShown] = useState(planFor(SLIDER.initial).price);
  const shownRef = useRef(shown);
  const raf = useRef(0);
  const tier = planFor(v);

  // Animate the price toward the current tier's price whenever the tier changes.
  useEffect(() => {
    const to = tier.price;
    const from = shownRef.current;
    if (from === to) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownRef.current = to;
      setShown(to);
      return;
    }
    const t0 = performance.now();
    const d = 320;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / d);
      const e = 1 - Math.pow(1 - k, 3);
      shownRef.current = Math.round(from + (to - from) * e);
      setShown(shownRef.current);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [tier.price]);

  const pct = pos(v);

  return (
    <section id="volume" className="volume">
      <div className="volume__intro" {...reveal()}>
        <div className="kicker">01 / Pricing</div>
        <h2 className="h2 h2--xl">How many emails a day?</h2>
        <p className="lede">Start where you are. Move up when you land the next client. No 400-inbox minimum.</p>
      </div>

      <div className="card volume__card" {...reveal('24px', 100)}>
        <div className="volume__readout">
          <div>
            <div className="label label--mb">Emails a day</div>
            <div className="volume__count" aria-live="polite">
              {fmt(v)}
            </div>
          </div>
          <div className="volume__price-col">
            <div className="label label--mb">{tier.name} plan</div>
            <div className="volume__price">
              ${shown}
              <span>/mo</span>
            </div>
          </div>
        </div>

        <div className="slider">
          <div className="slider__track" />
          <div className="slider__fill" style={{ width: pct }} />
          {PLANS.slice(0, -1).map(t => (
            <div key={t.id} className="slider__tick" style={{ left: pos(t.perDay) }} />
          ))}
          <input
            type="range"
            min={SLIDER.min}
            max={SLIDER.max}
            step={SLIDER.step}
            value={v}
            onChange={e => setV(Number(e.target.value))}
            aria-label="Emails a day"
            aria-valuetext={`${fmt(v)} emails a day, ${tier.name} plan, $${tier.price} a month`}
          />
          <div className="slider__thumb" style={{ left: pct }} />
        </div>

        <div className="chips" style={{ gridTemplateColumns: `repeat(${PLANS.length}, minmax(0, 1fr))` }}>
          {PLANS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`chip${t === tier ? ' is-on' : ''}`}
              aria-pressed={t === tier}
              onClick={() => setV(t.perDay)}
            >
              <span className="mono">{fmt(t.perDay)}/day</span>
              <span className="chip__price">${t.price}</span>
            </button>
          ))}
        </div>

        <div className="volume__foot">
          <span>Launch kit and burned inbox guarantee on every plan.</span>
          <Link href={`/signup?plan=${tier.id}`} className="btn btn--ink btn--md">
            Start sending
          </Link>
        </div>
      </div>
    </section>
  );
}

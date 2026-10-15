import { sequencers } from '@/lib/content';

const COPIES = 6;

export default function Marquee() {
  return (
    <section className="marquee" aria-label="Exports to Instantly, Smartlead, EmailBison, lemlist and Apollo">
      <div className="marquee__label">Exports to</div>
      <div className="marquee__viewport">
        {/* Track is translated by -50%, so it holds an even number of copies. */}
        <div className="marquee__track" aria-hidden="true">
          {Array.from({ length: COPIES }, (_, c) =>
            sequencers.map(l => (
              <div key={`${c}-${l.alt}`} className="marquee__item">
                <img
                  src={l.src}
                  alt=""
                  style={{ height: l.h, filter: l.invert ? 'invert(1)' : undefined }}
                />
                {l.label && <span>{l.label}</span>}
              </div>
            )),
          )}
        </div>
      </div>
    </section>
  );
}

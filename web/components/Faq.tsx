'use client';

import { useState } from 'react';
import { faqs } from '@/lib/content';
import { reveal } from '@/lib/reveal';

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="faq">
      <div className="faq__head" {...reveal()}>
        <div className="kicker">06 / FAQ</div>
        <h2 className="h2 h2--faq">Fair questions.</h2>
      </div>
      <div className="faq__list" {...reveal('24px', 80)}>
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className={`faq__item${isOpen ? ' is-open' : ''}`}>
              <h3>
                <button
                  type="button"
                  className="faq__q"
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  id={`faq-q-${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span>{f.q}</span>
                  <span className="faq__icon" aria-hidden="true">
                    +
                  </span>
                </button>
              </h3>
              <div className="faq__a" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} inert={!isOpen}>
                <div>
                  <p>{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

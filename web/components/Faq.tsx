'use client';

import { useState } from 'react';
import { faqs } from '@/lib/content';
import { reveal } from '@/lib/reveal';
import SectionHead from './SectionHead';

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="faq">
      <SectionHead label="FAQ" title="Fair questions" />
      <div className="faq__list" {...reveal('12px', 60)}>
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
                  <svg className="faq__icon" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
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

'use client';

import { useEffect } from 'react';

/**
 * Fade-up-on-scroll for every [data-reveal] element, plus count-up for
 * [data-count] numbers inside a revealed [data-stats] block.
 * Elements whose reveal offset is a percentage are masked line reveals:
 * they are triggered by their (overflow:hidden) parent instead of themselves.
 */
export default function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('motion')) return;

    const rafs = new Set<number>();
    const countUp = (scope: Element) => {
      scope.querySelectorAll<HTMLElement>('[data-count]').forEach(el => {
        const to = Number(el.dataset.count);
        const t0 = performance.now();
        const d = 1100;
        const step = (now: number) => {
          const k = Math.min(1, (now - t0) / d);
          const e = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(to * e).toLocaleString('en-US');
          if (k < 1) rafs.add(requestAnimationFrame(step));
        };
        el.textContent = '0';
        rafs.add(requestAnimationFrame(step));
      });
    };

    const show = (el: HTMLElement) => {
      el.classList.add('is-in');
      if (el.dataset.stats) countUp(el);
    };

    const targets = new Map<Element, HTMLElement[]>();
    const io = new IntersectionObserver(
      entries =>
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          targets.get(e.target)?.forEach(show);
        }),
      { threshold: 0.12 },
    );

    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
      const masked = (el.dataset.reveal || '').endsWith('%');
      const trigger = masked && el.parentElement ? el.parentElement : el;
      if (!targets.has(trigger)) targets.set(trigger, []);
      targets.get(trigger)!.push(el);
      io.observe(trigger);
    });

    return () => {
      io.disconnect();
      rafs.forEach(cancelAnimationFrame);
    };
  }, []);

  return null;
}


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
    const fire = (t: Element) => {
      io.unobserve(t);
      targets.get(t)?.forEach(show);
      targets.delete(t);
    };
    // Start a little before an element scrolls into view.
    const io = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting && fire(e.target)), {
      rootMargin: '0px 0px 10% 0px',
      threshold: 0.05,
    });
    // A fast flick can jump an element from below the screen to above it between frames,
    // so the observer never sees it. Reveal anything that is already in view or scrolled past.
    let raf = 0;
    const sweep = () => {
      raf = 0;
      const bottom = window.innerHeight * 1.1;
      targets.forEach((_, t) => t.getBoundingClientRect().top < bottom && fire(t));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sweep);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
      const masked = (el.dataset.reveal || '').endsWith('%');
      const trigger = masked && el.parentElement ? el.parentElement : el;
      if (!targets.has(trigger)) targets.set(trigger, []);
      targets.get(trigger)!.push(el);
      io.observe(trigger);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      io.disconnect();
      rafs.forEach(cancelAnimationFrame);
    };
  }, []);

  return null;
}


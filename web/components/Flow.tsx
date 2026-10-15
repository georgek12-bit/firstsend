'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BRAND } from '@/lib/content';
import { nextRoute, useStore } from '@/lib/store';
import LogoMark from './LogoMark';

const STEPS = ['Account', 'Payment', 'Your business', 'Domains'];

/** Shared frame for sign-up, checkout and onboarding. */
export function FlowShell({ step, children, aside }: { step?: number; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flow">
      <header className="flow__top">
        <Link href="/" className="nav__brand">
          <LogoMark />
          {BRAND}
        </Link>
        {step != null && (
          <>
            <ol className="flow__steps" aria-label="Sign-up progress">
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? 'is-done' : undefined} aria-current={i === step ? 'step' : undefined}>
                  <span>{i < step ? '✓' : i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <span className="flow__mobile-step">
              Step {step + 1} of {STEPS.length}
            </span>
          </>
        )}
      </header>
      <div className="flow__body">
        <main className="flow__main">{children}</main>
        {aside && <aside className="flow__aside">{aside}</aside>}
      </div>
    </div>
  );
}

/**
 * Keeps people on the right step. Returns true once the stored state has loaded
 * and this page is where they should be.
 */
export function useGuard(route: string) {
  const { state, ready } = useStore();
  const router = useRouter();
  const target = nextRoute(state);
  // Everyone past onboarding may use any /app page, setup included.
  const allowed = route === '/app' ? target.startsWith('/app') : target === route;
  useEffect(() => {
    if (ready && !allowed) router.replace(target);
  }, [ready, allowed, target, router]);
  return ready && allowed;
}

export function Loading() {
  return (
    <div className="ui-muted" style={{ padding: 40 }} aria-busy="true">
      Loading…
    </div>
  );
}

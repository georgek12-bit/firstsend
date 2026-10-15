'use client';

// App data store. Uses Supabase when the build has its keys (lib/backends/live.ts),
// otherwise a browser-only demo (lib/backends/demo.ts). Both expose the same actions.
import { createContext, useContext } from 'react';
import { useDemoBackend } from './backends/demo';
import { useLiveBackend } from './backends/live';
import { setupComplete } from './sim';
import type { Ctx } from './state';
import { LIVE } from './supabase';
import type { State } from './types';

export { EMPTY, checkSignupEmail, vet } from './state';
export type { Actions, Ctx } from './state';

/** Where someone should be, given how far through sign-up they are. */
export function nextRoute(s: State): string {
  if (!s.account) return s.setupStage === undefined ? '/signup' : '/login';
  if (!s.account.loggedIn) return '/login';
  if (!s.subscription) return '/checkout';
  if (!s.business || !s.vetting) return '/onboarding';
  if (s.vetting.result === 'declined') return '/onboarding/declined';
  if (!s.domains) return '/onboarding/domains';
  if (!setupComplete(s)) return '/app/setup';
  return '/app';
}

// ---------- Store ----------

const StoreContext = createContext<Ctx | null>(null);

// LIVE is fixed at build time, so each build only ever calls one of these hooks.
const useBackend = LIVE ? useLiveBackend : useDemoBackend;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useBackend();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}

/** Turns a failed action into a sentence for the person using the app. */
export function errorText(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (/failed to fetch|networkerror|load failed/i.test(m)) return "Can't reach our servers. Check your connection and try again.";
  if (/rate limit/i.test(m)) return 'Too many emails sent just now. Wait a minute and try again.';
  return m || 'Something went wrong. Try again.';
}

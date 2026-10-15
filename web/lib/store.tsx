'use client';

// Demo data layer. Everything lives in this browser's localStorage, so the whole
// product can be clicked through without a backend. Swap these actions for API
// calls (Stripe, provisioning, health monitoring) when the real services exist.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { domainsFor, inboxesFor, planById, type PlanId } from './plans';
import { DAY, makeInboxes, reconcile, suggestDomains, uid } from './sim';
import type { Business, Card, SequencerId, State, Vetting } from './types';

const KEY = 'firstsend-demo-v1';

export const EMPTY: State = {
  version: 1,
  account: null,
  subscription: null,
  business: null,
  vetting: null,
  domains: null,
  setupStartedAt: null,
  inboxes: [],
  replacements: [],
  connections: [],
  invoices: [],
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s.version === 1) return s;
    }
  } catch {}
  return EMPTY;
}

function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** Where someone should be, given how far through sign-up they are. */
export function nextRoute(s: State): string {
  if (!s.account) return '/signup';
  if (!s.account.loggedIn) return '/login';
  if (!s.subscription) return '/checkout';
  if (!s.business || !s.vetting) return '/onboarding';
  if (s.vetting.result === 'declined') return '/onboarding/declined';
  if (!s.domains) return '/onboarding/domains';
  if (!s.inboxes.length) return '/app/setup';
  return '/app';
}

// ---------- Vetting ----------

const FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com'];
const DISPOSABLE = ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'trashmail.com', 'sharklasers.com'];

export function checkSignupEmail(email: string): string | null {
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(email.trim().toLowerCase());
  if (!m) return 'Enter a valid email address.';
  if (DISPOSABLE.includes(m[1])) return "Disposable email addresses can't be used. Use your work email.";
  if (FREE_MAIL.includes(m[1])) return 'Use your work email, like you@youragency.com. It helps us keep spammers out.';
  return null;
}

export function vet(b: Business): Vetting {
  if (b.useCase === 'b2c') {
    return { result: 'declined', reason: 'We only support B2B outreach. Cold email to consumers breaks our acceptable use policy.' };
  }
  return { result: 'approved' };
}

// ---------- Store ----------

type Actions = {
  signup(a: { name: string; email: string }): void;
  login(email: string): boolean;
  logout(): void;
  checkout(plan: PlanId, card: Card): void;
  submitBusiness(b: Business): Vetting;
  reopenOnboarding(): void;
  chooseDomains(names: string[], byod: boolean): void;
  requestReplacement(inboxId: string): void;
  connect(sequencer: SequencerId): void;
  disconnect(sequencer: SequencerId): void;
  changePlan(plan: PlanId): 'upgraded' | 'scheduled' | 'unchanged';
  cancel(): void;
  resume(): void;
  updateCard(card: Card): void;
  updateAccount(a: { name: string; email: string }): void;
  updateBusiness(b: Business): void;
  demo: { skipWarmup(): void; burnOne(): void; advanceMonth(): void; reset(): void };
};

type Ctx = { state: State; now: number; ready: boolean } & Actions;

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const loaded = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(reconcile(load(), Date.now()));
    loaded.current = true;
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setState(load());
    window.addEventListener('storage', onStorage);
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      setState(s => reconcile(s, n));
    }, 1000);
    return () => {
      clearInterval(t);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (loaded.current) save(state);
  }, [state]);

  const update = useCallback((fn: (s: State, now: number) => State) => {
    setState(s => fn(s, Date.now()));
  }, []);

  const actions = useMemo<Actions>(
    () => ({
      signup: ({ name, email }) =>
        update((_, now) => ({ ...EMPTY, account: { name: name.trim(), email: email.trim().toLowerCase(), createdAt: now, loggedIn: true } })),

      login: email => {
        const s = stateRef.current;
        if (!s.account || s.account.email !== email.trim().toLowerCase()) return false;
        update(cur => ({ ...cur, account: cur.account && { ...cur.account, loggedIn: true } }));
        return true;
      },

      logout: () => update(s => ({ ...s, account: s.account && { ...s.account, loggedIn: false } })),

      checkout: (planId, card) =>
        update((s, now) => {
          const plan = planById(planId);
          return {
            ...s,
            subscription: { plan: planId, status: 'active', startedAt: now, renewsAt: now + 30 * DAY, card },
            invoices: [{ id: uid(), at: now, amount: plan.price, label: `${plan.name} plan, monthly` }],
          };
        }),

      submitBusiness: b => {
        const v = vet(b);
        update(s => ({ ...s, business: b, vetting: v }));
        return v;
      },

      reopenOnboarding: () => update(s => ({ ...s, vetting: null })),

      chooseDomains: (names, byod) => update((s, now) => ({ ...s, domains: { names, byod }, setupStartedAt: now })),

      requestReplacement: id =>
        update((s, now) => {
          const b = s.inboxes.find(x => x.id === id);
          if (!b || b.status === 'replacing') return s;
          return {
            ...s,
            inboxes: s.inboxes.map(x => (x.id === id ? { ...x, status: 'replacing', replaceRequestedAt: now } : x)),
            replacements: [{ id: uid(), oldAddr: b.addr, requestedAt: now }, ...s.replacements],
          };
        }),

      connect: seq =>
        update((s, now) => ({
          ...s,
          connections: [...s.connections.filter(c => c.sequencer !== seq), { sequencer: seq, at: now, inboxes: s.inboxes.length }],
        })),

      disconnect: seq => update(s => ({ ...s, connections: s.connections.filter(c => c.sequencer !== seq) })),

      changePlan: planId => {
        const s = stateRef.current;
        const sub = s.subscription;
        if (!sub || sub.plan === planId) {
          if (sub?.pendingPlan) update(c => ({ ...c, subscription: c.subscription && { ...c.subscription, pendingPlan: undefined } }));
          return 'unchanged';
        }
        const from = planById(sub.plan);
        const to = planById(planId);
        if (to.price < from.price) {
          update(c => ({ ...c, subscription: c.subscription && { ...c.subscription, pendingPlan: planId } }));
          return 'scheduled';
        }
        // Upgrade now: add domains and inboxes, bill the difference for the rest of the month.
        update((c, now) => {
          if (!c.subscription) return c;
          const used = new Set(c.domains?.names ?? []);
          const extraDomains = suggestDomains(c.business?.company ?? 'acme', 16)
            .filter(d => !d.taken && !used.has(d.name))
            .slice(0, Math.max(0, domainsFor(to) - used.size))
            .map(d => d.name);
          const setupDone = c.inboxes.length > 0;
          const extraInboxes =
            setupDone && extraDomains.length ? makeInboxes(extraDomains, inboxesFor(to) - inboxesFor(from), now) : [];
          const left = Math.max(0, (c.subscription.renewsAt - now) / (30 * DAY));
          return {
            ...c,
            subscription: { ...c.subscription, plan: planId, pendingPlan: undefined },
            domains: c.domains && { ...c.domains, names: [...c.domains.names, ...extraDomains] },
            inboxes: [...c.inboxes, ...extraInboxes],
            invoices: [
              { id: uid(), at: now, amount: Math.round((to.price - from.price) * left), label: `Upgrade to ${to.name}, rest of month` },
              ...c.invoices,
            ],
          };
        });
        return 'upgraded';
      },

      cancel: () => update(s => ({ ...s, subscription: s.subscription && { ...s.subscription, status: 'canceled' } })),
      resume: () => update(s => ({ ...s, subscription: s.subscription && { ...s.subscription, status: 'active' } })),
      updateCard: card => update(s => ({ ...s, subscription: s.subscription && { ...s.subscription, card } })),
      updateAccount: ({ name, email }) =>
        update(s => ({ ...s, account: s.account && { ...s.account, name: name.trim(), email: email.trim().toLowerCase() } })),
      updateBusiness: b => update(s => ({ ...s, business: b })),

      demo: {
        skipWarmup: () =>
          update((s, now) => ({
            ...s,
            setupStartedAt: s.setupStartedAt == null ? null : Math.min(s.setupStartedAt, now - 60 * 60_000),
            inboxes: s.inboxes.map(b => (b.status === 'warming' ? { ...b, readyAt: now } : b)),
          })),
        burnOne: () =>
          update(s => {
            const good = s.inboxes.filter(b => b.status === 'good');
            if (!good.length) return s;
            const pick = good[Math.floor(Math.random() * good.length)];
            return { ...s, inboxes: s.inboxes.map(b => (b.id === pick.id ? { ...b, status: 'burned' } : b)) };
          }),
        advanceMonth: () =>
          update((s, now) => ({ ...s, subscription: s.subscription && { ...s.subscription, renewsAt: Math.min(s.subscription.renewsAt, now) } })),
        reset: () => {
          try {
            localStorage.removeItem(KEY);
          } catch {}
          setState(EMPTY);
        },
      },
    }),
    [update],
  );

  const value = useMemo(() => ({ state, now, ready, ...actions }), [state, now, ready, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore must be used inside StoreProvider');
  return c;
}

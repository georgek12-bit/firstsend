'use client';

// Demo data layer. Everything lives in this browser's localStorage, so the whole
// product can be clicked through without a backend. Setup, warmup and inbox health
// run on timers (see ../sim.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { domainsFor, inboxesFor, planById } from '../plans';
import { DAY, makeInboxes, reconcile, suggestDomains, uid } from '../sim';
import { EMPTY, vet, type Actions, type Ctx } from '../state';
import type { State } from '../types';

const KEY = 'firstsend-demo-v1';

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

export function useDemoBackend(): Ctx {
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
      signup: async ({ name, email }) => {
        update((_, now) => ({ ...EMPTY, account: { name: name.trim(), email: email.trim().toLowerCase(), createdAt: now, loggedIn: true } }));
        return { sent: false };
      },

      login: async email => {
        const s = stateRef.current;
        if (!s.account || s.account.email !== email.trim().toLowerCase()) return 'not_found';
        update(cur => ({ ...cur, account: cur.account && { ...cur.account, loggedIn: true } }));
        return 'ok';
      },

      logout: async () => update(s => ({ ...s, account: s.account && { ...s.account, loggedIn: false } })),

      checkout: async (planId, card) =>
        update((s, now) => {
          const plan = planById(planId);
          return {
            ...s,
            subscription: { plan: planId, status: 'active', startedAt: now, renewsAt: now + 30 * DAY, card },
            invoices: [{ id: uid(), at: now, amount: plan.price, label: `${plan.name} plan, monthly` }],
          };
        }),

      submitBusiness: async b => {
        const v = vet(b);
        update(s => ({ ...s, business: b, vetting: v }));
        return v;
      },

      reopenOnboarding: async () => update(s => ({ ...s, vetting: null })),

      chooseDomains: async (names, byod) => update((s, now) => ({ ...s, domains: { names, byod }, setupStartedAt: now })),

      requestReplacement: async id =>
        update((s, now) => {
          const b = s.inboxes.find(x => x.id === id);
          if (!b || b.status === 'replacing') return s;
          return {
            ...s,
            inboxes: s.inboxes.map(x => (x.id === id ? { ...x, status: 'replacing', replaceRequestedAt: now } : x)),
            replacements: [{ id: uid(), oldAddr: b.addr, requestedAt: now }, ...s.replacements],
          };
        }),

      connect: async seq =>
        update((s, now) => ({
          ...s,
          connections: [...s.connections.filter(c => c.sequencer !== seq), { sequencer: seq, at: now, inboxes: s.inboxes.length }],
        })),

      disconnect: async seq => update(s => ({ ...s, connections: s.connections.filter(c => c.sequencer !== seq) })),

      changePlan: async planId => {
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

      cancel: async () => update(s => ({ ...s, subscription: s.subscription && { ...s.subscription, status: 'canceled' } })),
      resume: async () => update(s => ({ ...s, subscription: s.subscription && { ...s.subscription, status: 'active' } })),
      updateCard: async card => update(s => ({ ...s, subscription: s.subscription && { ...s.subscription, card } })),
      updateAccount: async ({ name, email }) => {
        update(s => ({ ...s, account: s.account && { ...s.account, name: name.trim(), email: email.trim().toLowerCase() } }));
        return { emailPending: false };
      },
      updateBusiness: async b => update(s => ({ ...s, business: b })),

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

  return { state, now, ready, live: false, isAdmin: false, refresh: async () => {}, ...actions };
}


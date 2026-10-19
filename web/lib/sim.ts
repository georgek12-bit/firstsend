// Simulated provisioning. In production these become calls to the domain registrar,
// DNS provider, Microsoft tenant automation and health monitoring. Timings are sped up
// so the whole flow can be demoed in a couple of minutes.
import { domainsFor, inboxesFor, planById, STARTER_CAP_DAYS, STARTER_CAP_SHARE, type Plan } from './plans';
import type { Inbox, InboxLogin, SetupStage, State } from './types';

export const SETUP_STEPS = [
  { key: 'domains', label: 'Buying your domains', detail: 'Registering the names you picked.', ms: 5000 },
  { key: 'dns', label: 'Setting up DNS', detail: 'SPF, DKIM and DMARC. You never have to touch these.', ms: 7000 },
  { key: 'inboxes', label: 'Creating your inboxes', detail: 'Outlook inboxes with names and signatures.', ms: 8000 },
  { key: 'warmup', label: 'Starting warmup', detail: 'Inboxes start sending a few emails a day to build trust.', ms: 4000 },
] as const;

export const SETUP_MS = SETUP_STEPS.reduce((a, s) => a + s.ms, 0);
export const WARMUP_MS = 45_000;
export const REPLACE_MS = 12_000;
export const DAY = 86_400_000;

export type SetupProgress = { done: boolean; elapsed: number; current: number; pct: number };

export function setupProgress(startedAt: number | null, now: number): SetupProgress {
  if (startedAt == null) return { done: false, elapsed: 0, current: -1, pct: 0 };
  const elapsed = Math.max(0, now - startedAt);
  let acc = 0;
  for (let i = 0; i < SETUP_STEPS.length; i++) {
    acc += SETUP_STEPS[i].ms;
    if (elapsed < acc) return { done: false, elapsed, current: i, pct: elapsed / SETUP_MS };
  }
  return { done: true, elapsed, current: SETUP_STEPS.length, pct: 1 };
}

const STAGE_STEP: Record<SetupStage, number> = { queued: 0, domains: 0, dns: 1, inboxes: 2, warmup: 3, ready: SETUP_STEPS.length };

/** Setup progress for either mode: admin-set stage when live, a timer in the demo. */
export function progressFor(s: State, now: number): SetupProgress {
  if (s.setupStage === undefined) return setupProgress(s.setupStartedAt, now);
  const stage = s.setupStage;
  if (!stage) return { done: false, elapsed: 0, current: -1, pct: 0 };
  const current = STAGE_STEP[stage];
  const done = stage === 'ready';
  return { done, elapsed: 0, current, pct: done ? 1 : Math.max(0.04, current / SETUP_STEPS.length) };
}

/** Whether the customer can use their inboxes yet. */
export function setupComplete(s: State) {
  return s.setupStage === undefined ? s.inboxes.length > 0 : s.setupStage === 'ready';
}

// ---------- Names ----------

const PEOPLE = [
  'alex', 'sam', 'jo', 'mia', 'tom', 'priya', 'owen', 'lena', 'max', 'nina', 'leo', 'ava', 'ben',
  'zoe', 'eli', 'ruby', 'kai', 'ella', 'finn', 'isla', 'noah', 'maya', 'theo', 'cleo', 'jack',
];

export const uid = () => Math.random().toString(36).slice(2, 10);

/** Small stable hash so "taken" domains and demo events are the same on every render. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function slug(company: string) {
  return company
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18) || 'acme';
}

/** Lookalike sending domains, so cold email never touches the customer's main domain. */
export function suggestDomains(company: string, count = 12) {
  const s = slug(company);
  const forms = [
    `get${s}.com`, `try${s}.com`, `${s}hq.com`, `meet${s}.com`, `${s}team.com`, `hey${s}.com`,
    `${s}mail.com`, `go${s}.com`, `${s}-growth.com`, `join${s}.com`, `${s}app.co`, `with${s}.com`,
    `${s}labs.co`, `use${s}.com`, `${s}group.co`, `the${s}.co`,
  ];
  return forms.slice(0, count).map(name => ({ name, taken: hash(name) % 7 === 0 }));
}

export const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)\.[a-z]{2,}(\.[a-z]{2,})?$/;

// ---------- Inboxes ----------

/** Demo: a made-up login so the export file has every column filled. */
export function demoLogin(addr: string): InboxLogin {
  const first = addr.split('@')[0].split('.')[0];
  return {
    firstName: first[0].toUpperCase() + first.slice(1),
    lastName: '',
    imapUsername: addr,
    imapPassword: 'demo-password',
    imapHost: 'mail.example.com',
    imapPort: 993,
    smtpUsername: addr,
    smtpPassword: 'demo-password',
    smtpHost: 'mail.example.com',
    smtpPort: 587,
  };
}

export function makeInboxes(domains: string[], count: number, now: number): Inbox[] {
  const out: Inbox[] = [];
  const perDomain = Math.ceil(count / domains.length);
  for (let i = 0; i < count; i++) {
    const domain = domains[Math.floor(i / perDomain) % domains.length];
    const person = PEOPLE[(i % perDomain) % PEOPLE.length];
    out.push({
      id: uid(),
      addr: `${person}@${domain}`,
      domain,
      status: 'warming',
      createdAt: now,
      // Stagger so inboxes finish warmup one after another.
      readyAt: now + WARMUP_MS * (0.6 + (i % 7) * 0.08),
      login: demoLogin(`${person}@${domain}`),
    });
  }
  return out;
}

/** Demo: once warmup is done, one inbox goes on watch and one burns, to show the guarantee. */
function seedHealthEvents(inboxes: Inbox[]) {
  if (inboxes.length < 4) return inboxes;
  const watch = 2;
  const burn = inboxes.length - 3;
  return inboxes.map((b, i) =>
    i === watch ? { ...b, degradeAt: b.readyAt + 20_000, degradeTo: 'watch' as const }
    : i === burn ? { ...b, degradeAt: b.readyAt + 30_000, degradeTo: 'burned' as const }
    : b,
  );
}

/** Apply every time-based transition. Returns the same object when nothing changed. */
export function reconcile(state: State, now: number): State {
  let next = state;
  const set = (patch: Partial<State>) => (next = { ...next, ...patch });

  // Setup finished: create the inboxes.
  if (state.subscription && state.domains && state.setupStartedAt != null && state.inboxes.length === 0) {
    if (setupProgress(state.setupStartedAt, now).done) {
      const plan = planById(state.subscription.plan);
      const at = state.setupStartedAt + SETUP_MS;
      set({ inboxes: seedHealthEvents(makeInboxes(state.domains.names, inboxesFor(plan), at)) });
    }
  }

  // Warmup and health changes.
  let changed = false;
  const replacements = [...next.replacements];
  const inboxes: Inbox[] = [];
  for (const b of next.inboxes) {
    let n = b;
    if (n.status === 'warming' && now >= n.readyAt) n = { ...n, status: 'good' };
    if (n.status === 'good' && n.degradeAt && now >= n.degradeAt) n = { ...n, status: n.degradeTo!, degradeAt: undefined };
    if (n.status === 'replacing' && n.replaceRequestedAt && now >= n.replaceRequestedAt + REPLACE_MS) {
      // Swap in a fresh inbox on the same domain.
      const local = n.addr.split('@')[0];
      const fresh: Inbox = {
        id: uid(),
        addr: `${local}.${(hash(n.id) % 90) + 10}@${n.domain}`,
        domain: n.domain,
        status: 'warming',
        createdAt: now,
        readyAt: now + WARMUP_MS * 0.6,
        login: demoLogin(`${local}.${(hash(n.id) % 90) + 10}@${n.domain}`),
      };
      const r = replacements.findIndex(x => x.oldAddr === n.addr && !x.doneAt);
      if (r >= 0) replacements[r] = { ...replacements[r], newAddr: fresh.addr, doneAt: now };
      n = fresh;
    }
    if (n !== b) changed = true;
    inboxes.push(n);
  }
  if (changed) set({ inboxes, replacements });

  // Renewal: bill again and apply a pending downgrade.
  const sub = next.subscription;
  if (sub && sub.status === 'active' && now >= sub.renewsAt) {
    const plan = planById(sub.pendingPlan ?? sub.plan);
    set({
      subscription: { ...sub, plan: plan.id, pendingPlan: undefined, renewsAt: sub.renewsAt + 30 * DAY },
      invoices: [{ id: uid(), at: sub.renewsAt, amount: plan.price, label: `${plan.name} plan, monthly` }, ...next.invoices],
    });
  }
  return next;
}

// ---------- Sending ----------

export function dailyCap(plan: Plan, accountCreatedAt: number, now: number) {
  const young = now - accountCreatedAt < STARTER_CAP_DAYS * DAY;
  return Math.round(plan.perDay * (young ? STARTER_CAP_SHARE : 1));
}

/** Demo figure: how much of today's cap has gone out, based on the time of day. */
export function sentToday(cap: number, goodShare: number, now: number) {
  const d = new Date(now);
  const dayShare = Math.min(1, Math.max(0, (d.getHours() - 8 + d.getMinutes() / 60) / 9));
  return Math.round(cap * goodShare * dayShare);
}

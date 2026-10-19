// Shared store types and constants, kept apart from lib/store.tsx so both backends can import them.
import type { PlanId } from './plans';
import type { Business, Card, SequencerId, State, Vetting } from './types';

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

export type Actions = {
  /** Live: emails a sign-in link (sent: true). Demo: signs in straight away. */
  signup(a: { name: string; email: string; plan: PlanId }): Promise<{ sent: boolean }>;
  login(email: string): Promise<'ok' | 'sent' | 'not_found'>;
  logout(): Promise<void>;
  /** Demo only: records a plan straight away from the card form. */
  checkout(plan: PlanId, card: Card): Promise<void>;
  /** Live only: sends the browser to Stripe Checkout. */
  startCheckout(plan: PlanId): Promise<void>;
  /** Live only: sends the browser to Stripe's billing portal. */
  openBillingPortal(): Promise<void>;
  submitBusiness(b: Business): Promise<Vetting>;
  reopenOnboarding(): Promise<void>;
  chooseDomains(names: string[], byod: boolean): Promise<void>;
  requestReplacement(inboxId: string): Promise<void>;
  connect(sequencer: SequencerId): Promise<void>;
  disconnect(sequencer: SequencerId): Promise<void>;
  changePlan(plan: PlanId): Promise<'upgraded' | 'scheduled' | 'unchanged'>;
  cancel(): Promise<void>;
  resume(): Promise<void>;
  updateCard(card: Card): Promise<void>;
  /** emailPending: a confirmation link was sent to the new address. */
  updateAccount(a: { name: string; email: string }): Promise<{ emailPending: boolean }>;
  updateBusiness(b: Business): Promise<void>;
  demo: { skipWarmup(): void; burnOne(): void; advanceMonth(): void; reset(): void };
};

export type Ctx = {
  state: State;
  now: number;
  ready: boolean;
  live: boolean;
  isAdmin: boolean;
  refresh(): Promise<void>;
} & Actions;


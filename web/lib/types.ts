import type { PlanId } from './plans';

export type SequencerId = 'instantly' | 'smartlead' | 'emailbison' | 'lemlist' | 'apollo';

export type Account = {
  name: string;
  email: string;
  createdAt: number;
  loggedIn: boolean;
};

export type Card = { brand: string; last4: string; exp: string };

export type Subscription = {
  plan: PlanId;
  status: 'active' | 'canceled';
  startedAt: number;
  renewsAt: number;
  card: Card;
  /** A downgrade waits for the next renewal. */
  pendingPlan?: PlanId;
};

export type ClientCount = '0' | '1-3' | '4-10' | '10+';
export type UseCase = 'agency' | 'own' | 'recruiting' | 'b2c';
export type LeadSource = 'build' | 'bought' | 'unsure';

export type Business = {
  company: string;
  website: string;
  clients: ClientCount;
  useCase: UseCase;
  leadSource: LeadSource;
  sequencer: SequencerId | 'other';
};

export type Vetting = { result: 'approved' } | { result: 'declined'; reason: string };

export type InboxStatus = 'warming' | 'good' | 'watch' | 'burned' | 'replacing';

export type Inbox = {
  id: string;
  addr: string;
  domain: string;
  status: InboxStatus;
  createdAt: number;
  /** When warmup finishes and the inbox becomes good to send. */
  readyAt: number;
  /** Demo only: when this inbox's health drops. */
  degradeAt?: number;
  degradeTo?: 'watch' | 'burned';
  replaceRequestedAt?: number;
};

export type Replacement = { id: string; oldAddr: string; newAddr?: string; requestedAt: number; doneAt?: number };

export type Invoice = { id: string; at: number; amount: number; label: string };

export type Connection = { sequencer: SequencerId; at: number; inboxes: number };

export type State = {
  version: 1;
  account: Account | null;
  subscription: Subscription | null;
  business: Business | null;
  vetting: Vetting | null;
  domains: { names: string[]; byod: boolean } | null;
  setupStartedAt: number | null;
  inboxes: Inbox[];
  replacements: Replacement[];
  connections: Connection[];
  invoices: Invoice[];
};

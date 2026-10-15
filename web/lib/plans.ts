// Plans are sold by emails a day. Inbox and domain counts are an internal detail
// used for provisioning and the dashboard, never shown on pricing.
export type PlanId = 'starter' | 'growth';

export type Plan = {
  id: PlanId;
  name: string;
  perDay: number;
  price: number;
};

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', perDay: 800, price: 125 },
  { id: 'growth', name: 'Growth', perDay: 1600, price: 250 },
];

export const planById = (id: PlanId) => PLANS.find(p => p.id === id)!;

/** Smallest plan that covers a daily volume. */
export const planFor = (perDay: number) => PLANS.find(p => perDay <= p.perDay) ?? PLANS[PLANS.length - 1];

export const LOWEST_PRICE = Math.min(...PLANS.map(p => p.price));

// Provisioning assumptions (internal).
export const SENDS_PER_INBOX = 20;
export const INBOXES_PER_DOMAIN = 25;

export const inboxesFor = (p: Plan) => Math.ceil(p.perDay / SENDS_PER_INBOX);
export const domainsFor = (p: Plan) => Math.ceil(inboxesFor(p) / INBOXES_PER_DOMAIN);

/** New accounts start at a lower daily cap that rises with good sending behaviour. */
export const STARTER_CAP_SHARE = 0.5;
export const STARTER_CAP_DAYS = 14;

export const fmt = (n: number) => n.toLocaleString('en-US');

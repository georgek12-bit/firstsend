// Receives Stripe events and keeps subscriptions and invoices in the database in step.
// Deployed with JWT verification off: Stripe signs each request instead, and we check that signature.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const crypto = Stripe.createSubtleCryptoProvider();
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// Promo codes made from this coupon (100% off, once) give a free first month on Growth,
// then move the customer to the private $200 price for every month after.
const EXISTING_CLIENT_COUPON = 'bookd-existing-client';
const EXISTING_CLIENT_PRICE = 'firstsend_growth_founding_monthly';

const PLAN_BY_LOOKUP: Record<string, string> = {
  firstsend_starter_monthly: 'starter',
  firstsend_growth_monthly: 'growth',
  // Private existing client rate ($200/mo), applied by applyExistingClientRate below.
  firstsend_growth_founding_monthly: 'growth',
};

async function userIdFor(customer: string, metadataUser?: string) {
  if (metadataUser) return metadataUser;
  const { data } = await db.from('profiles').select('id').eq('stripe_customer_id', customer).maybeSingle();
  return data?.id as string | undefined;
}

const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

// If the Growth subscription used an existing client code, swap it to the $200 price.
// No proration: the free first month stands and the next invoice is $200. Runs once; the
// update fires another event, which finds the price already swapped.
async function applyExistingClientRate(sub: Stripe.Subscription): Promise<Stripe.Subscription> {
  // Older API versions put the coupon on discount.coupon, newer ones on discount.source.coupon.
  // deno-lint-ignore no-explicit-any
  const couponId = (d: any) => d?.coupon?.id ?? (typeof d?.source?.coupon === 'string' ? d.source.coupon : d?.source?.coupon?.id);
  // A once-only coupon drops off the subscription after the first invoice, so also read it there.
  // deno-lint-ignore no-explicit-any
  const invoiceDiscounts = ((sub.latest_invoice as any)?.discounts ?? []) as any[];
  // deno-lint-ignore no-explicit-any
  const coupons = [...((sub.discounts ?? []) as any[]), ...invoiceDiscounts, (sub as any).discount].map(couponId);
  const item = sub.items.data[0];
  if (!['active', 'trialing'].includes(sub.status)) return sub;
  if (!coupons.includes(EXISTING_CLIENT_COUPON) || item.price.lookup_key !== 'firstsend_growth_monthly') return sub;
  const prices = await stripe.prices.list({ lookup_keys: [EXISTING_CLIENT_PRICE], active: true });
  if (!prices.data.length) throw new Error('Existing client price is missing');
  await stripe.subscriptions.update(sub.id, {
    items: [{ id: item.id, price: prices.data[0].id }],
    proration_behavior: 'none',
    metadata: { ...sub.metadata, rate: 'bookd-existing-client' },
  });
  return stripe.subscriptions.retrieve(sub.id, { expand: ['default_payment_method', 'items.data.price', 'discounts', 'latest_invoice.discounts'] });
}

async function syncSubscription(subId: string) {
  let sub = await stripe.subscriptions.retrieve(subId, { expand: ['default_payment_method', 'items.data.price', 'discounts', 'latest_invoice.discounts'] });
  sub = await applyExistingClientRate(sub);
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const userId = await userIdFor(customer, sub.metadata?.user_id);
  if (!userId) throw new Error(`No user for customer ${customer}`);

  const item = sub.items.data[0];
  const plan = PLAN_BY_LOOKUP[item.price.lookup_key ?? ''];
  if (!plan) throw new Error(`Unknown price ${item.price.id}`);

  // Newer API versions keep the period on the item.
  // deno-lint-ignore no-explicit-any
  const periodEnd = (item as any).current_period_end ?? (sub as any).current_period_end;
  const card = typeof sub.default_payment_method === 'object' ? sub.default_payment_method?.card : null;
  const ending = sub.status === 'canceled' || sub.cancel_at_period_end;

  const { error } = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      plan,
      pending_plan: null,
      status: ending ? 'canceled' : 'active',
      stripe_status: sub.status,
      started_at: iso(sub.start_date),
      renews_at: iso(sub.status === 'canceled' ? sub.ended_at ?? periodEnd : periodEnd),
      stripe_customer_id: customer,
      stripe_subscription_id: sub.id,
      ...(card ? { card_brand: card.brand.replace(/^\w/, c => c.toUpperCase()), card_last4: card.last4, card_exp: `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}` } : {}),
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

async function recordInvoice(inv: Stripe.Invoice) {
  if (!inv.amount_paid) return;
  const customer = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
  const userId = customer && (await userIdFor(customer));
  if (!userId) return;
  const line = inv.lines.data[0];
  const label =
    inv.billing_reason === 'subscription_update' ? 'Plan change' : line?.description?.replace(/^1 × /, '') || 'Firstsend subscription';
  const { error } = await db.from('invoices').upsert(
    {
      user_id: userId,
      at: iso(inv.status_transitions?.paid_at ?? inv.created),
      amount: Math.round(inv.amount_paid / 100),
      label,
      stripe_invoice_id: inv.id,
      url: inv.hosted_invoice_url,
    },
    { onConflict: 'stripe_invoice_id' },
  );
  if (error) throw error;
}

Deno.serve(async req => {
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get('stripe-signature') ?? '', secret, undefined, crypto);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  // Each event once. If handling fails we delete the marker so Stripe's retry runs it again.
  const { error: dup } = await db.from('stripe_events').insert({ id: event.id, type: event.type });
  if (dup) return new Response('Already handled', { status: 200 });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === 'subscription' && s.subscription) await syncSubscription(String(s.subscription));
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription((event.data.object as Stripe.Subscription).id);
        break;
      case 'invoice.paid':
        await recordInvoice(event.data.object as Stripe.Invoice);
        break;
    }
    return new Response('ok', { status: 200 });
  } catch (e) {
    console.error(event.type, e);
    await db.from('stripe_events').delete().eq('id', event.id);
    return new Response('Handler failed', { status: 500 });
  }
});

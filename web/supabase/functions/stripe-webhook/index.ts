// Receives Stripe events and keeps subscriptions and invoices in the database in step.
// Deployed with JWT verification off: Stripe signs each request instead, and we check that signature.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const crypto = Stripe.createSubtleCryptoProvider();
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const PLAN_BY_LOOKUP: Record<string, string> = {
  firstsend_starter_monthly: 'starter',
  firstsend_growth_monthly: 'growth',
};

async function userIdFor(customer: string, metadataUser?: string) {
  if (metadataUser) return metadataUser;
  const { data } = await db.from('profiles').select('id').eq('stripe_customer_id', customer).maybeSingle();
  return data?.id as string | undefined;
}

const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

async function syncSubscription(subId: string) {
  const sub = await stripe.subscriptions.retrieve(subId, { expand: ['default_payment_method', 'items.data.price'] });
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

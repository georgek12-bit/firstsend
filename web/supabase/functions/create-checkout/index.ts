// Starts a Stripe Checkout session for the signed-in customer and returns its URL.
// Body: { plan: 'starter' | 'growth', returnUrl: string }  (returnUrl = the site's base URL)
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const PLANS = ['starter', 'growth'];
// Where Stripe may send people back to. Add your own domain here when you have one.
const ALLOWED_ORIGINS = ['https://georgek12-bit.github.io', 'http://localhost:3000'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) return json({ error: 'Sign in first.' }, 401);

    const { plan, returnUrl } = await req.json();
    if (!PLANS.includes(plan)) return json({ error: 'Unknown plan.' }, 400);
    const base = String(returnUrl ?? '').replace(/\/+$/, '');
    if (!ALLOWED_ORIGINS.some(o => base === o || base.startsWith(o + '/'))) return json({ error: 'Bad return URL.' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: existing } = await admin.from('subscriptions').select('user_id').eq('user_id', user.id).maybeSingle();
    if (existing) return json({ error: 'You already have a plan. Manage it from Billing.' }, 409);

    const { data: profile } = await admin.from('profiles').select('name, email, stripe_customer_id').eq('id', user.id).single();
    let customer = profile?.stripe_customer_id as string | null;
    if (!customer) {
      const c = await stripe.customers.create({ email: profile?.email ?? user.email, name: profile?.name || undefined, metadata: { user_id: user.id } });
      customer = c.id;
      await admin.from('profiles').update({ stripe_customer_id: customer }).eq('id', user.id);
    }

    const prices = await stripe.prices.list({ lookup_keys: [`firstsend_${plan}_monthly`], active: true });
    if (!prices.data.length) return json({ error: 'This plan is not available right now.' }, 500);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
      allow_promotion_codes: true,
      success_url: `${base}/checkout/?status=success`,
      cancel_url: `${base}/checkout/?plan=${plan}`,
    });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not start checkout. Try again.' }, 500);
  }
});

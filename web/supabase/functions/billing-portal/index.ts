// Opens Stripe's customer portal (card, plan, cancel, invoices) for the signed-in customer.
// Body: { returnUrl: string }
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const ALLOWED_ORIGINS = ['https://firstsend.site', 'https://www.firstsend.site', 'https://georgek12-bit.github.io', 'http://localhost:3000'];

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

    const { returnUrl } = await req.json();
    const url = String(returnUrl ?? '');
    if (!ALLOWED_ORIGINS.some(o => url === o || url.startsWith(o + '/'))) return json({ error: 'Bad return URL.' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    if (!profile?.stripe_customer_id) return json({ error: 'No billing account yet.' }, 404);

    const session = await stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: url });
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not open billing. Try again.' }, 500);
  }
});

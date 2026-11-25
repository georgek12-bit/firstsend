// Portal Leads tab. The search itself lives in ../_shared/leads-core.ts (shared with the public API).
// Body: { action, ... }
//   options                 → { industries: string[], countries: string[] }
//   count   { filters }     → { total }
//   create  { filters, n }  → { request }       (runs the search, saves a CSV, returns the row)
//   download { id }         → { url }           (signed link, valid 1 hour)
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { UserError, countLeads, createList, options } from '../_shared/leads-core.ts';

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

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const [{ data: sub }, { data: prof }] = await Promise.all([
      admin.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
      admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
    ]);
    if (sub?.status !== 'active' && !prof?.is_admin) return json({ error: 'Leads come with an active plan.' }, 403);

    const body = await req.json();

    switch (body.action) {
      case 'options':
        return json(await options());

      case 'count':
        return json(await countLeads(body.filters));

      case 'download': {
        const { data: r } = await admin
          .from('lead_requests')
          .select('file_path')
          .eq('id', String(body.id ?? ''))
          .eq('user_id', user.id)
          .maybeSingle();
        if (!r?.file_path) return json({ error: 'That list is not ready.' }, 404);
        const { data, error } = await admin.storage.from('leads').createSignedUrl(r.file_path, 3600, { download: true });
        if (error) throw error;
        return json({ url: data.signedUrl });
      }

      case 'create':
        return json({ request: await createList(admin, user.id, body.filters, body.n) });

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    if (e instanceof UserError) return json({ error: e.message }, 400);
    console.error(e);
    return json({ error: 'Could not get leads right now. Try again in a minute.' }, 500);
  }
});

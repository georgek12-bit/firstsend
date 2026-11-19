// Free lead lists for customers, sourced from GetLeads (https://getleads.io/docs).
// Our GetLeads key stays here; customers never see it.
//
// Body: { action, ... }
//   options                 → { industries: string[], countries: string[] }
//   count   { filters }     → { total }
//   create  { filters, n }  → { request }       (runs the search, saves a CSV, returns the row)
//   download { id }         → { url }           (signed link, valid 1 hour)
//   usage                   → { used, limit }
//
// Every search only returns contacts with a verified (VALID) work email, at most 3 per company,
// and never an email this customer has been given before.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const API = 'https://app.getleads.io/api/v1';
const DAILY_LIMIT = 2000; // Leads per customer per rolling 24 hours. Keep in sync with web/lib/leads.ts.
const PAGE = 2000;
const MAX_PAGES = 6; // Stop paging after this many if most matches are repeats.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

class UserError extends Error {}

// ---------- GetLeads ----------

async function gl(path: string, init: RequestInit = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { 'X-API-Key': Deno.env.get('GETLEADS_API_KEY')!, 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    console.error('getleads', path, res.status, text.slice(0, 500));
    if (res.status === 400) throw new UserError(String(data.error ?? data.message ?? 'GetLeads rejected that search.'));
    if (res.status === 429) throw new UserError('Lots of searches right now. Try again in a minute.');
    throw new Error(`getleads ${res.status}`);
  }
  return data;
}

type Filters = {
  job_titles?: string[];
  exclude_job_titles?: string[];
  seniority?: string[];
  industries?: string[];
  countries?: string[];
  company_size?: string[];
};

const SENIORITY = ['c-level', 'vp', 'director', 'manager', 'senior', 'junior'];
const SIZES = ['1 to 10', '11 to 50', '51 to 200', '201 to 500', '501 to 1000', '1001 to 5000', '5001 to 10000', '10001+'];

const list = (v: unknown, max = 50) =>
  (Array.isArray(v) ? v : [])
    .map(x => String(x).trim())
    .filter(Boolean)
    .slice(0, max);

/** Keep only the filters the form offers, and always add the verified-email rules. */
function clean(raw: unknown) {
  const f = (raw ?? {}) as Record<string, unknown>;
  const out: Filters = {
    job_titles: list(f.job_titles),
    exclude_job_titles: list(f.exclude_job_titles),
    seniority: list(f.seniority).filter(s => SENIORITY.includes(s)),
    industries: list(f.industries),
    countries: list(f.countries),
    company_size: list(f.company_size).filter(s => SIZES.includes(s)),
  };
  for (const k of Object.keys(out) as (keyof Filters)[]) if (!out[k]!.length) delete out[k];
  if (!out.job_titles && !out.seniority && !out.industries)
    throw new UserError('Add a job title, seniority or industry so the list is about your buyers.');
  return { mine: out, query: { ...out, require_email: true, email_status: ['VALID'] } };
}

function summary(f: Filters) {
  const parts = [
    f.job_titles?.join(', ') ?? f.seniority?.join(', '),
    f.industries && (f.industries.length > 2 ? `${f.industries.length} industries` : f.industries.join(', ')),
    f.company_size && `${f.company_size.join(', ')} staff`,
    f.countries && (f.countries.length > 2 ? `${f.countries.length} countries` : f.countries.join(', ')),
  ];
  return parts.filter(Boolean).join(' · ').slice(0, 200);
}

let optionsCache: { at: number; data: { industries: string[]; countries: string[] } } | null = null;
async function options() {
  if (optionsCache && Date.now() - optionsCache.at < 6 * 3600_000) return optionsCache.data;
  const [ind, cty] = await Promise.all([
    gl('/contacts/filter-values?field=industries', { method: 'GET' }),
    gl('/contacts/filter-values?field=countries', { method: 'GET' }),
  ]);
  const data = { industries: list(ind.values, 1000), countries: list(cty.values, 1000) };
  optionsCache = { at: Date.now(), data };
  return data;
}

// Columns we ask for, and the CSV the customer gets. Each output column lists the keys GetLeads
// might use for it (canonical name first, then its underlying column).
const COLUMNS = [
  'first_name', 'last_name', 'work_email', 'current_title', 'seniority_level', 'company_name',
  'company_domain', 'company_website', 'company_industry', 'employee_count_range',
  'contact_city', 'contact_country', 'linkedin_url', 'company_linkedin_url',
];
const OUT: [string, string[]][] = [
  ['Email', ['work_email', 'email']],
  ['First Name', ['first_name']],
  ['Last Name', ['last_name']],
  ['Job Title', ['current_title', 'title']],
  ['Seniority', ['seniority_level', 'current_seniority', 'seniority']],
  ['Company Name', ['company_name', 'co_name', 'current_employer', 'current_company_name']],
  ['Website', ['company_domain', 'org_domain', 'company_website', 'co_website']],
  ['Industry', ['company_industry', 'main_industry', 'current_company_industry']],
  ['Company Size', ['employee_count_range']],
  ['City', ['contact_city']],
  ['Country', ['contact_country']],
  ['LinkedIn', ['linkedin_url']],
  ['Company LinkedIn', ['company_linkedin_url', 'current_company_linkedin_url']],
];

type Row = Record<string, unknown>;
const pick = (r: Row, keys: string[]) => {
  for (const k of keys) if (r[k] != null && r[k] !== '') return String(r[k]);
  return '';
};
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const toCsv = (rows: Row[]) =>
  [OUT.map(([h]) => h).join(','), ...rows.map(r => OUT.map(([, k]) => cell(pick(r, k))).join(','))].join('\n');

// ---------- Handler ----------

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
    const { data: sub } = await admin.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle();
    if (sub?.status !== 'active') return json({ error: 'Leads come with an active plan.' }, 403);

    const body = await req.json();

    const used = async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data, error } = await admin
        .from('lead_requests')
        .select('rows, requested, status')
        .eq('user_id', user.id)
        .gte('created_at', since);
      if (error) throw error;
      return (data ?? []).reduce((n, r) => n + (r.status === 'running' ? r.requested : r.rows), 0);
    };

    switch (body.action) {
      case 'options':
        return json(await options());

      case 'usage':
        return json({ used: await used(), limit: DAILY_LIMIT });

      case 'count': {
        const { query } = clean(body.filters);
        const d = await gl('/contacts/search/count', { method: 'POST', body: JSON.stringify({ filters: query }) });
        return json({ total: Number(d.total_matching ?? 0), atLeast: Boolean(d.total_matching_is_minimum) });
      }

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

      case 'create': {
        const { mine, query } = clean(body.filters);
        const left = DAILY_LIMIT - (await used());
        const n = Math.min(Math.floor(Number(body.n) || 0), left);
        if (left <= 0) throw new UserError(`You've had your ${DAILY_LIMIT.toLocaleString('en-US')} leads for today. More unlock tomorrow.`);
        if (n < 1) throw new UserError('Pick how many leads you want.');

        const { data: request, error: insErr } = await admin
          .from('lead_requests')
          .insert({ user_id: user.id, filters: mine, summary: summary(mine), requested: n })
          .select()
          .single();
        if (insErr) throw insErr;

        const claimed: string[] = [];
        try {
          const kept: Row[] = [];
          const seen = new Set<string>();
          let skipped = 0;
          let offset = 0;
          for (let page = 0; page < MAX_PAGES && kept.length < n; page++) {
            const d = await gl('/contacts/search', {
              method: 'POST',
              body: JSON.stringify({ filters: query, columns: COLUMNS, max_per_company: 3, limit: PAGE, offset }),
            });
            const rows = (Array.isArray(d.contacts) ? d.contacts : []) as Row[];
            const fresh = rows.filter(r => {
              const e = pick(r, OUT[0][1]).toLowerCase();
              if (!e || seen.has(e)) return false;
              seen.add(e);
              return true;
            });
            // Claim in slices so we never mark more emails as delivered than we hand over.
            for (let i = 0; i < fresh.length && kept.length < n; ) {
              const slice = fresh.slice(i, i + (n - kept.length));
              i += slice.length;
              const emails = slice.map(r => pick(r, OUT[0][1]).toLowerCase());
              const { data: got, error } = await admin.rpc('claim_leads', { p_user: user.id, p_request: request.id, p_emails: emails });
              if (error) throw error;
              const ok = new Set((got ?? []) as string[]);
              claimed.push(...ok);
              skipped += slice.length - ok.size;
              kept.push(...slice.filter(r => ok.has(pick(r, OUT[0][1]).toLowerCase())));
            }
            if (!d.has_more || !rows.length) break;
            offset = Number(d.next_offset ?? offset + rows.length);
          }

          let file_path: string | null = null;
          if (kept.length) {
            file_path = `${user.id}/${request.id}.csv`;
            const { error } = await admin.storage
              .from('leads')
              .upload(file_path, new Blob([toCsv(kept)], { type: 'text/csv' }), { contentType: 'text/csv', upsert: true });
            if (error) throw error;
          }
          const { data: done, error: upErr } = await admin
            .from('lead_requests')
            .update({
              status: 'ready',
              rows: kept.length,
              skipped,
              file_path,
              error: kept.length ? null : 'No new leads matched. Widen the search or change the filters.',
              finished_at: new Date().toISOString(),
            })
            .eq('id', request.id)
            .select()
            .single();
          if (upErr) throw upErr;
          return json({ request: done });
        } catch (e) {
          // Hand the emails back so they can be delivered next time.
          for (let i = 0; i < claimed.length; i += 200)
            await admin.from('lead_history').delete().eq('user_id', user.id).in('email', claimed.slice(i, i + 200));
          await admin
            .from('lead_requests')
            .update({
              status: 'failed',
              error: e instanceof UserError ? e.message : 'Something went wrong getting these leads. Try again.',
              finished_at: new Date().toISOString(),
            })
            .eq('id', request.id);
          throw e;
        }
      }

      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (e) {
    if (e instanceof UserError) return json({ error: e.message }, 400);
    console.error(e);
    return json({ error: 'Could not get leads right now. Try again in a minute.' }, 500);
  }
});

// Lead search shared by the `leads` function (portal) and the `api` function (public API).
// Sourced from GetLeads (https://getleads.io/docs). Our GetLeads key stays server-side.
// Every list only has contacts with a verified (VALID) work email, at most 3 per company,
// and never an email this customer has been given before.

export const API = 'https://app.getleads.io/api/v1';
export const MAX_PER_REQUEST = 5000; // No daily cap: customers can run as many lists as they like. Keep in sync with web/lib/leads.ts.
const PAGE = 5000; // GetLeads' largest page.
const MAX_PAGES = 8; // Stop paging after this many if most matches are repeats.

export class UserError extends Error {}

// ---------- GetLeads ----------

export async function gl(path: string, init: RequestInit = {}) {
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

export type Filters = {
  job_titles?: string[];
  exclude_job_titles?: string[];
  seniority?: string[];
  industries?: string[];
  countries?: string[];
  company_size?: string[];
  keywords?: string[];
};

const SENIORITY = ['c-level', 'vp', 'director', 'manager', 'senior', 'junior'];
const SIZES = ['1 to 10', '11 to 50', '51 to 200', '201 to 500', '501 to 1000', '1001 to 5000', '5001 to 10000', '10001+'];

const list = (v: unknown, max = 50) =>
  (Array.isArray(v) ? v : [])
    .map(x => String(x).trim())
    .filter(Boolean)
    .slice(0, max);

/** Keep only the filters the form offers, and always add the verified-email rules. */
export function clean(raw: unknown) {
  const f = (raw ?? {}) as Record<string, unknown>;
  const out: Filters = {
    job_titles: list(f.job_titles),
    exclude_job_titles: list(f.exclude_job_titles),
    seniority: list(f.seniority).filter(s => SENIORITY.includes(s)),
    industries: list(f.industries),
    countries: list(f.countries),
    company_size: list(f.company_size).filter(s => SIZES.includes(s)),
    keywords: list(f.keywords, 20),
  };
  for (const k of Object.keys(out) as (keyof Filters)[]) if (!out[k]!.length) delete out[k];
  if (!out.job_titles && !out.seniority && !out.industries && !out.keywords)
    throw new UserError('Add a job title, seniority, industry or keyword so the list is about your buyers.');
  // GetLeads takes company keywords as one comma-separated string (any of them matches).
  const { keywords, ...rest } = out;
  const query: Record<string, unknown> = { ...rest, require_email: true, email_status: ['VALID'] };
  if (keywords) query.company_description = keywords.join(', ');
  return { mine: out, query };
}

export function summary(f: Filters) {
  const parts = [
    f.job_titles?.join(', ') ?? f.seniority?.join(', '),
    f.industries && (f.industries.length > 2 ? `${f.industries.length} industries` : f.industries.join(', ')),
    f.keywords && `“${f.keywords.slice(0, 3).join(', ')}”`,
    f.company_size && `${f.company_size.join(', ')} staff`,
    f.countries && (f.countries.length > 2 ? `${f.countries.length} countries` : f.countries.join(', ')),
  ];
  return parts.filter(Boolean).join(' · ').slice(0, 200);
}

let optionsCache: { at: number; data: { industries: string[]; countries: string[] } } | null = null;
export async function options() {
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
export const COLUMNS = [
  'first_name', 'last_name', 'work_email', 'current_title', 'seniority_level', 'company_name',
  'company_domain', 'company_website', 'company_industry', 'employee_count_range',
  'contact_city', 'contact_country', 'linkedin_url', 'company_linkedin_url',
];
export const OUT: [string, string[]][] = [
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

export type Row = Record<string, unknown>;
export const pick = (r: Row, keys: string[]) => {
  for (const k of keys) if (r[k] != null && r[k] !== '') return String(r[k]);
  return '';
};
const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (rows: Row[]) =>
  [OUT.map(([h]) => h).join(','), ...rows.map(r => OUT.map(([, k]) => cell(pick(r, k))).join(','))].join('\n');

/** Runs a search for this customer, saves the CSV and returns the finished lead_requests row. */
// deno-lint-ignore no-explicit-any
export async function createList(admin: any, userId: string, filters: unknown, n0: unknown) {
        const { mine, query } = clean(filters);
        const n = Math.min(Math.floor(Number(n0) || 0), MAX_PER_REQUEST);
        if (n < 1) throw new UserError('Pick how many leads you want.');

        const { data: request, error: insErr } = await admin
          .from('lead_requests')
          .insert({ user_id: userId, filters: mine, summary: summary(mine), requested: n })
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
              // Ask for a bit more than needed (some will be repeats), not a full 5,000-row page every time.
              body: JSON.stringify({ filters: query, columns: COLUMNS, max_per_company: 3, limit: Math.min(PAGE, Math.max((n - kept.length) * 2, 200)), offset }),
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
              const { data: got, error } = await admin.rpc('claim_leads', { p_user: userId, p_request: request.id, p_emails: emails });
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
            file_path = `${userId}/${request.id}.csv`;
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
          return done;
        } catch (e) {
          // Hand the emails back so they can be delivered next time.
          for (let i = 0; i < claimed.length; i += 200)
            await admin.from('lead_history').delete().eq('user_id', userId).in('email', claimed.slice(i, i + 200));
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

/** Free match count for a set of filters. */
export async function countLeads(filters: unknown) {
  const { query } = clean(filters);
  const d = await gl('/contacts/search/count', { method: 'POST', body: JSON.stringify({ filters: query }) });
  return { total: Number(d.total_matching ?? 0), atLeast: Boolean(d.total_matching_is_minimum) };
}

// Firstsend public API. Customers call https://api.firstsend.site/v1/... (a Cloudflare Worker in
// infra/api-worker forwards here). Docs: https://firstsend.site/docs/api — keep them in sync
// with web/lib/apiDocs.ts when adding or changing an endpoint.
//
// Auth: x-api-token header with a key from Settings > API (only its SHA-256 hash is stored).
// Deployed with verify_jwt off: this function does its own auth.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { UserError, countLeads, createList, options } from '../_shared/leads-core.ts';

const RATE_LIMIT = 120; // requests per key per minute
const PLAN_SENDS: Record<string, number> = { starter: 800, growth: 1600 }; // keep in sync with web/lib/plans.ts

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const send = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json', ...extra } });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const page = (url: URL) => {
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '100') || 100, 1), 500);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0') || 0, 0);
  return { limit, offset };
};
const list = <T>(rows: T[], limit: number, offset: number, total: number | null) => ({
  data: rows,
  has_more: total != null ? offset + rows.length < total : rows.length === limit,
  next_offset: total != null && offset + rows.length < total ? offset + rows.length : null,
  total,
});

async function body(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'invalid_json', 'The request body must be JSON.');
  }
}

// ---------- Shapes ----------

type InboxRow = {
  id: string;
  addr: string;
  domain: string;
  status: string;
  created_at: string;
  ready_at: string | null;
  replace_requested_at: string | null;
  inbox_logins: Record<string, string | number> | null;
};
const inbox = (r: InboxRow, withCreds: boolean) => ({
  id: r.id,
  email: r.addr,
  domain: r.domain,
  status: r.status,
  created_at: r.created_at,
  ready_at: r.ready_at,
  replace_requested_at: r.replace_requested_at,
  ...(withCreds
    ? {
        credentials: r.inbox_logins
          ? {
              first_name: r.inbox_logins.first_name,
              last_name: r.inbox_logins.last_name,
              smtp: { host: r.inbox_logins.smtp_host, port: r.inbox_logins.smtp_port, username: r.inbox_logins.smtp_username, password: r.inbox_logins.smtp_password },
              imap: { host: r.inbox_logins.imap_host, port: r.inbox_logins.imap_port, username: r.inbox_logins.imap_username, password: r.inbox_logins.imap_password },
            }
          : null,
      }
    : {}),
});

type LeadRow = { id: string; summary: string; filters: unknown; requested: number; status: string; rows: number; skipped: number; error: string | null; created_at: string; finished_at: string | null; file_path: string | null };
async function leadList(r: LeadRow) {
  let download_url: string | null = null;
  if (r.file_path) {
    const { data } = await admin.storage.from('leads').createSignedUrl(r.file_path, 3600, { download: true });
    download_url = data?.signedUrl ?? null;
  }
  return {
    id: r.id,
    summary: r.summary,
    filters: r.filters,
    requested: r.requested,
    status: r.status,
    leads: r.rows,
    repeats_skipped: r.skipped,
    error: r.error,
    created_at: r.created_at,
    finished_at: r.finished_at,
    download_url, // CSV, valid for 1 hour
  };
}

// ---------- Routes ----------

async function route(req: Request, url: URL, uid: string) {
  const path = url.pathname.replace(/^.*?\/api(?=\/|$)/, '').replace(/\/+$/, '') || '/';
  const m = req.method;
  const seg = path.split('/').filter(Boolean); // ['v1', 'inboxes', ':id', 'replace']
  if (seg[0] !== 'v1') throw new ApiError(404, 'not_found', 'No such endpoint. Paths start with /v1.');
  const [, res, id, sub] = seg;

  // GET /v1/account
  if (res === 'account' && !id && m === 'GET') {
    const [{ data: p }, { data: s }, { count: inboxes }, { count: domains }] = await Promise.all([
      admin.from('profiles').select('name, email').eq('id', uid).single(),
      admin.from('subscriptions').select('plan, status, renews_at, started_at').eq('user_id', uid).maybeSingle(),
      admin.from('inboxes').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      admin.from('domains').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    ]);
    return {
      data: {
        name: p?.name,
        email: p?.email,
        plan: s?.plan ?? null,
        status: s?.status ?? null,
        emails_per_day: s ? PLAN_SENDS[s.plan] ?? null : null,
        started_at: s?.started_at ?? null,
        renews_at: s?.renews_at ?? null,
        domains: domains ?? 0,
        inboxes: inboxes ?? 0,
      },
    };
  }

  // GET /v1/domains
  if (res === 'domains' && !id && m === 'GET') {
    const [{ data: ds, error }, { data: ib }] = await Promise.all([
      admin.from('domains').select('id, name, byod, created_at').eq('user_id', uid).order('created_at'),
      admin.from('inboxes').select('domain, status').eq('user_id', uid),
    ]);
    if (error) throw error;
    const rows = (ds ?? []).map(d => {
      const mine = (ib ?? []).filter(i => i.domain === d.name);
      return { id: d.id, name: d.name, bring_your_own: d.byod, created_at: d.created_at, inboxes: mine.length, ready_inboxes: mine.filter(i => i.status === 'good').length };
    });
    return { data: rows };
  }

  // GET /v1/inboxes, GET /v1/inboxes/:id, POST /v1/inboxes/:id/replace
  if (res === 'inboxes') {
    const creds = url.searchParams.get('credentials') !== 'false';
    const cols = 'id, addr, domain, status, created_at, ready_at, replace_requested_at' + (creds ? ', inbox_logins(*)' : '');
    if (!id && m === 'GET') {
      const { limit, offset } = page(url);
      let q = admin.from('inboxes').select(cols, { count: 'exact' }).eq('user_id', uid).order('created_at').range(offset, offset + limit - 1);
      const status = url.searchParams.get('status');
      if (status) q = q.in('status', status.split(','));
      const domain = url.searchParams.get('domain');
      if (domain) q = q.eq('domain', domain.toLowerCase());
      const { data, error, count } = await q;
      if (error) throw error;
      return list(((data ?? []) as unknown as InboxRow[]).map(r => inbox(r, creds)), limit, offset, count);
    }
    if (id && !sub && m === 'GET') {
      const { data } = await admin.from('inboxes').select(cols).eq('user_id', uid).eq('id', id).maybeSingle();
      if (!data) throw new ApiError(404, 'not_found', 'No inbox with that id.');
      return { data: inbox(data as unknown as InboxRow, creds) };
    }
    if (id && sub === 'replace' && m === 'POST') {
      const { error } = await admin.rpc('api_request_replacement', { p_user: uid, p_inbox: id });
      if (error) {
        if (/not found/i.test(error.message)) throw new ApiError(404, 'not_found', 'No inbox with that id.');
        if (/Only burned/i.test(error.message)) throw new ApiError(409, 'not_replaceable', 'Only inboxes with status burned or watch can be replaced.');
        throw error;
      }
      const { data } = await admin.from('inboxes').select('id, addr, domain, status, created_at, ready_at, replace_requested_at').eq('id', id).single();
      return { data: inbox(data as unknown as InboxRow, false) };
    }
  }

  // Leads
  if (res === 'leads') {
    if (id === 'options' && m === 'GET') return { data: await options() };
    if (id === 'count' && m === 'POST') {
      const b = await body(req);
      const c = await countLeads(b.filters);
      return { data: { matching: c.total, at_least: c.atLeast } };
    }
    if (!id && m === 'POST') {
      const b = await body(req);
      const done = await createList(admin, uid, b.filters, b.count);
      return { data: await leadList(done as LeadRow) };
    }
    if (!id && m === 'GET') {
      const { limit, offset } = page(url);
      const { data, error, count } = await admin
        .from('lead_requests')
        .select('*', { count: 'exact' })
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      // Download links are only generated for single lists, to keep this call fast.
      const rows = ((data ?? []) as LeadRow[]).map(r => ({ ...r, file_path: null }));
      return list(await Promise.all(rows.map(leadList)), limit, offset, count);
    }
    if (id && !sub && m === 'GET') {
      const { data } = await admin.from('lead_requests').select('*').eq('user_id', uid).eq('id', id).maybeSingle();
      if (!data) throw new ApiError(404, 'not_found', 'No lead list with that id.');
      return { data: await leadList(data as LeadRow) };
    }
  }

  throw new ApiError(404, 'not_found', `No endpoint for ${m} ${path}. See https://firstsend.site/docs/api`);
}

Deno.serve(async req => {
  const url = new URL(req.url);
  let limitHeaders: Record<string, string> = {};
  try {
    const token = (req.headers.get('x-api-token') ?? '').trim();
    if (!token) throw new ApiError(401, 'missing_api_key', 'Send your API key in the x-api-token header. Create one in Settings > API.');
    const { data: auth, error } = await admin.rpc('api_auth', { p_hash: await sha256(token) });
    if (error) throw error;
    const key = (auth ?? [])[0] as { key_id: string; user_id: string; used: number } | undefined;
    if (!key) throw new ApiError(401, 'invalid_api_key', 'That API key is not valid or has been revoked.');

    const reset = Math.ceil(Date.now() / 60000) * 60;
    limitHeaders = {
      'x-ratelimit-limit': String(RATE_LIMIT),
      'x-ratelimit-remaining': String(Math.max(0, RATE_LIMIT - key.used)),
      'x-ratelimit-reset': String(reset),
    };
    if (key.used > RATE_LIMIT) {
      throw new ApiError(429, 'rate_limited', `Too many requests. The limit is ${RATE_LIMIT} a minute per key.`);
    }

    const [{ data: s }, { data: p }] = await Promise.all([
      admin.from('subscriptions').select('status').eq('user_id', key.user_id).maybeSingle(),
      admin.from('profiles').select('is_admin').eq('id', key.user_id).maybeSingle(),
    ]);
    if (s?.status !== 'active' && !p?.is_admin) throw new ApiError(403, 'subscription_inactive', 'The API needs an active Firstsend plan.');

    return send(await route(req, url, key.user_id), 200, limitHeaders);
  } catch (e) {
    if (e instanceof ApiError) {
      const extra = e.status === 429 ? { ...limitHeaders, 'retry-after': String(60 - new Date().getSeconds()) } : limitHeaders;
      return send({ error: { code: e.code, message: e.message } }, e.status, extra);
    }
    if (e instanceof UserError) return send({ error: { code: 'invalid_request', message: e.message } }, 400, limitHeaders);
    console.error('api', req.method, url.pathname, e);
    return send({ error: { code: 'server_error', message: 'Something went wrong. Try again shortly.' } }, 500, limitHeaders);
  }
});

// Read-only snapshot of the sending infrastructure for /admin/infra. Admins only.
// Combines: Azure Communication Services (domains, verification, senders, relay links, sends today),
// the Stalwart mail server (domains, inboxes, queue) through a read-only API key,
// live DNS checks, and which Firstsend customer owns each domain.
// Secret INFRA_CONFIG (JSON): { tenantId, appId, appSecret, subscriptionId, stalwartUrl, stalwartKey }
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const RG = 'firstsend';
const EMAIL_SERVICE = 'firstsend-email';
const COMMS = 'firstsend-comms';
const MX_HOST = 'mx.firstsend.site';
const API = '2023-04-01';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Config = { tenantId: string; appId: string; appSecret: string; subscriptionId: string; stalwartUrl: string; stalwartKey: string };

// ---------- Azure ----------

async function azureToken(c: Config) {
  const res = await fetch(`https://login.microsoftonline.com/${c.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: c.appId, client_secret: c.appSecret, scope: 'https://management.azure.com/.default' }),
  });
  if (!res.ok) throw new Error(`Azure sign-in failed (${res.status})`);
  return (await res.json()).access_token as string;
}

async function azure(c: Config) {
  const token = await azureToken(c);
  const base = `https://management.azure.com/subscriptions/${c.subscriptionId}/resourceGroups/${RG}/providers/Microsoft.Communication`;
  const get = async (path: string) => {
    const res = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Azure ${res.status} on ${path.split('?')[0]}`);
    return res.json();
  };
  const [domains, comms] = await Promise.all([get(`/emailServices/${EMAIL_SERVICE}/domains?api-version=${API}`), get(`/communicationServices/${COMMS}?api-version=${API}`)]);
  const linked = new Set(((comms.properties?.linkedDomains ?? []) as string[]).map(s => s.toLowerCase()));

  const list = await Promise.all(
    (domains.value ?? []).map(async (d: any) => {
      const senders = await get(`/emailServices/${EMAIL_SERVICE}/domains/${d.name}/senderUsernames?api-version=${API}`).catch(() => ({ value: [] }));
      const states = d.properties?.verificationStates ?? {};
      return {
        name: d.name as string,
        managed: d.properties?.domainManagement as string,
        verification: Object.fromEntries(['Domain', 'SPF', 'DKIM', 'DKIM2', 'DMARC'].map(k => [k, states[k]?.status ?? 'NotStarted'])),
        linked: linked.has(String(d.id).toLowerCase()),
        senders: (senders.value ?? []).map((s: any) => s.properties?.username as string).filter(Boolean),
      };
    }),
  );

  // Emails handed to ACS today, split by delivery outcome.
  let sentToday: Record<string, number> | null = null;
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const span = `${start.toISOString()}/${new Date().toISOString()}`;
    const m = await get(
      `/communicationServices/${COMMS}/providers/Microsoft.Insights/metrics?api-version=2018-01-01&metricnames=DeliveryStatusUpdate&aggregation=Count&interval=P1D&timespan=${encodeURIComponent(span)}&$filter=${encodeURIComponent("MessageStatus eq '*'")}`,
    );
    sentToday = {};
    for (const series of m.value?.[0]?.timeseries ?? []) {
      const status = series.metadatavalues?.[0]?.value ?? 'Total';
      sentToday[status] = (series.data ?? []).reduce((n: number, p: any) => n + (p.count ?? 0), 0);
    }
  } catch (e) {
    console.error('metrics', e);
  }
  return { domains: list, sentToday };
}

// ---------- Stalwart ----------

async function stalwart(c: Config) {
  const res = await fetch(`${c.stalwartUrl}/jmap`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.stalwartKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:stalwart:jmap'],
      methodCalls: [
        ['x:Domain/query', { accountId: 'b' }, 'd0'],
        ['x:Domain/get', { accountId: 'b', '#ids': { resultOf: 'd0', name: 'x:Domain/query', path: '/ids' }, properties: ['name', 'isEnabled'] }, 'd1'],
        ['x:Account/query', { accountId: 'b' }, 'a0'],
        ['x:Account/get', { accountId: 'b', '#ids': { resultOf: 'a0', name: 'x:Account/query', path: '/ids' }, properties: ['emailAddress', 'domainId'] }, 'a1'],
        ['x:QueuedMessage/query', { accountId: 'b', calculateTotal: true, limit: 1 }, 'q0'],
      ],
    }),
  });
  if (!res.ok) throw new Error(`Mail server ${res.status}`);
  const r = await res.json();
  const by = (id: string) => r.methodResponses.find((m: any) => m[2] === id)?.[1] ?? {};
  const domains = (by('d1').list ?? []) as { id: string; name: string; isEnabled: boolean }[];
  const accounts = (by('a1').list ?? []) as { emailAddress: string; domainId: string }[];
  return {
    domains: domains.map(d => ({ name: d.name, enabled: d.isEnabled, inboxes: accounts.filter(a => a.domainId === d.id).map(a => a.emailAddress) })),
    queue: (by('q0').total as number) ?? null,
  };
}

// ---------- DNS ----------

async function dns(name: string, type: string): Promise<string[]> {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`, { headers: { Accept: 'application/dns-json' } });
  if (!res.ok) return [];
  const d = await res.json();
  return (d.Answer ?? []).map((a: any) => String(a.data).replace(/^"|"$/g, '').replace(/"\s*"/g, '').toLowerCase());
}

async function dnsChecks(domain: string) {
  const [mx, txt, dmarc] = await Promise.all([dns(domain, 'MX'), dns(domain, 'TXT'), dns(`_dmarc.${domain}`, 'TXT')]);
  const spf = txt.filter(t => t.startsWith('v=spf1'));
  return {
    mx: mx.some(m => m.replace(/\.$/, '').endsWith(MX_HOST)),
    spf: spf.length === 1 && spf[0].includes('include:spf.protection.outlook.com'),
    dmarc: dmarc.find(t => t.startsWith('v=dmarc1'))?.match(/p=(\w+)/)?.[1] ?? null,
  };
}

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
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!me?.is_admin) return json({ error: 'Admins only.' }, 403);

    const raw = Deno.env.get('INFRA_CONFIG');
    if (!raw) return json({ error: 'INFRA_CONFIG secret is not set.' }, 500);
    const c = JSON.parse(raw) as Config;

    const [az, mail, owners] = await Promise.all([
      azure(c).then(v => ({ ok: true as const, ...v }), e => ({ ok: false as const, error: String(e.message ?? e), domains: [], sentToday: null })),
      stalwart(c).then(v => ({ ok: true as const, ...v }), e => ({ ok: false as const, error: String(e.message ?? e), domains: [], queue: null })),
      Promise.all([
        db.from('domains').select('name, user_id, profiles(name, email)'),
        db.from('businesses').select('user_id, company'),
      ]).then(([d, b]) => ({ domains: d.data ?? [], businesses: b.data ?? [] })),
    ]);

    const company = new Map((owners.businesses as any[]).map(b => [b.user_id, b.company as string]));
    const ownerOf = new Map<string, { name: string; email: string; company: string; userId: string }>();
    for (const o of owners.domains as any[]) {
      ownerOf.set(String(o.name).toLowerCase(), {
        name: o.profiles?.name ?? '',
        email: o.profiles?.email ?? '',
        company: company.get(o.user_id) ?? '',
        userId: o.user_id,
      });
    }

    // One row per sending domain: anything on Azure or on the mail server (except our own firstsend.site).
    const names = new Set<string>([...az.domains.map(d => d.name), ...mail.domains.map(d => d.name)].map(n => n.toLowerCase()));
    names.delete('firstsend.site');
    const rows = await Promise.all(
      [...names].sort().map(async name => {
        const a = az.domains.find(d => d.name.toLowerCase() === name);
        const m = mail.domains.find(d => d.name.toLowerCase() === name);
        const senders = (a?.senders ?? []).map(s => `${s}@${name}`.toLowerCase());
        const inboxes = (m?.inboxes ?? []).map(s => s.toLowerCase());
        return {
          name,
          owner: ownerOf.get(name) ?? null,
          azure: a ? { verification: a.verification, linked: a.linked, managed: a.managed } : null,
          senders: senders.length,
          inboxes: inboxes.length,
          missingOnServer: senders.filter(s => !inboxes.includes(s)),
          missingOnAzure: inboxes.filter(i => !senders.includes(i)),
          dns: await dnsChecks(name),
        };
      }),
    );

    return json({
      checkedAt: new Date().toISOString(),
      azure: { ok: az.ok, error: az.ok ? null : az.error, sentToday: az.sentToday },
      mailServer: { ok: mail.ok, error: mail.ok ? null : mail.error, queue: mail.queue, host: MX_HOST },
      domains: rows,
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not load infrastructure status.' }, 500);
  }
});

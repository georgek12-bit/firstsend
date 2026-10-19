// Checks whether domains are registered, using each TLD's public RDAP registry
// (found through IANA's bootstrap file), with a DNS lookup as the fallback.
// Body: { domains: string[] } → { results: { [domain]: 'available' | 'taken' | 'unknown' } }
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

type Status = 'available' | 'taken' | 'unknown';

const MAX = 24;
const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)\.[a-z]{2,}(\.[a-z]{2,})?$/;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// TLD → RDAP base URL, loaded once per function instance.
let bootstrap: Promise<Map<string, string>> | null = null;
const rdapBases = () =>
  (bootstrap ??= fetch('https://data.iana.org/rdap/dns.json')
    .then(r => r.json())
    .then((d: { services: [string[], string[]][] }) => {
      const map = new Map<string, string>();
      for (const [tlds, urls] of d.services) {
        const url = urls.find(u => u.startsWith('https://')) ?? urls[0];
        for (const t of tlds) map.set(t.toLowerCase(), url.endsWith('/') ? url : url + '/');
      }
      return map;
    })
    .catch(e => {
      bootstrap = null;
      throw e;
    }));

const timeout = (ms: number) => AbortSignal.timeout(ms);

async function viaRdap(domain: string): Promise<Status> {
  const tld = domain.split('.').pop()!;
  const base = (await rdapBases()).get(tld);
  if (!base) return 'unknown';
  const res = await fetch(`${base}domain/${domain}`, { headers: { Accept: 'application/rdap+json' }, signal: timeout(6000) });
  await res.body?.cancel();
  if (res.status === 404) return 'available';
  if (res.ok) return 'taken';
  return 'unknown';
}

// Fallback: a registered domain almost always has nameservers. NXDOMAIN means nobody holds it.
async function viaDns(domain: string): Promise<Status> {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`, {
    headers: { Accept: 'application/dns-json' },
    signal: timeout(4000),
  });
  if (!res.ok) return 'unknown';
  const d = await res.json();
  if (d.Status === 3) return 'available';
  if (d.Status === 0 && (d.Answer?.length || d.Authority?.some((a: { name: string }) => a.name.replace(/\.$/, '') === domain))) return 'taken';
  return 'unknown';
}

async function check(domain: string): Promise<Status> {
  try {
    const s = await viaRdap(domain);
    if (s !== 'unknown') return s;
  } catch (e) {
    console.error('rdap', domain, e);
  }
  try {
    return await viaDns(domain);
  } catch (e) {
    console.error('dns', domain, e);
    return 'unknown';
  }
}

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

    const { domains } = await req.json();
    if (!Array.isArray(domains)) return json({ error: 'Send a list of domains.' }, 400);
    const names = [...new Set(domains.map(d => String(d).trim().toLowerCase()))].filter(d => DOMAIN_RE.test(d)).slice(0, MAX);

    const statuses = await Promise.all(names.map(check));
    return json({ results: Object.fromEntries(names.map((n, i) => [n, statuses[i]])) });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not check domains. Try again.' }, 500);
  }
});

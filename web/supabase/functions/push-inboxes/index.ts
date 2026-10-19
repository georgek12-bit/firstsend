// Adds the signed-in customer's inboxes (with their logins) to their Instantly or Smartlead account.
// The customer's API key is used for this request only: never stored or logged.
// Body: { sequencer: 'instantly' | 'smartlead', apiKey: string }
// → { added, existing, failed, errors: string[] }
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const DAILY_LIMIT = 20; // Keep in sync with SENDS_PER_INBOX in web/lib/plans.ts.
const WARMUP_LIMIT = 10;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Login = {
  email: string;
  first_name: string;
  last_name: string;
  imap_username: string;
  imap_password: string;
  imap_host: string;
  imap_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_host: string;
  smtp_port: number;
};
type Result = 'added' | 'existing' | 'badkey' | string;

class BadKey extends Error {}

const message = async (res: Response) => {
  const text = await res.text();
  try {
    const d = JSON.parse(text);
    return String(d.message ?? d.error ?? d.msg ?? text);
  } catch {
    return text;
  }
};
const duplicate = (m: string) => /already|exist|duplicate/i.test(m);

async function instantly(key: string, l: Login): Promise<Result> {
  const res = await fetch('https://api.instantly.ai/api/v2/accounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: l.email,
      first_name: l.first_name,
      last_name: l.last_name,
      provider_code: 1, // Custom IMAP/SMTP
      imap_username: l.imap_username,
      imap_password: l.imap_password,
      imap_host: l.imap_host,
      imap_port: l.imap_port,
      smtp_username: l.smtp_username,
      smtp_password: l.smtp_password,
      smtp_host: l.smtp_host,
      smtp_port: l.smtp_port,
      daily_limit: DAILY_LIMIT,
      warmup: { limit: WARMUP_LIMIT, increment: '1' },
    }),
  });
  if (res.status === 401 || res.status === 403) throw new BadKey();
  if (res.ok) return 'added';
  const m = await message(res);
  return duplicate(m) ? 'existing' : `${l.email}: ${m}`;
}

async function smartlead(key: string, l: Login): Promise<Result> {
  const res = await fetch(`https://server.smartlead.ai/api/v1/email-accounts/save?api_key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from_name: `${l.first_name} ${l.last_name}`.trim(),
      from_email: l.email,
      user_name: l.smtp_username,
      password: l.smtp_password,
      smtp_host: l.smtp_host,
      smtp_port: l.smtp_port,
      imap_user_name: l.imap_username,
      imap_password: l.imap_password,
      imap_host: l.imap_host,
      imap_port: l.imap_port,
      type: 'SMTP',
      max_email_per_day: DAILY_LIMIT,
      warmup_enabled: true,
      total_warmup_per_day: WARMUP_LIMIT,
      daily_rampup: 1,
    }),
  });
  if (res.status === 401 || res.status === 403) throw new BadKey();
  const m = await message(res);
  if (res.ok && !/"ok"\s*:\s*false/.test(m)) return 'added';
  return duplicate(m) ? 'existing' : `${l.email}: ${m}`;
}

// Turn on Instantly's warmup for the accounts just added (create alone leaves it off).
async function instantlyWarmup(key: string, emails: string[]) {
  if (!emails.length) return;
  const res = await fetch('https://api.instantly.ai/api/v2/accounts/warmup/enable', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails }),
  });
  if (!res.ok) console.error('instantly warmup', res.status, await message(res));
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

    const { sequencer, apiKey } = await req.json();
    const key = String(apiKey ?? '').trim();
    if (sequencer !== 'instantly' && sequencer !== 'smartlead') return json({ error: 'Pick Instantly or Smartlead.' }, 400);
    if (key.length < 8) return json({ error: 'Paste your API key.' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: rows, error } = await admin
      .from('inboxes')
      .select('addr, status, inbox_logins(*)')
      .eq('user_id', user.id)
      .not('status', 'in', '(burned,replacing)');
    if (error) throw error;
    const logins: Login[] = (rows ?? [])
      .filter(r => r.inbox_logins)
      .map(r => ({ ...(r.inbox_logins as unknown as Login), email: r.addr }));
    if (!logins.length) return json({ error: 'None of your inboxes are ready to send yet.' }, 400);

    const add = sequencer === 'instantly' ? instantly : smartlead;
    // Check the key on the first inbox before sending the rest.
    let first: Result;
    try {
      first = await add(key, logins[0]);
    } catch (e) {
      if (e instanceof BadKey) return json({ error: `That ${sequencer === 'instantly' ? 'Instantly' : 'Smartlead'} API key didn't work. Check it has permission to create accounts.` }, 400);
      throw e;
    }
    const results: Result[] = [first];
    const queue = logins.slice(1);
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let l = queue.shift(); l; l = queue.shift()) {
          try {
            results.push(await add(key, l));
          } catch (e) {
            results.push(`${l.email}: ${e instanceof BadKey ? 'key was rejected' : 'request failed'}`);
          }
        }
      }),
    );

    const added = results.filter(r => r === 'added').length;
    const existing = results.filter(r => r === 'existing').length;
    const errors = results.filter(r => r !== 'added' && r !== 'existing');
    if (sequencer === 'instantly') await instantlyWarmup(key, logins.map(l => l.email));

    if (added + existing > 0) {
      await admin
        .from('connections')
        .upsert({ user_id: user.id, sequencer, at: new Date().toISOString(), inboxes: added + existing });
    }
    if (errors.length) console.error('push-inboxes', sequencer, errors.length, 'failed', errors.slice(0, 3));
    return json({ added, existing, failed: errors.length, errors: errors.slice(0, 3) });
  } catch (e) {
    console.error(e);
    return json({ error: 'Could not reach your sequencer. Try again, or download the CSV instead.' }, 500);
  }
});

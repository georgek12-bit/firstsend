// Sends order and status emails through Resend. Called by database triggers (via pg_net) whenever
// something happens, but it decides for itself what is due: each email is claimed by stamping its
// *_notified_at column first, so a stray or repeated call can only send each email once.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const SITE = 'https://firstsend.site';
const FROM = 'Firstsend <no-reply@firstsend.site>';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

const page = (title: string, body: string, cta?: { href: string; label: string }) => `<!doctype html>
<html><body style="margin:0;background:#f4f1ea;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1814">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:12px;padding:32px">
<tr><td style="font-size:15px;font-weight:600;padding-bottom:24px">Firstsend</td></tr>
<tr><td style="font-size:22px;font-weight:600;line-height:1.3;padding-bottom:12px">${title}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#4a463e">${body}</td></tr>
${cta ? `<tr><td style="padding-top:24px"><a href="${cta.href}" style="display:inline-block;background:#e8552b;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px">${cta.label}</a></td></tr>` : ''}
</table></td></tr></table></body></html>`;

async function send(to: string[], subject: string, html: string) {
  if (!to.length) throw new Error('No recipients');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function admins() {
  const { data } = await db.from('profiles').select('email').eq('is_admin', true);
  return (data ?? []).map(p => p.email as string);
}

async function profile(id: string) {
  const { data } = await db.from('profiles').select('name, email').eq('id', id).single();
  return data as { name: string; email: string } | null;
}

// Claims rows, sends one email per row, and releases the claim if sending fails so the next call retries.
async function sweep(
  table: 'subscriptions' | 'replacements' | 'support_messages',
  col: string,
  key: string,
  filter: (q: any) => any,
  email: (row: any) => Promise<{ to: string[]; subject: string; html: string }>,
) {
  const { data: rows, error } = await filter(db.from(table).update({ [col]: new Date().toISOString() }).is(col, null)).select();
  if (error) throw error;
  let sent = 0;
  for (const row of rows ?? []) {
    try {
      const m = await email(row);
      await send(m.to, m.subject, m.html);
      sent++;
    } catch (e) {
      console.error(table, col, row[key], e);
      await db.from(table).update({ [col]: null }).eq(key, row[key]);
    }
  }
  return sent;
}

Deno.serve(async () => {
  try {
    const order = await sweep(
      'subscriptions',
      'order_notified_at',
      'user_id',
      q => q.not('setup_stage', 'is', null),
      async s => {
        const [p, biz, doms, to] = await Promise.all([
          profile(s.user_id),
          db.from('businesses').select('company, website').eq('user_id', s.user_id).maybeSingle(),
          db.from('domains').select('name, byod').eq('user_id', s.user_id),
          admins(),
        ]);
        const company = biz.data?.company ?? p?.name ?? 'A customer';
        const list = (doms.data ?? []).map(d => `<li>${esc(d.name)}${d.byod ? ' (their own)' : ''}</li>`).join('');
        return {
          to,
          subject: `New order needs setup: ${company}`,
          html: page(
            'New order needs setup',
            `<p>${esc(company)}${biz.data?.website ? ` (${esc(biz.data.website)})` : ''} is on the ${esc(s.plan)} plan and has picked their domains.</p>
             <p>Customer: ${esc(p?.name ?? '')} &lt;${esc(p?.email ?? '')}&gt;</p>
             ${list ? `<p>Domains:</p><ul>${list}</ul>` : ''}`,
            { href: `${SITE}/admin/?u=${s.user_id}`, label: 'Open in Admin' },
          ),
        };
      },
    );

    const ready = await sweep(
      'subscriptions',
      'ready_notified_at',
      'user_id',
      q => q.eq('setup_stage', 'ready'),
      async s => {
        const p = await profile(s.user_id);
        const first = (p?.name ?? '').split(' ')[0];
        return {
          to: [p!.email],
          subject: "You're ready to send",
          html: page(
            `You're ready to send${first ? `, ${esc(first)}` : ''}`,
            `<p>Your domains and inboxes are set up and warming. Open your dashboard to export your inboxes to your sequencer and grab the launch kit.</p>
             <p>New accounts start at half their daily volume for the first 14 days, then go up automatically.</p>`,
            { href: `${SITE}/app/`, label: 'Open my dashboard' },
          ),
        };
      },
    );

    const repl = await sweep(
      'replacements',
      'notified_at',
      'id',
      q => q.is('done_at', null),
      async r => {
        const [p, to] = await Promise.all([profile(r.user_id), admins()]);
        return {
          to,
          subject: `Replacement requested: ${r.old_addr}`,
          html: page(
            'Replacement requested',
            `<p>${esc(p?.name ?? 'A customer')} &lt;${esc(p?.email ?? '')}&gt; reported a burned inbox:</p>
             <p style="font-family:ui-monospace,Menlo,monospace">${esc(r.old_addr)}</p>`,
            { href: `${SITE}/admin/?u=${r.user_id}`, label: 'Open in Admin' },
          ),
        };
      },
    );

    // Support: a customer message goes to the admins, an admin reply goes to the customer.
    const support = await sweep(
      'support_messages',
      'notified_at',
      'id',
      q => q,
      async m => {
        const [p, t] = await Promise.all([
          profile(m.user_id),
          db.from('support_tickets').select('subject, category').eq('id', m.ticket_id).single(),
        ]);
        const subject = t.data?.subject ?? 'Support';
        const quote = `<p style="white-space:pre-wrap;border-left:3px solid #e8552b;padding-left:12px">${esc(m.body)}</p>`;
        if (m.from_admin) {
          return {
            to: [p!.email],
            subject: `Re: ${subject}`,
            html: page('Firstsend support replied', `${quote}<p>Reply from your dashboard to keep the conversation in one place.</p>`, {
              href: `${SITE}/app/support/?t=${m.ticket_id}`,
              label: 'View and reply',
            }),
          };
        }
        return {
          to: await admins(),
          subject: `Support (${t.data?.category ?? 'other'}): ${subject}`,
          html: page(
            'New support message',
            `<p>${esc(p?.name ?? 'A customer')} &lt;${esc(p?.email ?? '')}&gt; wrote:</p>${quote}`,
            { href: `${SITE}/admin/support/?t=${m.ticket_id}`, label: 'Reply in Admin' },
          ),
        };
      },
    );

    return Response.json({ order, ready, replacement: repl, support });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'failed' }, { status: 500 });
  }
});

'use client';

// Admin view of the sending infrastructure: every sending domain with its Azure verification,
// relay link, inbox counts on both sides, live DNS checks and owner, plus server health.
// Data comes from the read-only infra-status Edge Function.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Loading } from '@/components/Flow';
import LogoMark from '@/components/LogoMark';
import { ago } from '@/components/ui';
import { BRAND } from '@/lib/content';
import { errorText, useStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase';

type Status = {
  checkedAt: string;
  azure: { ok: boolean; error: string | null; sentToday: Record<string, number> | null };
  mailServer: { ok: boolean; error: string | null; queue: number | null; host: string };
  domains: {
    name: string;
    owner: { name: string; email: string; company: string; userId: string } | null;
    azure: { verification: Record<string, string>; linked: boolean; managed: string } | null;
    senders: number;
    inboxes: number;
    missingOnServer: string[];
    missingOnAzure: string[];
    dns: { mx: boolean; spf: boolean; dmarc: string | null };
  }[];
};

// Default ACS limit until a quota increase is granted (per subscription).
const ACS_HOURLY_LIMIT = 100;

function Check({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  const color = ok ? 'var(--good)' : warn ? 'var(--warn)' : 'var(--bad)';
  return (
    <span className="infra-check" title={label}>
      <span className="dot dot--8" style={{ background: color }} />
      {label}
    </span>
  );
}

function verifyLabel(s: string) {
  return s === 'Verified' ? 'Verified' : s === 'VerificationInProgress' || s === 'VerificationRequested' ? 'Checking' : s === 'NotStarted' ? 'Not started' : 'Failed';
}

function DomainRow({ d }: { d: Status['domains'][number] }) {
  const v = d.azure?.verification ?? {};
  const required = ['Domain', 'SPF', 'DKIM', 'DKIM2'];
  const allVerified = required.every(k => v[k] === 'Verified');
  const mismatch = d.missingOnServer.length + d.missingOnAzure.length;
  const ready = !!d.azure && allVerified && d.azure.linked && d.dns.mx && d.dns.spf && d.dns.dmarc === 'reject' && !mismatch && d.inboxes > 0;

  return (
    <section className="ui-card ui-stack" style={{ '--gap': '14px' } as React.CSSProperties}>
      <div className="ui-between" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className="ui-stack" style={{ '--gap': '4px', minWidth: 0 } as React.CSSProperties}>
          <h2 className="ui-h3 mono" style={{ fontSize: 17 }}>
            {d.name}
          </h2>
          <span className="ui-small ui-muted">
            {d.owner ? (
              <Link className="ui-link" href={`/admin?u=${d.owner.userId}`}>
                {d.owner.company || d.owner.name || d.owner.email}
              </Link>
            ) : (
              'Not assigned to a customer'
            )}
          </span>
        </div>
        <span className={`ui-tag${ready ? '' : ' ui-tag--orange'}`}>{ready ? 'Ready to send' : 'Needs attention'}</span>
      </div>

      <div className="infra-grid">
        <div className="ui-stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <span className="ui-label">Microsoft (Azure)</span>
          {d.azure ? (
            <>
              {required.map(k => (
                <Check key={k} ok={v[k] === 'Verified'} warn={v[k] !== 'Failed' && v[k] !== 'VerificationFailed'} label={`${k}: ${verifyLabel(v[k])}`} />
              ))}
              <Check ok={d.azure.linked} label={d.azure.linked ? 'Connected to relay' : 'Not connected to relay'} />
            </>
          ) : (
            <Check ok={false} label="Not added to Azure" />
          )}
        </div>
        <div className="ui-stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <span className="ui-label">DNS (live)</span>
          <Check ok={d.dns.mx} label={d.dns.mx ? 'Replies go to our server' : 'MX not pointing at our server'} />
          <Check ok={d.dns.spf} label={d.dns.spf ? 'SPF allows Microsoft' : 'SPF missing or wrong'} />
          <Check ok={d.dns.dmarc === 'reject'} warn={!!d.dns.dmarc} label={d.dns.dmarc ? `DMARC p=${d.dns.dmarc}` : 'No DMARC'} />
        </div>
        <div className="ui-stack" style={{ '--gap': '8px' } as React.CSSProperties}>
          <span className="ui-label">Inboxes</span>
          <span className="infra-num">{d.inboxes}</span>
          <span className="ui-small ui-muted">
            on the server · {d.senders} sender{d.senders === 1 ? '' : 's'} on Azure
          </span>
          {mismatch > 0 && (
            <span className="ui-small ui-error">
              {d.missingOnServer.length > 0 && `${d.missingOnServer.length} on Azure but not the server. `}
              {d.missingOnAzure.length > 0 && `${d.missingOnAzure.length} on the server but not Azure (they can't send).`}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Infra() {
  const { ready, live, isAdmin, state } = useStore();
  const router = useRouter();
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && live && !state.account) router.replace('/login');
    else if (ready && live && !isAdmin) router.replace('/app');
  }, [ready, live, isAdmin, state.account, router]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await getSupabase().functions.invoke('infra-status');
      if (error) {
        let msg = error.message;
        try {
          msg = (await (error as { context?: Response }).context?.json())?.error ?? msg;
        } catch {}
        throw new Error(msg);
      }
      setData(data as Status);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (ready && live && isAdmin) load();
  }, [ready, live, isAdmin, load]);

  if (!live) {
    return (
      <div className="main">
        <h1 className="ui-h1">Infrastructure</h1>
        <p className="ui-sub">This page works once the app is connected to Supabase.</p>
      </div>
    );
  }
  if (!ready || !isAdmin) return <Loading />;

  const sent = data?.azure.sentToday;
  const sentTotal = sent ? Object.values(sent).reduce((n, x) => n + x, 0) : null;
  const failed = sent ? Object.entries(sent).filter(([k]) => /fail|bounce|suppress|quarantin/i.test(k)).reduce((n, [, x]) => n + x, 0) : 0;
  const attention = data?.domains.filter(d => !(d.azure && ['Domain', 'SPF', 'DKIM', 'DKIM2'].every(k => d.azure!.verification[k] === 'Verified') && d.azure.linked && d.dns.mx && d.dns.spf)).length ?? 0;

  return (
    <div className="shell">
      <aside className="side">
        <div className="side__brand">
          <Link href="/admin">
            <LogoMark tone="cream" />
            {BRAND}
          </Link>
          <span className="ui-tag" style={{ borderColor: 'var(--ink-line)' }}>
            Infra
          </span>
        </div>
        <div className="side__foot">
          <Link href="/admin" className="ui-btn ui-btn--ghost ui-btn--sm">
            Back to orders
          </Link>
        </div>
      </aside>
      <main className="main ui-stack" style={{ '--gap': '24px' } as React.CSSProperties}>
        <div className="page-head">
          <div className="page-head__text">
            <span className="ui-label">Admin</span>
            <h1 className="ui-h1">Sending infrastructure</h1>
            <p className="ui-sub">Every sending domain, checked live against Microsoft, our mail server and DNS.</p>
          </div>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={load} disabled={busy}>
            {busy ? 'Checking…' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="ui-banner ui-banner--bad" role="alert">
            {error}
          </div>
        )}

        {!data && !error && <Loading />}

        {data && (
          <>
            <div className="kpis">
              <div className="kpi">
                <span className="ui-label">Mail server</span>
                <Check ok={data.mailServer.ok} label={data.mailServer.ok ? `${data.mailServer.host} up` : data.mailServer.error ?? 'Down'} />
              </div>
              <div className="kpi">
                <span className="ui-label">Waiting in queue</span>
                <span className="kpi__value">{data.mailServer.queue ?? '?'}</span>
              </div>
              <div className="kpi">
                <span className="ui-label">Sent through Microsoft today</span>
                <span className="kpi__value">{sentTotal ?? '?'}</span>
                {sent && failed > 0 && <span className="ui-small ui-error">{failed} failed or bounced</span>}
              </div>
              <div className="kpi">
                <span className="ui-label">Microsoft limit</span>
                <span className="kpi__value">{ACS_HOURLY_LIMIT}/hr</span>
                <span className="ui-small ui-muted">Default until a quota increase</span>
              </div>
              <div className="kpi">
                <span className="ui-label">Domains needing attention</span>
                <span className="kpi__value">
                  {attention} / {data.domains.length}
                </span>
              </div>
            </div>

            {!data.azure.ok && (
              <div className="ui-banner ui-banner--warn" role="alert">
                Couldn&apos;t read Azure: {data.azure.error}
              </div>
            )}

            {data.domains.length ? (
              data.domains.map(d => <DomainRow key={d.name} d={d} />)
            ) : (
              <section className="ui-card ui-card--soft ui-stack">
                <h2 className="ui-h3">No sending domains yet</h2>
                <p className="ui-muted">
                  Add one with <span className="mono">python3 infra/provision_domain.py &lt;domain&gt; --person &quot;First Last&quot;</span> and it will show up here.
                </p>
              </section>
            )}

            <p className="ui-small ui-muted">Checked {ago(new Date(data.checkedAt).getTime(), Date.now())}.</p>
          </>
        )}
      </main>
    </div>
  );
}

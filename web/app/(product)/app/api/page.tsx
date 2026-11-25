'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import SettingsTabs from '@/components/SettingsTabs';
import { Field, copyText, date, useToast } from '@/components/ui';
import { API_BASE } from '@/lib/apiDocs';
import { LIVE, getSupabase } from '@/lib/supabase';

type Key = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };

export default function ApiKeys() {
  const [toast, show] = useToast();
  const [keys, setKeys] = useState<Key[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; key: string } | null>(null);
  const keyRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    const { data } = await getSupabase()
      .from('api_keys')
      .select('id, name, prefix, created_at, last_used_at, revoked_at')
      .is('revoked_at', null)
      .order('created_at', { ascending: false });
    setKeys((data ?? []) as Key[]);
  }, []);

  useEffect(() => {
    if (LIVE) load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { data, error } = await getSupabase().rpc('create_api_key', { p_name: name.trim() || 'API key' });
    setBusy(false);
    if (error) return setErr(error.message);
    setCreated({ name: data.name, key: data.key });
    setName('');
    load();
  };

  const revoke = async (k: Key) => {
    if (!window.confirm(`Revoke “${k.name}”? Anything using this key will stop working straight away.`)) return;
    const { error } = await getSupabase().rpc('revoke_api_key', { p_id: k.id });
    if (error) return show(error.message);
    show('Key revoked.');
    load();
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Settings</span>
          <h1 className="ui-h1">API</h1>
          <p className="ui-sub">Manage your inboxes and pull free leads from your own code. Included on every plan.</p>
        </div>
        <Link href="/docs/api" className="ui-btn ui-btn--ghost">
          Read the docs
        </Link>
      </div>

      <SettingsTabs />

      {!LIVE ? (
        <div className="ui-card ui-card--soft">
          <p>API keys work on the live site once you&apos;re signed in.</p>
        </div>
      ) : (
        <div className="cols">
          <div className="ui-stack" style={{ '--gap': '20px' } as React.CSSProperties}>
            {created && (
              <div className="ui-card ui-card--shadow ui-stack" style={{ '--gap': '12px' } as React.CSSProperties} role="status">
                <span className="ui-label">New key: {created.name}</span>
                <p>
                  <strong>Copy it now.</strong> For your security we only show it once. If you lose it, revoke it and make a new one.
                </p>
                <code className="api-key" ref={keyRef}>
                  {created.key}
                </code>
                <div className="seq-actions">
                  <button
                    type="button"
                    className="ui-btn ui-btn--orange ui-btn--sm"
                    onClick={async () => show((await copyText(created.key, keyRef.current)) ? 'Key copied.' : 'Selected. Press Ctrl+C or Cmd+C to copy.')}
                  >
                    Copy key
                  </button>
                  <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setCreated(null)}>
                    I&apos;ve saved it
                  </button>
                </div>
              </div>
            )}

            <section className="ui-card ui-stack" style={{ '--gap': '14px' } as React.CSSProperties} aria-labelledby="keys-h">
              <h2 id="keys-h" className="ui-h2" style={{ fontSize: 24 }}>
                Your keys
              </h2>
              {!keys.length ? (
                <p className="ui-muted">No keys yet. Create one to start using the API.</p>
              ) : (
                <ul className="leads-history">
                  {keys.map(k => (
                    <li key={k.id}>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate">{k.name}</div>
                        <div className="ui-small ui-muted">
                          <span className="mono">{k.prefix}…</span> · created {date(new Date(k.created_at).getTime())} ·{' '}
                          {k.last_used_at ? `last used ${date(new Date(k.last_used_at).getTime())}` : 'never used'}
                        </div>
                      </div>
                      <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => revoke(k)}>
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form className="api-create" onSubmit={create} noValidate>
                <Field id="key-name" label="New key name" hint="So you know where it's used, like “Zapier” or “Client onboarding script”." error={err}>
                  <input id="key-name" className="ui-input" value={name} maxLength={60} placeholder="e.g. Zapier" onChange={e => setName(e.target.value)} />
                </Field>
                <button type="submit" className="ui-btn" disabled={busy}>
                  {busy ? 'Creating…' : 'Create key'}
                </button>
              </form>
            </section>
          </div>

          <div className="ui-card ui-card--soft ui-stack" style={{ '--gap': '10px' } as React.CSSProperties}>
            <span className="ui-label">Quick start</span>
            <p className="ui-small">Send your key in the x-api-token header:</p>
            <pre className="api-snippet">{`curl ${API_BASE}/v1/inboxes \\
  -H "x-api-token: YOUR_KEY"`}</pre>
            <p className="ui-small ui-muted">
              Keys act as you, so keep them out of websites and shared code. Up to 10 active keys, 120 requests a minute each.
            </p>
            <Link href="/docs/api" className="ui-link ui-small">
              Full API reference
            </Link>
          </div>
        </div>
      )}
      {toast}
    </>
  );
}

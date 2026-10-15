'use client';

import { useRef, useState } from 'react';
import { copyText, downloadCsv, useToast } from '@/components/ui';
import { LEADS, TEMPLATES, WARMUP_GUIDE } from '@/lib/kit';
import { useView } from '@/lib/view';

type Tab = 'templates' | 'warmup' | 'leads';

function Template({ t, onCopy }: { t: (typeof TEMPLATES)[number]; onCopy: (ok: boolean) => void }) {
  const ref = useRef<HTMLPreElement>(null);
  return (
    <article className="ui-card template">
      <div className="ui-between">
        <h3 className="ui-h2" style={{ fontSize: 24 }}>
          {t.name}
        </h3>
        <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={async () => onCopy(await copyText(`Subject: ${t.subject}\n\n${t.body}`, ref.current))}>
          Copy
        </button>
      </div>
      <p className="ui-small ui-muted">{t.when}</p>
      <pre ref={ref}>
        <span className="ui-label" style={{ display: 'block', marginBottom: 8 }}>
          Subject: {t.subject}
        </span>
        {t.body}
      </pre>
    </article>
  );
}

export default function Kit() {
  const { counts, total } = useView();
  const [tab, setTab] = useState<Tab>('templates');
  const [toast, show] = useToast();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'templates', label: 'Copy templates' },
    { id: 'warmup', label: 'Warmup guide' },
    { id: 'leads', label: 'Starter lead list' },
  ];

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Launch kit</span>
          <h1 className="ui-h1">Everything for campaign one.</h1>
          <p className="ui-sub">Copy that works for first campaigns, a plain-English warmup guide, and leads to run your first test.</p>
        </div>
      </div>

      <div className="filters" role="tablist" aria-label="Launch kit sections">
        {tabs.map(t => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-pressed={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'templates' && (
          <div className="ui-stack">
            <p className="ui-muted ui-small">
              Swap the {'{{fields}}'} for your own details. Your sequencer fills in names and companies.
            </p>
            <div className="kit-grid">
              {TEMPLATES.map(t => (
                <Template key={t.id} t={t} onCopy={ok => show(ok ? 'Copied to clipboard.' : 'Selected. Press Ctrl+C or Cmd+C to copy.')} />
              ))}
            </div>
          </div>
        )}

        {tab === 'warmup' && (
          <div className="cols">
            <ol className="ui-card steps" style={{ padding: '8px 24px' }}>
              {WARMUP_GUIDE.map((s, i) => (
                <li key={s.t} className="is-done" style={{ gridTemplateColumns: '32px minmax(0,1fr)' }}>
                  <span className="steps__mark">{i + 1}</span>
                  <div>
                    <div className="steps__title">{s.t}</div>
                    <div className="ui-muted">{s.d}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="ui-card ui-card--soft ui-stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <span className="ui-label">Your warmup right now</span>
              {total ? (
                <>
                  <p style={{ fontSize: 18 }}>
                    {counts.good} of {total} inboxes are ready. {counts.warming} still warming.
                  </p>
                  <div className="ui-progress" aria-hidden="true">
                    <span style={{ width: `${(counts.good / total) * 100}%` }} />
                  </div>
                </>
              ) : (
                <p>Warmup starts automatically when setup finishes.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'leads' && (
          <div className="ui-stack">
            <div className="ui-between">
              <p className="ui-muted ui-small">{LEADS.length} sample B2B leads to test your first sequence. Verify before sending.</p>
              <button
                type="button"
                className="ui-btn ui-btn--sm"
                onClick={() => {
                  downloadCsv('starter-leads.csv', [['First name', 'Last name', 'Role', 'Company', 'Email'], ...LEADS.map(l => [l.first, l.last, l.role, l.company, l.email])]);
                  show('Lead list downloaded.');
                }}
              >
                Download CSV
              </button>
            </div>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Role</th>
                    <th scope="col">Company</th>
                    <th scope="col">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {LEADS.map(l => (
                    <tr key={l.email}>
                      <td>
                        {l.first} {l.last}
                      </td>
                      <td className="ui-muted">{l.role}</td>
                      <td>{l.company}</td>
                      <td className="mono" style={{ fontSize: 13 }}>
                        {l.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {toast}
    </>
  );
}

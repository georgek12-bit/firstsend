'use client';

import { useState } from 'react';
import { SEQUENCER_OPTIONS } from '@/lib/sequencers';
import { useStore } from '@/lib/store';
import type { SequencerId } from '@/lib/types';
import { Field, downloadCsv } from './ui';

/** Pick a sequencer, connect it with an API key, or download a CSV instead. */
export default function ExportPanel({ onDone }: { onDone: (msg: string) => void }) {
  const { state, connect } = useStore();
  const pref = state.business?.sequencer;
  const [seq, setSeq] = useState<SequencerId>(pref && pref !== 'other' ? pref : 'instantly');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = SEQUENCER_OPTIONS.find(s => s.id === seq)!.name;
  const sendable = state.inboxes.filter(b => b.status !== 'replacing' && b.status !== 'burned');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim().length < 8) {
      setError(`Paste your ${name} API key. You'll find it under Settings, then API.`);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      connect(seq);
      onDone(`${sendable.length} inboxes sent to ${name}.`);
    }, 1000);
  };

  const csv = () => {
    downloadCsv('firstsend-inboxes.csv', [
      ['Email', 'First name', 'SMTP host', 'SMTP port', 'IMAP host', 'IMAP port', 'Daily limit', 'Status'],
      ...sendable.map(b => {
        const local = b.addr.split('@')[0].split('.')[0];
        return [b.addr, local[0].toUpperCase() + local.slice(1), 'smtp.office365.com', 587, 'outlook.office365.com', 993, 20, b.status];
      }),
    ]);
    onDone('CSV downloaded.');
  };

  return (
    <form className="ui-stack" style={{ '--gap': '18px' } as React.CSSProperties} onSubmit={submit} noValidate>
      <div className="seq-grid" role="group" aria-label="Sequencer">
        {SEQUENCER_OPTIONS.map(s => (
          <button key={s.id} type="button" className="seq-tile" aria-pressed={seq === s.id} onClick={() => (setSeq(s.id), setError(null))}>
            <span className="seq-tile__logo">
              <img src={s.logo.src} alt={s.logo.label ? '' : s.name} style={{ filter: s.logo.invert ? 'invert(1)' : undefined }} />
              {s.logo.label && <span>{s.logo.label}</span>}
            </span>
            <span style={{ opacity: 0.7, fontSize: 12 }}>{seq === s.id ? 'Selected' : 'Choose'}</span>
          </button>
        ))}
      </div>
      <Field id="api-key" label={`${name} API key`} error={error} hint="We only use it to add your inboxes. Remove access any time.">
        <input
          id="api-key"
          className="ui-input mono"
          autoComplete="off"
          placeholder="sk_live_…"
          value={key}
          onChange={e => (setKey(e.target.value), setError(null))}
          aria-invalid={!!error}
        />
      </Field>
      <div className="ui-row">
        <button type="submit" className="ui-btn ui-btn--orange" disabled={busy || !sendable.length}>
          {busy ? 'Connecting…' : `Send ${sendable.length} inboxes to ${name}`}
        </button>
        <button type="button" className="ui-link ui-small" onClick={csv} disabled={!sendable.length}>
          Or download a CSV
        </button>
      </div>
      <p className="ui-small ui-muted">Burned inboxes and ones being replaced are left out. Replacements are added automatically once they&apos;re ready.</p>
    </form>
  );
}

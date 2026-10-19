'use client';

import { useState } from 'react';
import { SENDS_PER_INBOX } from '@/lib/plans';
import { SEQUENCER_OPTIONS } from '@/lib/sequencers';
import { errorText, useStore } from '@/lib/store';
import type { SequencerId } from '@/lib/types';
import { downloadCsv } from './ui';

// Where each sequencer's bulk upload lives.
const STEPS: Record<SequencerId, string[]> = {
  instantly: ['Go to Email Accounts, then Add New.', 'Choose Any Provider (IMAP / SMTP), then Bulk import from CSV.', 'Upload the file and confirm the columns.'],
  smartlead: ['Go to Email Accounts, then Add Account(s).', 'Choose SMTP / IMAP, then Bulk upload.', 'Upload the file and match the columns.'],
  emailbison: ['Go to Email Accounts, then Add.', 'Choose IMAP / SMTP bulk import.', 'Upload the file and match the columns.'],
  lemlist: ['Go to Settings, then Email accounts.', 'Add each inbox as a custom SMTP / IMAP account.', 'Copy the host, port, username and password from the file.'],
  apollo: ['Go to Settings, then Mailboxes.', 'Add each inbox as a custom SMTP / IMAP mailbox.', 'Copy the host, port, username and password from the file.'],
};

// Instantly's bulk import layout. The other sequencers accept the same columns.
const HEADER = [
  'Email', 'First Name', 'Last Name',
  'IMAP Username', 'IMAP Password', 'IMAP Host', 'IMAP Port',
  'SMTP Username', 'SMTP Password', 'SMTP Host', 'SMTP Port',
  'Daily Limit', 'Warmup Enabled', 'Warmup Limit', 'Warmup Increment',
];

/** Pick a sequencer and download the inboxes with their logins, ready to bulk upload. */
export default function ExportPanel({ onDone }: { onDone: (msg: string) => void }) {
  const { state, connect } = useStore();
  const pref = state.business?.sequencer;
  const [seq, setSeq] = useState<SequencerId>(pref && pref !== 'other' ? pref : 'instantly');
  const [error, setError] = useState<string | null>(null);
  const name = SEQUENCER_OPTIONS.find(s => s.id === seq)!.name;
  const active = state.inboxes.filter(b => b.status !== 'replacing' && b.status !== 'burned');
  const sendable = active.filter(b => b.login);
  const pending = active.length - sendable.length;

  const download = () => {
    downloadCsv(`firstsend-inboxes-${seq}.csv`, [
      HEADER,
      ...sendable.map(({ addr, login: l }) => [
        addr, l!.firstName, l!.lastName,
        l!.imapUsername, l!.imapPassword, l!.imapHost, l!.imapPort,
        l!.smtpUsername, l!.smtpPassword, l!.smtpHost, l!.smtpPort,
        SENDS_PER_INBOX, 'TRUE', 10, 1,
      ]),
    ]);
    // Record the export so the dashboard can show it.
    connect(seq)
      .then(() => onDone(`${sendable.length} inboxes downloaded for ${name}.`))
      .catch(err => setError(errorText(err)));
  };

  return (
    <div className="ui-stack" style={{ '--gap': '18px' } as React.CSSProperties}>
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
      <div className="ui-stack" style={{ '--gap': '6px' } as React.CSSProperties}>
        <span className="ui-label">Then in {name}</span>
        <ol className="ui-small" style={{ margin: 0, paddingLeft: 18 }}>
          {STEPS[seq].map(s => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      {error && (
        <div className="ui-error" role="alert">
          {error}
        </div>
      )}
      <div className="ui-row">
        <button type="button" className="ui-btn ui-btn--orange" onClick={download} disabled={!sendable.length}>
          Download {sendable.length} inboxes for {name}
        </button>
      </div>
      <p className="ui-small ui-muted">
        The file includes each inbox&apos;s password, so keep it private.
        {pending > 0 && ` ${pending} ${pending === 1 ? 'inbox is' : 'inboxes are'} still being set up and will be in the file once ready.`} Burned inboxes and ones
        being replaced are left out. Download again after a replacement is ready.
      </p>
    </div>
  );
}

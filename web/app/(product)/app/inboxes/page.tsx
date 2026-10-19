'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import ExportPanel from '@/components/ExportPanel';
import { Modal, StatusPill, useToast } from '@/components/ui';
import { fmt } from '@/lib/plans';
import { errorText } from '@/lib/store';
import type { Inbox } from '@/lib/types';
import { useView } from '@/lib/view';

type Filter = 'all' | 'attention' | 'warming' | 'good';

const MATCH: Record<Filter, (b: Inbox) => boolean> = {
  all: () => true,
  attention: b => b.status === 'burned' || b.status === 'watch' || b.status === 'replacing',
  warming: b => b.status === 'warming',
  good: b => b.status === 'good',
};

function Inboxes() {
  const { state, counts, total, ready, cap, requestReplacement } = useView();
  const params = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>((params.get('filter') as Filter) || 'all');
  const [q, setQ] = useState('');
  const [toast, showToast] = useToast();
  const exportOpen = params.get('export') === '1' && ready;

  const setExport = (open: boolean) => router.replace(open ? '/app/inboxes?export=1' : '/app/inboxes', { scroll: false });

  const rows = state.inboxes.filter(b => MATCH[filter](b) && b.addr.includes(q.trim().toLowerCase()));
  const perInbox = total ? Math.round(cap / total) : 0;

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'All', n: total },
    { id: 'attention', label: 'Needs attention', n: counts.burned + counts.watch + counts.replacing },
    { id: 'warming', label: 'Warming up', n: counts.warming },
    { id: 'good', label: 'Good to send', n: counts.good },
  ];

  const replace = async (b: Inbox) => {
    try {
      await requestReplacement(b.id);
      showToast(`Replacing ${b.addr}. Free, as promised.`);
    } catch (err) {
      showToast(errorText(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Inbox health</span>
          <h1 className="ui-h1">Inboxes</h1>
          <p className="ui-sub">
            We check every inbox around the clock. If one burns, replace it here for free. Each inbox sends up to {perInbox || 20} emails a day.
          </p>
        </div>
        <button type="button" className="ui-btn ui-btn--orange" disabled={!ready} onClick={() => setExport(true)}>
          Export to sequencer
        </button>
      </div>

      {!ready ? (
        <div className="empty">Your inboxes appear here when setup finishes.</div>
      ) : (
        <>
          <div className="ui-between">
            <div className="filters" role="group" aria-label="Filter inboxes">
              {filters.map(f => (
                <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                  {f.label} <span className="ui-num" style={{ opacity: 0.6 }}>{f.n}</span>
                </button>
              ))}
            </div>
            <label className="ui-field" style={{ flex: '0 1 260px' }}>
              <span className="sr-only">Search inboxes</span>
              <input className="ui-input" type="search" placeholder="Search inboxes" value={q} onChange={e => setQ(e.target.value)} style={{ minHeight: 38 }} />
            </label>
          </div>

          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">Inbox</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">
                    Sent today
                  </th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(b => (
                  <tr key={b.id}>
                    <td className="mono" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                      {b.addr}
                    </td>
                    <td>
                      <StatusPill status={b.status} />
                    </td>
                    <td className="num">{b.status === 'good' ? fmt(Math.round(perInbox * 0.7)) : b.status === 'warming' ? 'Warmup' : '0'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {(b.status === 'burned' || b.status === 'watch') && (
                        <button type="button" className={`ui-btn ui-btn--sm ${b.status === 'burned' ? 'ui-btn--danger' : 'ui-btn--ghost'}`} onClick={() => replace(b)}>
                          Replace free
                        </button>
                      )}{' '}
                      <Link href={`/app/support?new=1&inbox=${b.id}`} className="ui-link ui-small">
                        Report a problem
                      </Link>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="ui-muted" style={{ padding: 28, textAlign: 'center' }}>
                      {filter === 'attention' ? 'Nothing needs attention. All good.' : 'No inboxes match.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="ui-small ui-muted">
            <b>Watch</b> means bounces or spam reports are creeping up. We pause it automatically if it gets worse. <b>Burned</b> means it&apos;s
            no longer landing in inboxes.
          </p>
        </>
      )}

      <Modal open={exportOpen} onClose={() => setExport(false)} title="Export to your sequencer">
        <ExportPanel
          onDone={msg => {
            setExport(false);
            showToast(msg);
          }}
        />
      </Modal>
      {toast}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Inboxes />
    </Suspense>
  );
}

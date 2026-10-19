'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { NewTicket, Thread, TicketList, useTickets } from '@/components/Support';
import { useStore } from '@/lib/store';

function Support() {
  const { state, live } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const { tickets, reload } = useTickets(false);
  const selected = params.get('t');
  const creating = params.get('new') === '1' || (tickets !== null && !tickets.length);
  const current = tickets?.find(t => t.id === selected);
  const go = (q: string) => router.replace(`/app/support${q}`, { scroll: false });

  if (!live) {
    return (
      <div className="page-head__text">
        <span className="ui-label">Support</span>
        <h1 className="ui-h1">Support</h1>
        <p className="ui-sub">Support chat works on the live site.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <span className="ui-label">Support</span>
          <h1 className="ui-h1">Get help</h1>
          <p className="ui-sub">Flag a problem with an inbox, deliverability, setup or billing. We reply here and by email.</p>
        </div>
        {!creating && (
          <button type="button" className="ui-btn ui-btn--orange" onClick={() => go('?new=1')}>
            New ticket
          </button>
        )}
      </div>

      <div className="support">
        <div className="ui-stack" style={{ '--gap': '10px' } as React.CSSProperties}>
          <span className="ui-label">Your tickets</span>
          {tickets ? <TicketList tickets={tickets} selected={creating ? null : selected} onSelect={id => go(`?t=${id}`)} /> : <p className="ui-muted ui-small">Loading…</p>}
        </div>
        {creating ? (
          <NewTicket
            inboxes={state.inboxes}
            initialInbox={params.get('inbox')}
            onCancel={tickets?.length ? () => go('') : undefined}
            onCreated={async id => {
              await reload();
              go(`?t=${id}`);
            }}
          />
        ) : current ? (
          <Thread ticket={current} onChange={reload} />
        ) : (
          tickets && <p className="ui-muted">Pick a ticket to see the conversation, or open a new one.</p>
        )}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Support />
    </Suspense>
  );
}

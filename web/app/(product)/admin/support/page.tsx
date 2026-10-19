'use client';

// Admin side of support: every customer's tickets, newest activity first.
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Loading } from '@/components/Flow';
import LogoMark from '@/components/LogoMark';
import { Thread, TicketList, useTickets } from '@/components/Support';
import { BRAND } from '@/lib/content';
import { useStore } from '@/lib/store';

function AdminSupport() {
  const { ready, live, isAdmin, state } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get('t');
  const [filter, setFilter] = useState<'reply' | 'open' | 'all'>('reply');
  const { tickets, reload } = useTickets(true);

  useEffect(() => {
    if (ready && live && !state.account) router.replace('/login');
    else if (ready && live && !isAdmin) router.replace('/app');
  }, [ready, live, isAdmin, state.account, router]);

  const list = useMemo(
    () =>
      (tickets ?? []).filter(t =>
        filter === 'all' ? true : filter === 'open' ? t.status === 'open' : t.status === 'open' && t.waiting_on === 'admin',
      ),
    [tickets, filter],
  );
  const current = tickets?.find(t => t.id === selected);
  const waiting = (tickets ?? []).filter(t => t.status === 'open' && t.waiting_on === 'admin').length;

  if (!live) {
    return (
      <div className="main">
        <h1 className="ui-h1">Support</h1>
        <p className="ui-sub">Support works once the app is connected to Supabase.</p>
      </div>
    );
  }
  if (!ready || !isAdmin || !tickets) return <Loading />;

  return (
    <div className="shell">
      <aside className="side">
        <div className="side__brand">
          <Link href="/admin">
            <LogoMark tone="cream" />
            {BRAND}
          </Link>
          <span className="ui-tag" style={{ borderColor: 'var(--ink-line)' }}>
            Support
          </span>
        </div>
        <div className="filters" role="group" aria-label="Show">
          <button type="button" aria-pressed={filter === 'reply'} onClick={() => setFilter('reply')} style={{ color: 'inherit' }}>
            Needs reply ({waiting})
          </button>
          <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')} style={{ color: 'inherit' }}>
            Open
          </button>
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} style={{ color: 'inherit' }}>
            All
          </button>
        </div>
        <div className="side__foot">
          <Link href="/admin" className="ui-btn ui-btn--ghost ui-btn--sm">
            Back to orders
          </Link>
        </div>
      </aside>
      <main className="main">
        <div className="support">
          {list.length ? (
            <TicketList admin tickets={list} selected={selected} onSelect={id => router.replace(`/admin/support?t=${id}`, { scroll: false })} />
          ) : (
            <p className="ui-muted">Nothing here.</p>
          )}
          {current ? (
            <div className="ui-stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <Thread admin ticket={current} onChange={reload} />
              <Link href={`/admin?u=${current.user_id}`} className="ui-link ui-small">
                Open this customer&apos;s order
              </Link>
            </div>
          ) : (
            <p className="ui-muted">Pick a ticket.</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <AdminSupport />
    </Suspense>
  );
}

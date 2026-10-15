'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loading, useGuard } from '@/components/Flow';
import LogoMark from '@/components/LogoMark';
import { BRAND } from '@/lib/content';
import { fmt, planById } from '@/lib/plans';
import { setupProgress } from '@/lib/sim';
import { useStore } from '@/lib/store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const ok = useGuard('/app');
  const { state, now, logout } = useStore();
  const path = usePathname();
  const router = useRouter();

  if (!ok) return <Loading />;

  const plan = planById(state.subscription!.plan);
  const setupDone = setupProgress(state.setupStartedAt, now).done && state.inboxes.length > 0;
  const attention = state.inboxes.filter(b => b.status === 'burned').length;

  const nav = [
    { href: '/app', label: 'Dashboard' },
    ...(setupDone ? [] : [{ href: '/app/setup', label: 'Setup' }]),
    { href: '/app/inboxes', label: 'Inboxes', count: attention },
    { href: '/app/kit', label: 'Launch kit' },
    { href: '/app/billing', label: 'Billing' },
    { href: '/app/settings', label: 'Settings' },
  ];

  const signOut = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="side__brand">
          <Link href="/app">
            <LogoMark tone="cream" />
            {BRAND}
          </Link>
          <div className="side__menu">
            <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={signOut}>
              Log out
            </button>
          </div>
        </div>
        <nav className="side__nav" aria-label="App">
          {nav.map(n => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}>
              {n.label}
              {!!n.count && (
                <span className="side__count" aria-label={`${n.count} need attention`}>
                  {n.count}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="side__foot">
          <div className="ui-stack" style={{ '--gap': '4px' } as React.CSSProperties}>
            <span className="ui-label" style={{ color: 'inherit', opacity: 0.6 }}>
              {plan.name} plan
            </span>
            <span>{fmt(plan.perDay)} emails a day</span>
          </div>
          <div className="ui-stack" style={{ '--gap': '2px', minWidth: 0 } as React.CSSProperties}>
            <span>{state.account!.name}</span>
            <span className="truncate" style={{ opacity: 0.6, fontSize: 13 }}>
              {state.account!.email}
            </span>
          </div>
          <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={signOut}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

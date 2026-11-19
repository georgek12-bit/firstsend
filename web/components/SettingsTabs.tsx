'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app/settings', label: 'Account' },
  { href: '/app/billing', label: 'Billing' },
];

/** Account and Billing live under Settings in the sidebar; this switches between them. */
export default function SettingsTabs() {
  const path = usePathname().replace(/\/$/, '');
  return (
    <nav className="filters" aria-label="Settings sections">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className="filters__link" aria-current={path === t.href ? 'page' : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

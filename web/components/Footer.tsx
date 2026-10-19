import Link from 'next/link';
import { BRAND } from '@/lib/content';
import { legalLinks } from '@/lib/legal';
import LogoMark from './LogoMark';

export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer__brand">
        <LogoMark size="sm" tone="cream" />© {new Date().getFullYear()} {BRAND}
      </span>
      <nav className="footer__links" aria-label="Legal">
        {legalLinks.map(l => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

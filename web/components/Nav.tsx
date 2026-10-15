import Link from 'next/link';
import { BRAND, navLinks } from '@/lib/content';
import LogoMark from './LogoMark';

export default function Nav() {
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/" className="nav__brand">
        <LogoMark />
        {BRAND}
      </Link>
      <div className="nav__links">
        {navLinks.map(l => (
          <a key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
      </div>
      <div className="nav__actions">
        <Link href="/login" className="nav__login">
          Log in
        </Link>
        <Link href="/signup" className="btn btn--ink">
          Start sending
        </Link>
      </div>
    </nav>
  );
}

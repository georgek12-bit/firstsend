import Link from 'next/link';
import { BRAND, footerLinks } from '@/lib/content';
import { LOWEST_PRICE } from '@/lib/plans';
import { reveal } from '@/lib/reveal';
import LogoMark from './LogoMark';

export default function FinalCta() {
  return (
    <section className="final">
      <h2 className="h2 h2--final" {...reveal('32px')}>
        Your first campaign <span className="italic final__accent">goes out today.</span>
      </h2>
      <div className="final__row" {...reveal('16px', 120)}>
        <Link href="/signup" className="btn btn--orange btn--xl">
          Start sending <span className="mono">→</span>
        </Link>
        <span className="final__note">From ${LOWEST_PRICE}/mo · Cancel anytime · No call needed</span>
      </div>
      <footer className="footer">
        <span className="footer__brand">
          <LogoMark size="sm" tone="cream" />© {new Date().getFullYear()} {BRAND}
        </span>
        <div className="footer__links">
          {footerLinks.map(l => (
            <a key={l} href="#">
              {l}
            </a>
          ))}
        </div>
      </footer>
    </section>
  );
}

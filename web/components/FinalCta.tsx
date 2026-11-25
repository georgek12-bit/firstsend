import Link from 'next/link';
import { LOWEST_PRICE } from '@/lib/plans';
import { reveal } from '@/lib/reveal';
import Footer from './Footer';

export default function FinalCta() {
  return (
    <section className="final">
      <div className="final__box" {...reveal('12px')}>
        <h2 className="final__title">
          Your first campaign <span className="final__muted">goes out today</span>
        </h2>
        <p className="final__note">From ${LOWEST_PRICE}/mo · Unlimited leads included · Cancel anytime</p>
        <Link href="/signup" className="btn btn--orange btn--xl">
          Start sending
        </Link>
      </div>
      <Footer />
    </section>
  );
}

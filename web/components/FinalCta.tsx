import Link from 'next/link';
import { LOWEST_PRICE } from '@/lib/plans';
import { reveal } from '@/lib/reveal';
import Footer from './Footer';

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
      <Footer />
    </section>
  );
}

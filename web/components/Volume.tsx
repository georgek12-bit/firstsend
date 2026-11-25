import Link from 'next/link';
import { planIncludes } from '@/lib/content';
import { PLANS, fmt } from '@/lib/plans';
import { reveal } from '@/lib/reveal';
import SectionHead from './SectionHead';

const FEATURED = 'growth';

export default function Volume({ as = 'h2' }: { as?: 'h1' | 'h2' }) {
  return (
    <section id="volume" className="volume">
      <SectionHead
        as={as}
        label="Pricing"
        title="Two plans, priced by"
        muted="emails a day"
        lede="Unlimited leads, the launch kit and the guarantee come with both. Move up when you land the next client."
      />

      <div className="tiers">
        {PLANS.map((p, i) => {
          const featured = p.id === FEATURED;
          return (
            <div key={p.id} className={`tier${featured ? ' tier--feature' : ''}`} {...reveal('12px', i * 80)}>
              <div className="tier__head">
                <span className="tier__name">{p.name}</span>
                {featured && <span className="tier__badge">Recommended</span>}
              </div>
              <div className="tier__vol">{fmt(p.perDay)} emails a day + unlimited leads</div>
              <div className="tier__price">
                ${p.price}
                <span>/mo</span>
              </div>
              <Link href={`/signup?plan=${p.id}`} className={`btn btn--lg ${featured ? 'btn--orange' : 'btn--ghost'}`}>
                Start with {p.name}
              </Link>
              <ul className="tier__list">
                {planIncludes.map(f => (
                  <li key={f}>
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M3 8.5l3.2 3L13 4.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="tiers__more" {...reveal('12px')}>
        <div>
          <h3>Need more than {fmt(PLANS[PLANS.length - 1].perDay)} a day?</h3>
          <p>Tell us your volume and we will size a setup for you</p>
        </div>
        <a href="mailto:support@firstsend.site?subject=Higher%20volume" className="btn btn--ghost btn--lg">
          Contact us
        </a>
      </div>
    </section>
  );
}

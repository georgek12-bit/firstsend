import type { Metadata } from 'next';
import Link from 'next/link';
import Faq from '@/components/Faq';
import FinalCta from '@/components/FinalCta';
import Motion from '@/components/Motion';
import Nav from '@/components/Nav';
import { BRAND } from '@/lib/content';
import { PLANS, fmt } from '@/lib/plans';
import { reveal } from '@/lib/reveal';

export const metadata: Metadata = {
  title: `Pricing | ${BRAND}`,
  description: `Pick how many emails a day you want to send. From $${PLANS[0].price}/mo. No sales call, no 400-inbox minimum.`,
};

const INCLUDED = [
  ['Outlook inboxes', 'Created, named and ready to send.'],
  ['Domains + DNS', 'Bought and configured. SPF, DKIM and DMARC done.'],
  ['Warmup', 'Starts automatically on day one.'],
  ['Sequencer export', 'One click to Instantly, Smartlead, EmailBison, lemlist or Apollo.'],
  ['Copy templates', 'First-campaign emails you can adapt.'],
  ['Starter lead list', 'Enough leads to run your first test.'],
  ['Burned inbox guarantee', 'Dead inboxes replaced free, in one click.'],
];

const COMPARE: [string, string, string][] = [
  ['Smallest plan', `${fmt(PLANS[0].perDay)} emails a day`, '400 inboxes'],
  ['Starting price', `$${PLANS[0].price}/mo`, '$199/mo'],
  ['Sales call', 'Never', 'Application call first'],
  ['Ready to send', 'Same day', 'About 24 hours'],
  ['Launch kit', 'Included', 'Not included'],
  ['Burned inboxes', 'Replaced free', 'Varies'],
];

export default function Pricing() {
  return (
    <div className="page">
      <Nav />
      <main>
        <section className="pricing-hero">
          <div className="kicker" {...reveal('12px')}>
            Pricing
          </div>
          <h1 className="h2 h2--xl" {...reveal('24px', 60)}>
            Pay for the emails you send. <span className="accent-italic">Nothing else.</span>
          </h1>
          <p className="lede" {...reveal('16px', 120)}>
            Two plans. Same launch kit, same guarantee. Move up when you land the next client.
          </p>
        </section>

        <section className="pricing-plans">
          {PLANS.map((p, i) => (
            <div key={p.id} className={`pricing-plan${i === PLANS.length - 1 ? ' pricing-plan--feature' : ''}`} {...reveal('24px', i * 80)}>
              <div className="pricing-plan__top">
                <span className="label">{p.name}</span>
                <div className="pricing-plan__vol">
                  {fmt(p.perDay)}
                  <span>emails a day</span>
                </div>
              </div>
              <div className="pricing-plan__price">
                ${p.price}
                <span>/mo</span>
              </div>
              <Link href={`/signup?plan=${p.id}`} className={`btn ${i === PLANS.length - 1 ? 'btn--orange' : 'btn--ink'} btn--md`}>
                Start with {p.name} <span className="mono">→</span>
              </Link>
              <span className="pricing-plan__note">Monthly · Cancel anytime · No call</span>
            </div>
          ))}
        </section>

        <section className="pricing-included" {...reveal()}>
          <div className="kicker">Every plan includes</div>
          <dl>
            {INCLUDED.map(([t, d]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="pricing-compare" {...reveal()}>
          <div className="stack-16">
            <div className="kicker">Compared with</div>
            <h2 className="h2">Built for your first ten clients.</h2>
          </div>
          <div className="pricing-compare__wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col">{BRAND}</th>
                  <th scope="col">Typical provider</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([k, a, b]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Faq />
      </main>
      <FinalCta />
      <Motion />
    </div>
  );
}

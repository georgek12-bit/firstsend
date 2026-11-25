import type { Metadata } from 'next';
import Faq from '@/components/Faq';
import FinalCta from '@/components/FinalCta';
import Motion from '@/components/Motion';
import Nav from '@/components/Nav';
import SectionHead from '@/components/SectionHead';
import Volume from '@/components/Volume';
import { BRAND } from '@/lib/content';
import { PLANS, fmt } from '@/lib/plans';
import { reveal } from '@/lib/reveal';

export const metadata: Metadata = {
  title: `Pricing | ${BRAND}`,
  description: `Pick how many emails a day you want to send. From $${PLANS[0].price}/mo. Unlimited free leads included. No sales call, no 400-inbox minimum.`,
};


const COMPARE: [string, string, string][] = [
  ['Smallest plan', `${fmt(PLANS[0].perDay)} emails a day`, '400 inboxes'],
  ['Starting price', `$${PLANS[0].price}/mo`, '$199/mo'],
  ['Sales call', 'Never', 'Application call first'],
  ['Ready to send', 'Same day', 'About 24 hours'],
  ['Leads', 'Unlimited, free', 'Not included'],
  ['Launch kit', 'Included', 'Not included'],
  ['Burned inboxes', 'Replaced free', 'Varies'],
];

export default function Pricing() {
  return (
    <div className="page">
      <Nav />
      <main>
        <Volume as="h1" />

        <section className="pricing-compare" {...reveal()}>
          <SectionHead label="Compared with" title="Built for your" muted="first ten clients" />
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

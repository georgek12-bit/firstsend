import type { Metadata } from 'next';
import LegalPage, { Mail } from '@/components/LegalPage';
import { BRAND } from '@/lib/content';

export const metadata: Metadata = { title: `Acceptable Use Policy | ${BRAND}` };

export default function AcceptableUse() {
  return (
    <LegalPage
      path="/acceptable-use"
      title="Acceptable Use Policy"
      intro={`Every ${BRAND} customer shares the same infrastructure, so one bad sender can hurt everyone's deliverability. These rules keep it working.`}
    >
      <h2>What's allowed</h2>
      <p>
        Relevant, one-to-one style B2B outreach: emailing people at businesses about something genuinely useful to their role, from a real
        business, with honest content and an easy way to opt out.
      </p>

      <h2>What's not allowed</h2>
      <ul>
        <li>Emailing consumers (people in a personal capacity) rather than businesses.</li>
        <li>Phishing, malware, or links to sites that collect credentials or payment details under false pretences.</li>
        <li>Misleading content: fake names or companies, false &ldquo;Re:&rdquo; or &ldquo;Fwd:&rdquo; subjects, or pretending a prior relationship exists.</li>
        <li>Illegal, adult, gambling, crypto investment, &ldquo;get rich quick&rdquo;, debt relief, pharmaceutical or weapons offers.</li>
        <li>Harassment, threats, hate speech or content about protected characteristics.</li>
        <li>Emailing people who have opted out, or not honouring opt-out requests promptly.</li>
        <li>Purchased or scraped lists you haven&rsquo;t verified, or lists of role or catch-all addresses sent to in bulk.</li>
        <li>Sending more than your plan&rsquo;s daily limit, or trying to get around limits, monitoring or vetting.</li>
        <li>Reselling inboxes or giving others access to your account without our written permission.</li>
      </ul>

      <h2>Healthy sending</h2>
      <p>To keep your inboxes healthy, and to keep them, aim for:</p>
      <ul>
        <li>Bounce rate under 3%. Verify lists before sending.</li>
        <li>Spam complaint rate under 0.1%.</li>
        <li>Warmup left switched on, and volume increased gradually.</li>
      </ul>

      <h2>What happens if the rules are broken</h2>
      <p>
        We monitor bounce rates, complaints and other signals. If an account looks risky, we may pause sending while we look into it. Serious
        or repeated breaches lead to immediate suspension or closure without a refund, and inboxes burned by breaking this policy aren&rsquo;t
        covered by the burned inbox guarantee.
      </p>

      <h2>Reporting abuse</h2>
      <p>
        Received unwanted email from a {BRAND} inbox? Forward it to <Mail /> and we will investigate.
      </p>
    </LegalPage>
  );
}

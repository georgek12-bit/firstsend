import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { Mail } from '@/components/LegalPage';
import { BRAND } from '@/lib/content';
import { LEGAL } from '@/lib/legal';
import { PLANS, fmt } from '@/lib/plans';

export const metadata: Metadata = { title: `Terms of Service | ${BRAND}` };

export default function Terms() {
  return (
    <LegalPage
      path="/terms"
      title="Terms of Service"
      intro={`These terms are the agreement between your business and ${LEGAL.company} for using ${BRAND}. Please read them before you buy.`}
    >
      <h2>1. Who we are</h2>
      <p>
        {BRAND} is run by {LEGAL.company}, a company registered in {LEGAL.country}
        {LEGAL.companyNumber && ` (company number ${LEGAL.companyNumber})`}
        {LEGAL.address && `, registered address ${LEGAL.address}`}. In these terms, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; mean {LEGAL.company}.
        &ldquo;You&rdquo; means the business that creates the account. You can reach us at <Mail />.
      </p>

      <h2>2. Business customers only</h2>
      <p>
        {BRAND} is for businesses. By creating an account you confirm you are acting for a business, not as a consumer, and that you have
        authority to accept these terms for that business. Because of this, consumer protection rules such as the 14-day cooling-off period
        for consumers do not apply.
      </p>

      <h2>3. What you get</h2>
      <p>Each plan gives you sending capacity for a set number of cold emails a day:</p>
      <ul>
        {PLANS.map(p => (
          <li key={p.id}>
            {p.name}: up to {fmt(p.perDay)} emails a day, ${p.price} a month.
          </li>
        ))}
      </ul>
      <p>Every plan includes:</p>
      <ul>
        <li>Outlook inboxes and sending domains that we buy and set up for you, including SPF, DKIM and DMARC.</li>
        <li>Inbox warmup, health monitoring and the burned inbox guarantee (section 7).</li>
        <li>Export of your inboxes to supported sequencers or as a CSV file.</li>
        <li>The launch kit: copy templates, a warmup guide and a sample lead list.</li>
      </ul>
      <p>
        New accounts start at half their plan&rsquo;s daily volume for their first 14 days. The limit rises automatically if bounce and
        spam rates stay healthy. We aim to have new accounts ready to send the same day, but setup times are estimates, not guarantees.
      </p>

      <h2>4. Sign-up and vetting</h2>
      <p>
        Inboxes are shared infrastructure, so we check every new account before setting it up. You must give accurate information about
        your business and how you will use the service. We may refuse or close any account at our discretion, including if we believe it
        breaks the <Link href="/acceptable-use">Acceptable Use Policy</Link>. If we refuse your account before setup, we refund your
        first payment in full.
      </p>

      <h2>5. Payment</h2>
      <ul>
        <li>Plans are billed monthly in advance, in US dollars, through our payment provider Stripe. Prices exclude any applicable taxes.</li>
        <li>Your plan renews automatically every month until you cancel.</li>
        <li>Upgrades take effect straight away and you pay the difference for the rest of the current month. Downgrades take effect at your next renewal.</li>
        <li>If a payment fails, we may pause sending until it is paid. Accounts unpaid for 14 days may be closed.</li>
        <li>We may change our prices with at least 30 days&rsquo; notice by email. The new price applies from your next renewal after the notice period.</li>
      </ul>

      <h2>6. Cancelling and refunds</h2>
      <p>
        You can cancel at any time from Billing. Your plan stays active until the end of the month you have paid for, then ends. Payments
        are not refundable, except as set out in our <Link href="/refunds">Refund Policy</Link>.
      </p>

      <h2>7. Burned inbox guarantee</h2>
      <p>
        If one of your inboxes is flagged as burned (no longer reliably reaching recipients&rsquo; inboxes) by our health checks, you can
        request a replacement from your dashboard and we will replace it at no extra cost. The guarantee does not apply where we reasonably
        believe the inbox was burned by sending that breaks the <Link href="/acceptable-use">Acceptable Use Policy</Link>. Replacement is
        your only remedy for a burned inbox; it does not entitle you to a refund or credit.
      </p>

      <h2>8. Your responsibilities</h2>
      <ul>
        <li>You are responsible for everything sent from your inboxes, including its content, the people you email and getting any permissions you need.</li>
        <li>You must comply with all laws that apply to your outreach, including the UK GDPR, PECR, CAN-SPAM and the GDPR where relevant, and include a working way to opt out of further emails.</li>
        <li>You must follow the <Link href="/acceptable-use">Acceptable Use Policy</Link> and the rules of any sequencer you connect.</li>
        <li>Keep access to your account secure. Tell us straight away if you think someone else has accessed it.</li>
      </ul>

      <h2>9. Suspension</h2>
      <p>
        To protect other customers and our infrastructure, we may pause sending or suspend your account without notice if we see signs of
        abuse, such as high bounce or spam complaint rates, or if we reasonably believe you have broken these terms. Where we can, we will
        tell you why and give you a chance to fix the issue. We do not refund fees for periods of suspension caused by your breach.
      </p>

      <h2>10. Who owns what</h2>
      <p>
        The domains we register for you are held for your use while your plan is active. The inboxes run on Microsoft infrastructure that we
        manage. When your plan ends, we may delete the inboxes and their contents and let the domains lapse, so export anything you need
        before then. Domains you bring yourself stay yours. The {BRAND} software, launch kit and website belong to us; you may use the
        launch kit for your own outreach.
      </p>

      <h2>11. Third-party services</h2>
      <p>
        {BRAND} relies on third parties including Microsoft, domain registrars, Stripe and the sequencers you connect. We are not
        responsible for their services, outages or policy changes, including decisions by email providers to filter or block messages. We
        do not guarantee any level of deliverability, open rate, reply rate or business result.
      </p>

      <h2>12. Liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for any loss of profit, revenue,
        business, data or goodwill, or for any indirect or consequential loss. Our total liability to you in any 12-month period is limited
        to the fees you paid us in that period. Nothing in these terms limits liability for death or personal injury caused by negligence,
        for fraud, or for anything else that cannot be limited by law.
      </p>
      <p>
        You agree to cover our losses and reasonable costs arising from claims by third parties about emails you send or your breach of
        these terms or the law.
      </p>

      <h2>13. Changes and ending the service</h2>
      <p>
        We may update these terms. We will email you about material changes at least 14 days before they apply. If you don&rsquo;t agree,
        cancel before they take effect. We may stop offering {BRAND} with at least 30 days&rsquo; notice, and will refund any fees you have
        paid for time after the service ends.
      </p>

      <h2>14. Law</h2>
      <p>
        These terms are governed by the laws of {LEGAL.law}, and the courts of {LEGAL.law} have exclusive jurisdiction over any dispute.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these terms: <Mail />.
      </p>
    </LegalPage>
  );
}

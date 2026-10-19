import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { Mail } from '@/components/LegalPage';
import { BRAND } from '@/lib/content';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: `Refund Policy | ${BRAND}` };

export default function Refunds() {
  return (
    <LegalPage path="/refunds" title="Refund Policy" intro="Short version: payments aren't refundable, but you can cancel any time and you won't be charged again.">
      <h2>No refunds once paid</h2>
      <p>
        We start buying domains and setting up inboxes for you as soon as you pay, so all payments, including the first month, renewals and
        upgrade charges, are non-refundable. This applies even if you cancel part-way through a month or don&rsquo;t use the service.
      </p>

      <h2>When we do refund</h2>
      <ul>
        <li>If we decline your account during vetting, before setup starts, we refund your first payment in full.</li>
        <li>If we stop offering {BRAND}, we refund any fees you have paid for time after the service ends.</li>
        <li>If the law requires a refund in your situation.</li>
      </ul>

      <h2>Cancelling</h2>
      <p>
        Cancel any time from <strong>Billing → Manage billing</strong>. Your plan stays active until the end of the month you have paid for,
        and you won&rsquo;t be charged again.
      </p>

      <h2>Burned inboxes</h2>
      <p>
        If an inbox burns, we replace it free under the burned inbox guarantee in our <Link href="/terms">Terms</Link>. Replacements are
        not refunded or credited.
      </p>

      <h2>Billing problems</h2>
      <p>
        If you think you were charged by mistake, for example twice for the same month, email <Mail /> within 30 days and we will put it
        right. Please contact us before disputing a charge with your bank.
      </p>
      <p className="legal__meta">
        {BRAND} is run by {LEGAL.company}.
      </p>
    </LegalPage>
  );
}

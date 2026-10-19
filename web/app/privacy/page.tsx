import type { Metadata } from 'next';
import LegalPage, { Mail } from '@/components/LegalPage';
import { BRAND } from '@/lib/content';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: `Privacy Policy | ${BRAND}` };

export default function Privacy() {
  return (
    <LegalPage
      path="/privacy"
      title="Privacy Policy"
      intro={`How ${LEGAL.company} collects and uses personal data when you visit or use ${BRAND}.`}
    >
      <h2>Who is responsible</h2>
      <p>
        {LEGAL.company}
        {LEGAL.address && ` (${LEGAL.address})`} is the controller of the personal data described here. Contact us about privacy at <Mail />.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name and work email.
        </li>
        <li>
          <strong>Business details:</strong> company name, website, number of clients, how you plan to use cold email, where your leads
          come from and which sequencer you use. We use these to vet new accounts.
        </li>
        <li>
          <strong>Service data:</strong> the domains and inboxes we set up for you, their health, replacement requests, sequencer
          connections and sending limits.
        </li>
        <li>
          <strong>Billing details:</strong> your plan, payment history and invoices. Card details are collected and stored by Stripe; we only
          see the card brand, last four digits and expiry date.
        </li>
        <li>
          <strong>Technical data:</strong> information our providers log when you use the site, such as IP address, browser and timestamps,
          used for security and to fix problems.
        </li>
        <li>
          <strong>Messages:</strong> anything you send us by email.
        </li>
      </ul>
      <p>
        We don&rsquo;t read the content of emails sent from your inboxes, except where needed to investigate abuse or a technical problem.
        The people you email are your contacts: you are responsible for their data and for having a lawful basis to email them.
      </p>

      <h2>Why we use it, and our legal basis</h2>
      <ul>
        <li>To create your account, set up and run the service, and bill you: to perform our contract with you.</li>
        <li>To vet accounts, monitor sending and prevent spam, fraud and abuse: our legitimate interest in keeping the service safe for all customers.</li>
        <li>To email you about your account, setup, billing and changes to our terms: to perform our contract.</li>
        <li>To keep records for tax and accounting: our legal obligations.</li>
      </ul>
      <p>We don&rsquo;t sell your data, and we don&rsquo;t send marketing emails unless you have agreed to them.</p>

      <h2>Who we share it with</h2>
      <p>We use these providers to run {BRAND}. Each only gets the data it needs:</p>
      <ul>
        <li>
          <strong>Supabase</strong> (database and sign-in), with data stored in the EU (Ireland).
        </li>
        <li>
          <strong>Stripe</strong> (payments and invoices).
        </li>
        <li>
          <strong>GitHub</strong> (hosts the website).
        </li>
        <li>
          <strong>Resend</strong> (sends sign-in links and account emails).
        </li>
        <li>
          <strong>Microsoft and domain registrars</strong> (to create your inboxes and domains).
        </li>
        <li>
          <strong>Your connected sequencers</strong>, when you choose to export inboxes to them.
        </li>
      </ul>
      <p>
        Some providers are based in, or process data in, the United States. Where data leaves the UK or EU, we rely on adequacy
        regulations (such as the UK-US data bridge) or approved contract terms to protect it. We may also share data when the law requires
        it or to protect our rights or others&rsquo; safety.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account data while your account is open and for up to 12 months after it closes, in case of disputes or abuse
        investigations. Billing records are kept for 6 years to meet UK tax rules. You can ask us to delete your account sooner; see your
        rights below.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We don&rsquo;t use advertising or tracking cookies. The site stores a sign-in token in your browser&rsquo;s local storage so you
        stay logged in. This is essential for the service to work.
      </p>

      <h2>Your rights</h2>
      <p>
        Under UK data protection law you can ask to access, correct or delete your personal data, to restrict or object to how we use it,
        and to receive a copy in a portable format. Email <Mail /> and we will reply within one month. If you are unhappy with how we
        handle your data, you can complain to the Information Commissioner&rsquo;s Office at ico.org.uk.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit and at rest by our providers. Customers can only access their own account data, and access to our
        admin tools is limited to staff who need it.
      </p>

      <h2>Changes</h2>
      <p>We will post any changes here and update the date at the top. If a change is significant, we will email you.</p>
    </LegalPage>
  );
}

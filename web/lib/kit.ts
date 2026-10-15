// Launch kit content. Leads are fictional samples for the demo.

export const TEMPLATES = [
  {
    id: 'hiring',
    name: 'Hiring signal',
    when: 'They just posted a sales job.',
    subject: 'quick idea for {{company}}',
    body: `Hey {{first_name}},

Saw {{company}} is hiring SDRs. Most teams your size book 10+ calls a month without adding headcount.

We run outbound for B2B companies like yours. Worth a quick look at how?

{{sender_first_name}}`,
  },
  {
    id: 'case',
    name: 'Short case study',
    when: 'You have one good result to point to.',
    subject: '{{similar_company}} + 23 calls',
    body: `Hi {{first_name}},

We helped {{similar_company}} book 23 sales calls in their first month, all from cold email.

Same playbook would work for {{company}}. Open to seeing the numbers?

{{sender_first_name}}`,
  },
  {
    id: 'question',
    name: 'One question',
    when: 'Cold list, no trigger. Keep it tiny.',
    subject: 'question about {{company}}',
    body: `{{first_name}}, who handles new client acquisition at {{company}}?

Have an idea that could add a few qualified calls a month. Happy to send it over.

{{sender_first_name}}`,
  },
  {
    id: 'bump',
    name: 'Follow-up bump',
    when: 'Day 3, same thread.',
    subject: 're: {{previous_subject}}',
    body: `Hey {{first_name}}, floating this back up in case it got buried. Worth a chat?

{{sender_first_name}}`,
  },
];

export const WARMUP_GUIDE = [
  { t: 'Leave warmup on', d: 'It runs by itself. Inboxes send and reply to each other a little more each day to build a good reputation.' },
  { t: 'Start slow', d: 'Your account begins at half your daily volume. It rises automatically after two weeks of healthy sending.' },
  { t: 'Keep it plain', d: 'No images, no attachments, one link at most in the first email. Plain text gets delivered.' },
  { t: 'Clean your list', d: "Verify every email before you send. Bounces above 3% hurt your inboxes fast." },
  { t: 'Watch the dashboard', d: 'Green means good to send. Amber means slow down. Red means replace it, free.' },
];

const FIRST = ['Priya', 'Tom', 'Mia', 'Owen', 'Lena', 'Marcus', 'Aisha', 'Daniel', 'Sofia', 'Ryan', 'Hannah', 'Leo', 'Grace', 'Ethan', 'Nora', 'Sam', 'Chloe', 'Arjun', 'Emma', 'Lucas'];
const LAST = ['Shah', 'Reyes', 'Chen', 'Hart', 'Novak', 'Bell', 'Khan', 'Moore', 'Rossi', 'Price', 'Lund', 'Ortiz', 'Kim', 'Walsh', 'Berg', 'Cole', 'Dunn', 'Mehta', 'Fox', 'Grant'];
const COS = ['Northwind Logistics', 'Brightpath HR', 'Cobalt Analytics', 'Fernhill Studio', 'Quarry Software', 'Larkspur Health', 'Meridian Freight', 'Tidewater Legal', 'Juniper Payroll', 'Halcyon Cloud'];
const ROLES = ['Head of Growth', 'Founder', 'VP Sales', 'COO', 'Head of Marketing', 'CEO', 'Sales Director'];

export const LEADS = FIRST.map((f, i) => {
  const last = LAST[(i * 7) % LAST.length];
  const company = COS[i % COS.length];
  const domain = company.split(' ')[0].toLowerCase() + '.example';
  return { first: f, last, role: ROLES[i % ROLES.length], company, email: `${f.toLowerCase()}@${domain}` };
});

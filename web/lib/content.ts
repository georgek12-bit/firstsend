import { asset } from './asset';

// All page copy and data. The product name is set once here so it is easy to swap.
export const BRAND = 'Firstsend';

export const HEALTH = {
  green: 'oklch(0.62 0.15 150)',
  amber: 'oklch(0.8 0.15 92)',
  red: 'oklch(0.55 0.2 18)',
} as const;

export const SLIDER = { min: 200, max: 1600, step: 50, initial: 800 };

// What every plan includes, shown as the checklist on each pricing card.
export const planIncludes = [
  'Unlimited leads with verified emails',
  'Outlook inboxes, named and ready',
  'Domains bought, SPF, DKIM and DMARC set',
  'Warmup started on day one',
  'One-click push to your sequencer',
  'Copy templates for your first campaign',
  'Burned inboxes replaced free',
  'Monthly, cancel anytime',
];

export const why = [
  {
    title: 'Start at 800 a day',
    body: 'Other providers start you at hundreds of inboxes. We start at 800 emails a day, so you pay for what your first clients need.',
  },
  {
    title: 'Done for you, start to finish',
    body: 'Domains, DNS, inbox names and warmup are all handled. You never open a DNS panel or chase a setup guide.',
  },
  {
    title: 'Straight into your sequencer',
    body: 'Push inboxes into Instantly or Smartlead with an API key, or download a CSV for EmailBison, lemlist and Apollo.',
  },
  {
    title: 'Unlimited leads, free',
    body: 'Describe your buyers and build as many lists as you like, up to 5,000 leads each. Every lead has a verified work email. No credits to buy.',
  },
];

export const navLinks = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/#how', label: 'How it works' },
  { href: '/#why', label: `Why ${BRAND}` },
  { href: '/#kit', label: 'Launch kit' },
  { href: '/#faq', label: 'FAQ' },
];

export const dashStats = [
  { label: 'Sent today', value: '1,184', sub: '/ 1,600' },
  { label: 'Inbox health', value: '15', sub: 'of 16 good' },
  { label: 'Setup', value: 'Done', sub: '4 domains' },
];

export const dashInboxes = [
  { addr: 'alex@getacme-mail.com', status: 'Good to send', dot: HEALTH.green, sent: '100 / 100' },
  { addr: 'alex@tryacmehq.com', status: 'Good to send', dot: HEALTH.green, sent: '96 / 100' },
  { addr: 'sam@getacme-mail.com', status: 'Warming up', dot: HEALTH.amber, sent: '24 / 40' },
  { addr: 'sam@tryacmehq.com', status: 'Replacing, free', dot: HEALTH.red, sent: '0' },
];

// Sends per hour on the hero dashboard, 8am to 6pm. The last bar is the current hour.
export const dashHours = [
  { h: '8', n: 96 },
  { h: '9', n: 148 },
  { h: '10', n: 162 },
  { h: '11', n: 155 },
  { h: '12', n: 118 },
  { h: '13', n: 124 },
  { h: '14', n: 151 },
  { h: '15', n: 140 },
  { h: '16', n: 90 },
];

export type SequencerLogo = {
  src: string;
  alt: string;
  /** Height in the marquee. */
  h: number;
  /** Height in the launch kit tile. */
  hs: number;
  /** Apollo only ships as a dark icon, so it is inverted and labelled. */
  invert?: boolean;
  label?: string;
};

export const sequencers: SequencerLogo[] = [
  { src: asset('/assets/instantly-white.png'), alt: 'Instantly', h: 26, hs: 15 },
  { src: asset('/assets/smartlead-white.png'), alt: 'Smartlead', h: 26, hs: 15 },
  { src: asset('/assets/emailbison-white.png'), alt: 'EmailBison', h: 24, hs: 14 },
  { src: asset('/assets/lemlist-white.png'), alt: 'lemlist', h: 28, hs: 16 },
  { src: asset('/assets/apollo-icon.png'), alt: 'Apollo', h: 28, hs: 17, invert: true, label: 'Apollo' },
];

// [name, aspect ratio (w/h), ink density]. Logos are sized by visual weight, not pixel height.
const TRUSTED: [string, number, number][] = [
  ['Aalto Capital', 8.583, 0.241],
  ['AICertified', 5.991, 0.442],
  ['OKY Capital', 3.234, 0.341],
  ['CrossBridge', 6.008, 0.262],
  ['Talent Thrive', 4.178, 0.188],
  ['Macwood Capital', 3.321, 0.181],
  ['Atomyc', 4.175, 0.291],
  ['Yanne Capital', 2.713, 0.163],
  ['Waddell Group', 3.525, 0.146],
  ['SwiftSift', 4.944, 0.436],
  ['Teleperson', 5.286, 0.247],
];

export type TrustLayout = { size: 'sm' | 'md' | 'lg'; rows: { name: string; src: string; h: string }[][] };

// Each breakpoint gets a fixed row split so no logo is ever alone on a row.
const TRUST_SIZES = [
  { size: 'lg', area: 4600, split: [6, 5] },
  { size: 'md', area: 3800, split: [4, 4, 3] },
  { size: 'sm', area: 1700, split: [3, 3, 3, 2] },
] as const;

export const trustLayouts: TrustLayout[] = TRUST_SIZES.map(({ size, area, split }) => {
  const items = TRUSTED.map(([name, ratio, density]) => {
    const k = Math.min(1.18, Math.max(0.82, Math.pow(0.27 / density, 0.3)));
    return {
      name,
      src: asset('/assets/trusted/' + name.toLowerCase().replace(/\s+/g, '-') + '.png'),
      h: (Math.sqrt(area / ratio) * k).toFixed(1) + 'px',
    };
  });
  let i = 0;
  return { size, rows: split.map(c => items.slice(i, (i += c))) };
});

export const steps = [
  { n: '1', title: 'Choose volume', body: 'Slide to the emails a day you need. Check out with a card. Two minutes, tops.' },
  { n: '2', title: 'We set everything up', body: "We buy your domains and set up DNS, inboxes and warmup. You don't touch a thing." },
  { n: '3', title: 'Export to your sequencer', body: 'One click into Instantly, Smartlead, EmailBison, lemlist or Apollo. Or grab a CSV and go.' },
];

export const kitInboxes = ['alex@getacme-mail.com', 'sam@getacme-mail.com', 'jo@tryacmehq.com'];

export const dnsRecords = ['SPF', 'DKIM', 'DMARC'];

export const warmupBars = [14, 20, 24, 32, 38, 46, 52, 60, 68, 76, 88, 100];

export const leads = [
  { n: 'Priya Shah', r: 'Head of Growth' },
  { n: 'Tom Reyes', r: 'Founder' },
  { n: 'Mia Chen', r: 'VP Sales' },
  { n: 'Owen Hart', r: 'COO' },
];

export const healthRows = [
  { addr: 'jo@meetnorth.co', status: 'Good to send', dot: HEALTH.green },
  { addr: 'jo@northgrowth.io', status: 'Good to send', dot: HEALTH.green },
  { addr: 'dev@meetnorth.co', status: 'Watch', dot: HEALTH.amber },
  { addr: 'dev@northgrowth.io', status: 'Burned', dot: HEALTH.red },
];

export const stats = [
  { to: 800, suf: '', label: 'Emails a day on the smallest plan' },
  { to: 5000, suf: '', label: 'Free leads per list, as many lists as you like' },
  { to: 5, suf: '', label: 'Sequencers with one-click export' },
  { to: 100, suf: '%', label: 'Of burned inboxes replaced free' },
];

export const faqs = [
  { q: 'Do I have to talk to sales?', a: 'No. Pick your volume, check out with a card, answer a few quick questions about your business. Done.' },
  { q: 'How fast can I start sending?', a: 'Setup runs automatically after checkout. Most accounts are sending the same day.' },
  { q: "I don't know anything about DNS. Is that a problem?", a: "Not at all. We set up SPF, DKIM and DMARC for you. Your dashboard tells you when you're ready to send." },
  { q: 'What counts as a burned inbox?', a: 'Any inbox our health checks flag as damaged. You request a swap in one click and we replace it free.' },
  { q: 'Can I change my volume later?', a: 'Yes. Move up or down from your dashboard. Billing is monthly and you can cancel anytime.' },
  { q: 'Are the leads really unlimited?', a: 'Yes. Build as many lists as you like from your dashboard, up to 5,000 leads each. Every lead has a verified work email, at most 3 per company, and you never get the same person twice. It is included in your plan.' },
  { q: 'Which sequencers do you work with?', a: 'Instantly, Smartlead, EmailBison, lemlist and Apollo, all with one-click export. Anything else works with a CSV.' },
];


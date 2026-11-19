// Builds a cold email sequence from a customer's answers, with no AI.
// Based on George's Cold Email Copy Playbook (Nov 2026): first line, problem, solution, proof,
// free offer. Email one plus one follow-up, an optional close-the-loop. No links, 70-90 words,
// 2-4 word subjects, proof with exact numbers and the client described, not named.
// Each question asks the customer to finish a sentence so the answer drops into the copy cleanly.

export type Brief = {
  audience: string; // "I help ___"                    UK dental clinics
  problem: string; // "Most of them ___"              spend on ads but get price shoppers who never book
  label: string; // the problem in 2-3 words         price shoppers
  result: string; // "We get them ___"                15 to 30 new patient bookings a month
  how: string; // "We do it by ___"                   running Google Ads built around implants and Invisalign
  proof: string; // "We recently helped ___"         a clinic in Leeds go from 4 to 26 new patients a month
  offer: string; // "To show you, I'd like to ___"   write three ads for you
  second: string; // "We also help them ___"         cut wasted ad spend
  cta: 'send' | 'yes' | 'interested';
};

export type Email = { label: string; subject: string; body: string; why: string };

export const EMPTY_BRIEF: Brief = { audience: '', problem: '', label: '', result: '', how: '', proof: '', offer: '', second: '', cta: 'send' };

export type Question = {
  key: Exclude<keyof Brief, 'cta'>;
  q: string;
  lead: string; // shown before the box, so they finish the sentence
  tail?: string; // shown after the box
  placeholder: string;
  hint: string;
  optional?: boolean;
};

export const QUESTIONS: Question[] = [
  { key: 'audience', q: 'Who do you help?', lead: 'I help', placeholder: 'UK dental clinics', hint: 'Be narrow enough that one email speaks to all of them. Plural, like “marketing agencies”.' },
  { key: 'problem', q: 'What problem do they have?', lead: 'Most of them', placeholder: 'spend on ads but get price shoppers who never book', hint: 'In their words, and ideally one that costs them money. This is your opening line.' },
  { key: 'label', q: 'Name that problem in 2 or 3 words.', lead: 'In short:', placeholder: 'price shoppers', hint: 'Becomes a subject line, so keep it plain, like something a colleague would send.' },
  { key: 'result', q: 'What result do you get them?', lead: 'We get them', placeholder: '15 to 30 new patient bookings a month', hint: 'Save them time, save them money, or make them money.' },
  { key: 'how', q: 'How do you do it?', lead: 'We do it by', placeholder: 'running Google Ads built around implants and Invisalign', hint: 'Start with an -ing word. Giving your method a name helps if you have no case study yet.' },
  {
    key: 'proof',
    q: 'Got a client result?',
    lead: 'We recently helped',
    placeholder: 'a clinic in Leeds go from 4 to 26 new patients a month',
    hint: 'Describe the client, don’t name them. Use the exact number, not a range. Skip if you don’t have one yet.',
    optional: true,
  },
  {
    key: 'offer',
    q: 'What can you give them for free?',
    lead: 'To show you, I’d like to',
    tail: 'free.',
    placeholder: 'write three ads for you',
    hint: 'Something useful they’d normally pay for: an audit, a mockup, a list of leads, 3 ads. Not a call or a Loom.',
  },
  { key: 'second', q: 'Anything else you help with?', lead: 'We also help them', placeholder: 'cut wasted ad spend', hint: 'Goes in a PS as a second reason to reply. Optional.', optional: true },
];

export const CTAS: { v: Brief['cta']; l: string; d: string }[] = [
  { v: 'send', l: '“Want me to send it over?”', d: 'Recommended. One easy yes to your free offer.' },
  { v: 'yes', l: '“Reply yes and I’ll send it over.”', d: 'Even less effort for them. Good for free tools and lists.' },
  { v: 'interested', l: '“Interested?”', d: 'Shortest. Works when the offer is very clear.' },
];

// Tidy a sentence fragment: trim, drop the trailing full stop, and lower-case the first letter
// unless it looks like a name or acronym ("UK", "SaaS", "Leeds").
const frag = (s: string) => {
  let t = s.trim().replace(/[.!\s]+$/, '');
  if (/^[A-Z][a-z]/.test(t) && !/^I\b/.test(t)) t = t[0].toLowerCase() + t.slice(1);
  return t;
};
// The free offer: drop a trailing "free" / "for free", we add our own.
const offerOf = (s: string) => frag(s).replace(/,?\s*(completely\s+|totally\s+)?(for\s+)?free$/i, '');

const ASK: Record<Brief['cta'], string> = {
  send: 'Want me to send it over?',
  yes: 'Reply yes and I’ll send it over.',
  interested: 'Interested?',
};

const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join('\n\n');
const SIGN = '{{sender_first_name}}';

export function writeSequence(b: Brief): Email[] {
  const audience = frag(b.audience);
  const problem = frag(b.problem);
  const label = frag(b.label).toLowerCase();
  const result = frag(b.result);
  const how = frag(b.how);
  const proof = frag(b.proof);
  const offer = offerOf(b.offer);
  const second = frag(b.second);
  const ask = ASK[b.cta];
  const ps = second && `PS: If that’s not a priority right now, we also help ${audience} ${second}.`;

  return [
    {
      label: proof ? 'Email 1 · version A · case study' : 'Email 1 · version A · full skeleton',
      subject: '{{first_name}}',
      body: join(
        'Hi {{first_name}},',
        `Most ${audience} we speak to ${problem}.`,
        proof ? `We recently helped ${proof}, by ${how}.` : `We get them ${result} by ${how}.`,
        `To show you how, I’d like to ${offer}, free.`,
        ask,
        ps,
        SIGN,
      ),
      why: proof
        ? 'The full skeleton: their problem, how you fix it, a real result, then a free offer. First name subjects correlated best across 1,517 campaigns.'
        : 'Their problem, how you fix it, then a free offer they can say yes to in five seconds.',
    },
    {
      label: 'Email 1 · version B · problem first',
      subject: label,
      body: join(
        'Hi {{first_name}},',
        `Most ${audience} ${problem}.`,
        `We help them get ${result} by ${how}.`,
        `I’d like to ${offer}, free, so you can see the difference before spending anything.`,
        ask,
        SIGN,
      ),
      why: 'Names the pain precisely, so they assume you know the fix. Works even without case studies.',
    },
    {
      label: 'Email 1 · version C · short and direct',
      subject: 'quick one',
      body: join(`Hey {{first_name}}, we help ${audience} get ${result}.`, `I’d like to ${offer}, free, so you can see exactly what I mean.`, ask, SIGN),
      why: 'Two sentences stand out next to the 150-word pitches in their inbox.',
    },
    {
      label: 'Follow-up 1 · 2 to 3 days later',
      subject: '',
      body: join(
        'Hi {{first_name}},',
        proof
          ? `Following up on this. It’s the same approach that helped ${proof}.`
          : `Following up on this. We get ${audience} ${result} by ${how}, so there’s very little for your team to do.`,
        `Still happy to ${offer}, free. ${ask}`,
        SIGN,
      ),
      why: 'Same thread, a new reason to reply, and points back to the free offer. Never “just checking in”.',
    },
    {
      label: 'Follow-up 2 · optional, 2 to 3 days later',
      subject: '',
      body: join('Hi {{first_name}},', 'Should I send this to someone else on your team instead?', 'If not, no worries. I’ll close the loop here.', SIGN),
      why: 'Short and human. After this, stop. Email them again in 2 to 3 months with a new angle.',
    },
  ];
}

export const SENDING_TIPS = [
  'Run versions A, B and C side by side and give each 1,000 sends before picking a winner.',
  'No links, no images, and turn open tracking off. Write any website as “brand (dot) com”.',
  'Leave the follow-up subjects blank so they sit in the same thread as email 1.',
  'Check your CSV: first names only, and company names without “Ltd”, “Inc.” or “LLC”.',
  'Judge it on positive replies and meetings, not opens.',
];

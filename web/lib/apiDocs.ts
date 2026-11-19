// Content for the public API reference at /docs/api.
// Keep in sync with supabase/functions/api/index.ts when endpoints change.

export const API_BASE = 'https://api.firstsend.site';

export type Param = { name: string; type: string; req?: boolean; desc: string };
export type Endpoint = {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  desc: string;
  query?: Param[];
  body?: Param[];
  example: string; // curl
  response: string; // JSON
};
export type Group = { id: string; title: string; intro: string; endpoints: Endpoint[] };

const H = `-H "x-api-token: $FIRSTSEND_KEY"`;

export const GROUPS: Group[] = [
  {
    id: 'account',
    title: 'Account',
    intro: 'Your plan and how much you have set up.',
    endpoints: [
      {
        id: 'get-account',
        method: 'GET',
        path: '/v1/account',
        title: 'Get your account',
        desc: 'Your plan, its status and daily sending volume, plus how many domains and inboxes you have.',
        example: `curl ${API_BASE}/v1/account \\\n  ${H}`,
        response: `{
  "data": {
    "name": "Sam Davies",
    "email": "sam@acme.co",
    "plan": "growth",
    "status": "active",
    "emails_per_day": 1600,
    "started_at": "2026-10-20T09:12:00Z",
    "renews_at": "2026-11-20T09:12:00Z",
    "domains": 4,
    "inboxes": 80
  }
}`,
      },
    ],
  },
  {
    id: 'domains',
    title: 'Domains',
    intro: 'The sending domains on your account.',
    endpoints: [
      {
        id: 'list-domains',
        method: 'GET',
        path: '/v1/domains',
        title: 'List domains',
        desc: 'Every domain on your account, with how many inboxes it has and how many are ready to send.',
        example: `curl ${API_BASE}/v1/domains \\\n  ${H}`,
        response: `{
  "data": [
    {
      "id": "6f1c…",
      "name": "getacme-mail.com",
      "bring_your_own": false,
      "created_at": "2026-10-20T09:15:00Z",
      "inboxes": 20,
      "ready_inboxes": 18
    }
  ]
}`,
      },
    ],
  },
  {
    id: 'inboxes',
    title: 'Inboxes',
    intro:
      'Inboxes and their SMTP and IMAP logins, ready to load into any sequencer. Statuses: warming, good (ready to send), watch, burned, replacing.',
    endpoints: [
      {
        id: 'list-inboxes',
        method: 'GET',
        path: '/v1/inboxes',
        title: 'List inboxes',
        desc: 'Your inboxes, oldest first, with logins included unless you turn them off.',
        query: [
          { name: 'status', type: 'string', desc: 'Only these statuses, comma separated. e.g. good,warming' },
          { name: 'domain', type: 'string', desc: 'Only inboxes on this domain.' },
          { name: 'credentials', type: 'boolean', desc: 'Set to false to leave out logins. Default true.' },
          { name: 'limit', type: 'integer', desc: '1 to 500. Default 100.' },
          { name: 'offset', type: 'integer', desc: 'Skip this many. Use next_offset from the last page.' },
        ],
        example: `curl "${API_BASE}/v1/inboxes?status=good&limit=50" \\\n  ${H}`,
        response: `{
  "data": [
    {
      "id": "a41e…",
      "email": "alex@getacme-mail.com",
      "domain": "getacme-mail.com",
      "status": "good",
      "created_at": "2026-10-20T09:20:00Z",
      "ready_at": "2026-10-20T15:02:00Z",
      "replace_requested_at": null,
      "credentials": {
        "first_name": "Alex",
        "last_name": "Morgan",
        "smtp": { "host": "mx.firstsend.site", "port": 587, "username": "alex@getacme-mail.com", "password": "…" },
        "imap": { "host": "mx.firstsend.site", "port": 993, "username": "alex@getacme-mail.com", "password": "…" }
      }
    }
  ],
  "has_more": true,
  "next_offset": 50,
  "total": 80
}`,
      },
      {
        id: 'get-inbox',
        method: 'GET',
        path: '/v1/inboxes/{id}',
        title: 'Get an inbox',
        desc: 'One inbox by id. Same shape as in the list.',
        query: [{ name: 'credentials', type: 'boolean', desc: 'Set to false to leave out logins. Default true.' }],
        example: `curl ${API_BASE}/v1/inboxes/a41e… \\\n  ${H}`,
        response: `{ "data": { "id": "a41e…", "email": "alex@getacme-mail.com", "status": "good", "…": "…" } }`,
      },
      {
        id: 'replace-inbox',
        method: 'POST',
        path: '/v1/inboxes/{id}/replace',
        title: 'Replace an inbox',
        desc:
          'Ask for a free replacement. Works for inboxes with status burned or watch. The inbox moves to replacing, and when the new one is ready its email and logins change (check back with Get an inbox).',
        example: `curl -X POST ${API_BASE}/v1/inboxes/a41e…/replace \\\n  ${H}`,
        response: `{
  "data": {
    "id": "a41e…",
    "email": "alex@getacme-mail.com",
    "status": "replacing",
    "replace_requested_at": "2026-11-19T14:03:00Z",
    "…": "…"
  }
}`,
      },
    ],
  },
  {
    id: 'leads',
    title: 'Leads',
    intro:
      'Free, unlimited B2B leads. Every lead has a verified work email, at most 3 per company, and you never get the same person twice across all your lists.',
    endpoints: [
      {
        id: 'lead-options',
        method: 'GET',
        path: '/v1/leads/options',
        title: 'List filter values',
        desc: 'Every valid industry and country, for the industries and countries filters.',
        example: `curl ${API_BASE}/v1/leads/options \\\n  ${H}`,
        response: `{
  "data": {
    "industries": ["Accounting", "Advertising Services", "…"],
    "countries": ["United States", "United Kingdom", "…"]
  }
}`,
      },
      {
        id: 'count-leads',
        method: 'POST',
        path: '/v1/leads/count',
        title: 'Count matching leads',
        desc: 'How many people match a set of filters. Free and fast, so check before you build a list.',
        body: [{ name: 'filters', type: 'object', req: true, desc: 'See Lead filters below.' }],
        example: `curl -X POST ${API_BASE}/v1/leads/count \\\n  ${H} \\\n  -H "Content-Type: application/json" \\\n  -d '{"filters":{"job_titles":["Founder"],"industries":["Software Development"],"countries":["United Kingdom"]}}'`,
        response: `{ "data": { "matching": 881, "at_least": false } }`,
      },
      {
        id: 'create-leads',
        method: 'POST',
        path: '/v1/leads',
        title: 'Build a lead list',
        desc:
          'Runs the search and returns the finished list with a CSV download link (valid for 1 hour). Takes a few seconds, up to about a minute for 5,000 leads. Leads you already have are skipped.',
        body: [
          { name: 'filters', type: 'object', req: true, desc: 'See Lead filters below.' },
          { name: 'count', type: 'integer', req: true, desc: 'How many leads, 1 to 5,000.' },
        ],
        example: `curl -X POST ${API_BASE}/v1/leads \\\n  ${H} \\\n  -H "Content-Type: application/json" \\\n  -d '{"count":500,"filters":{"seniority":["c-level"],"keywords":["Shopify"],"company_size":["11 to 50"]}}'`,
        response: `{
  "data": {
    "id": "c9d2…",
    "summary": "c-level · “Shopify” · 11 to 50 staff",
    "status": "ready",
    "requested": 500,
    "leads": 500,
    "repeats_skipped": 0,
    "error": null,
    "created_at": "2026-11-19T14:10:00Z",
    "finished_at": "2026-11-19T14:10:09Z",
    "download_url": "https://…/c9d2….csv?token=…"
  }
}`,
      },
      {
        id: 'list-leads',
        method: 'GET',
        path: '/v1/leads',
        title: 'List your lead lists',
        desc: 'Lists you have built, newest first. Fetch one by id to get a fresh download link.',
        query: [
          { name: 'limit', type: 'integer', desc: '1 to 500. Default 100.' },
          { name: 'offset', type: 'integer', desc: 'Skip this many.' },
        ],
        example: `curl ${API_BASE}/v1/leads \\\n  ${H}`,
        response: `{ "data": [ { "id": "c9d2…", "status": "ready", "leads": 500, "download_url": null, "…": "…" } ], "has_more": false, "next_offset": null, "total": 1 }`,
      },
      {
        id: 'get-leads',
        method: 'GET',
        path: '/v1/leads/{id}',
        title: 'Get a lead list',
        desc: 'One list, with a new download link valid for 1 hour.',
        example: `curl ${API_BASE}/v1/leads/c9d2… \\\n  ${H}`,
        response: `{ "data": { "id": "c9d2…", "status": "ready", "leads": 500, "download_url": "https://…", "…": "…" } }`,
      },
    ],
  },
];

export const LEAD_FILTERS: Param[] = [
  { name: 'job_titles', type: 'string[]', desc: 'Current job titles. Whole words match, so Founder also finds Co-Founder.' },
  { name: 'exclude_job_titles', type: 'string[]', desc: 'Leave out these titles, e.g. Intern, Assistant.' },
  { name: 'seniority', type: 'string[]', desc: 'Any of: c-level, vp, director, manager, senior, junior.' },
  { name: 'industries', type: 'string[]', desc: 'Exact values from List filter values.' },
  { name: 'keywords', type: 'string[]', desc: 'Words in the company description, like Shopify or implants. Any of them can match. Capitals don’t matter.' },
  { name: 'company_size', type: 'string[]', desc: 'Any of: 1 to 10, 11 to 50, 51 to 200, 201 to 500, 501 to 1000, 1001 to 5000, 5001 to 10000, 10001+.' },
  { name: 'countries', type: 'string[]', desc: 'Where the person is based. Exact values from List filter values.' },
];

export const LEAD_CSV = ['Email', 'First Name', 'Last Name', 'Job Title', 'Seniority', 'Company Name', 'Website', 'Industry', 'Company Size', 'City', 'Country', 'LinkedIn', 'Company LinkedIn'];

export const ERRORS: { status: number; code: string; when: string }[] = [
  { status: 400, code: 'invalid_request / invalid_json', when: 'A missing or wrong field. The message says which.' },
  { status: 401, code: 'missing_api_key / invalid_api_key', when: 'No x-api-token header, or the key was revoked.' },
  { status: 403, code: 'subscription_inactive', when: 'Your plan is cancelled or unpaid.' },
  { status: 404, code: 'not_found', when: 'No such endpoint, or the id isn’t yours.' },
  { status: 409, code: 'not_replaceable', when: 'Only burned or watch inboxes can be replaced.' },
  { status: 429, code: 'rate_limited', when: 'Over 120 requests a minute on one key. Wait for retry-after seconds.' },
  { status: 500, code: 'server_error', when: 'Something broke on our side. Safe to retry.' },
];

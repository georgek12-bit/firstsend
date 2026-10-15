# Firstsend

Clickable Next.js (App Router) build of the Firstsend product: marketing site plus the full self-serve
app, running on a mock data layer so every flow works without a backend.

```bash
npm install
npm run dev                      # http://localhost:3000
npm run build
STATIC_EXPORT=1 npm run build    # plain static site in out/
```

## Routes

| Route | What it is |
| --- | --- |
| `/` | Landing page (from `project/Landing Page v2.dc.html`) |
| `/pricing` | Plans, what's included, comparison, FAQ |
| `/signup` | Account. Blocks free and disposable email |
| `/checkout` | Mock card checkout (test card 4242 4242 4242 4242) |
| `/onboarding` | Business details, use case, sequencer, acceptable use. Runs automated vetting |
| `/onboarding/declined` | Shown when vetting fails (B2C use) |
| `/onboarding/domains` | Pick suggested lookalike domains or bring your own |
| `/app/setup` | Setup progress (sped up for the demo) |
| `/app` | Dashboard: health, daily cap, sequencer, replacements |
| `/app/inboxes` | Inbox health, one-click free replacement, export to sequencer or CSV |
| `/app/kit` | Launch kit: copy templates, warmup guide, starter lead list |
| `/app/billing` | Change plan, card, invoices, cancel |
| `/app/settings` | Account, business, connections, demo controls |
| `/login` | Email sign-in link (live) or instant sign-in (demo) |
| `/admin` | Fulfilment console for admins (live only) |

## Demo or live

With no Supabase settings the app is a browser-only demo: data stays in localStorage and setup,
warmup and inbox health run on timers. Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`) and it uses Supabase for accounts and data,
with setup and inbox health driven from `/admin`. Setup steps are in [SUPABASE.md](SUPABASE.md).

## Where things live

- `lib/plans.ts`: the two plans (800/day $125, 1,600/day $250) and provisioning assumptions
  (20 sends per inbox, 25 inboxes per domain, half volume for the first 14 days).
- `lib/store.tsx`: picks the data layer. `lib/backends/live.ts` talks to Supabase,
  `lib/backends/demo.ts` is the localStorage demo. Both expose the same actions (`lib/state.ts`).
- `supabase/migrations/`: database tables, security rules and every write action.
- `lib/sim.ts`: simulated provisioning, warmup, health changes and renewals.
- `lib/content.ts`, `lib/kit.ts`: copy, FAQ, templates, sample leads.
- `app/globals.css` (marketing) and `app/product.css` (app UI): all styles and tokens.

Placeholders: the name "Firstsend", landing stats, sample leads, and the "typical provider" comparison figures.

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
| `/login` | Email sign-in (magic link in production) |

## Where things live

- `lib/plans.ts`: the two plans (800/day $125, 1,600/day $250) and provisioning assumptions
  (20 sends per inbox, 25 inboxes per domain, half volume for the first 14 days).
- `lib/store.tsx`: demo data layer saved in localStorage, and every user action. Replace these
  actions with API calls (Stripe, provisioning, health monitoring) when the backend exists.
- `lib/sim.ts`: simulated provisioning, warmup, health changes and renewals.
- `lib/content.ts`, `lib/kit.ts`: copy, FAQ, templates, sample leads.
- `app/globals.css` (marketing) and `app/product.css` (app UI): all styles and tokens.

Placeholders: the name "Firstsend", landing stats, sample leads, and the "typical provider" comparison figures.

# Firstsend: handoff notes (19 Oct 2026)

Firstsend sells ready-to-send cold email capacity: Outlook inboxes on lookalike domains, set up and warmed.
Plans: Starter 800 emails/day at $125/mo; Growth 1,600/day at $250/mo. Run by AHEADWITHAI (UK).
Live at https://firstsend.site. Repo: georgek12-bit/firstsend (public), app in `web/`.

## Stack
- **Next.js 16 + React 19 + TypeScript**, static export, deployed to GitHub Pages by `.github/workflows/pages.yml` on push to `main`.
- **Supabase** (project `vmnjfswqxxmykfnhecbm`, EU): auth by email link, Postgres with RLS. Every write goes through RPC functions; admin RPCs are `admin_*`, gated by `is_admin()`.
- **Stripe (live mode)**: Checkout subscriptions, customer portal, webhook. Edge Functions `create-checkout`, `billing-portal`, `stripe-webhook`.
- **Resend**: sign-in emails over SMTP, plus the `notify` Edge Function for order and status emails. Sender `no-reply@firstsend.site`.
- **DNS** on Cloudflare (moved from Namecheap; the domain is still registered at Namecheap).

## Code map (web/)
- `lib/store.tsx` picks the backend: `lib/backends/live.ts` (Supabase) if the `NEXT_PUBLIC_SUPABASE_*` env vars are set, otherwise `lib/backends/demo.ts` (localStorage). Shared types are in `lib/state.ts` and `lib/types.ts`.
- `lib/plans.ts`: plans. `lib/legal.ts`: company details for the legal pages. `lib/content.ts`: marketing copy.
- `app/`: marketing pages, `/pricing`, and the legal pages `/terms`, `/privacy`, `/refunds`, `/acceptable-use`.
- `app/(product)/`: signup, login, checkout, onboarding (vetting, domains), `app/*` (dashboard, setup, inboxes, kit, billing, settings), and `admin` (fulfilment console).
- `supabase/migrations/`: schema, RLS, RPCs, Stripe columns, notifications and the email blocklist.
- `supabase/functions/`: create-checkout, billing-portal, stripe-webhook, notify.
- `supabase/templates/`: branded sign-in email (also pasted into the Supabase dashboard).
- `SUPABASE.md`: setup and how fulfilment works.

## Done
- Full clickable app plus the live Supabase backend; the admin console sets setup stage and inbox health.
- Stripe test checkout, customer portal, invoices and webhook, tested end to end with card 4242.
- Legal pages: no refunds, UK law, contact support@firstsend.site. Company number and address are blank until known.
- Custom domain firstsend.site; Resend domain verified; branded sign-in email.
- Order and status emails: "New order needs setup" (to admins), "You're ready to send" (to the customer) and "Replacement requested" (to admins). Database triggers call `notify` through pg_net, and each email is claimed with a `*_notified_at` column so it goes out once. Tested; `RESEND_API_KEY` is set.
- Server-side block on personal and throwaway sign-up emails: a trigger on `auth.users` checks `public.blocked_email_domains`. Tested.
- Stripe **live mode** (19 Oct): live products and prices (same lookup keys), billing portal, webhook `we_1USGJRBL9tgKU9A3DyGeTAAu`; live keys set in Supabase secrets. Tested end to end with a real card and a 100% off code. The live secret key and webhook secret are also kept locally in `~/.config/bookd/stripe-live.env` (never commit).
- Cloudflare: support@firstsend.site forwards to george@gskservices.net (Email Routing); old Namecheap eforward MX removed; site records are DNS only. GitHub Pages enforces HTTPS.
- Domain picker checks real availability: `check-domains` Edge Function (RDAP via IANA bootstrap, DNS fallback for TLDs without RDAP such as .co and .io). Checking a name also regenerates suggestions around it.
- Sequencer export is real: admins import the provider's inbox file in /admin (adds inboxes plus logins into `inbox_logins`), customers download an Instantly bulk-import CSV with logins. A replaced inbox's login is cleared automatically. Parser: `lib/providerCsv.ts`.

## Gotchas
- The Supabase MCP `apply_migration` often times out after 60s, and a timed-out migration is usually not applied. Check with `list_migrations` and split big migrations into smaller ones.
- Keep the `pg_net` extension enabled; the notify triggers depend on it.
- Secrets live in Supabase → Edge Functions → Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`). Never commit them.
- Edge Function return URLs are checked against `ALLOWED_ORIGINS` in create-checkout and billing-portal.

## To do
1. **Inbox provider (the main gap)**: choose a reseller or run your own Microsoft 365 tenants, then automate fulfilment, which is currently manual through /admin (import the provider file per customer).
2. **FAQ claims**: "setup runs automatically / same day" and "health checks" are not true yet; reword or make them true.
3. **Later**: real warmup and health monitoring, direct sequencer API push (Instantly or Smartlead), analytics.

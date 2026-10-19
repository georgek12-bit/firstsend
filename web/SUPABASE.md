# Connecting Firstsend to Supabase

> **Status:** done for project `vmnjfswqxxmykfnhecbm` (eu-west-1). Tables, security rules and keys are
> set up and the deploy workflow uses them. Still to do by hand: step 3 (sign-in URLs) and step 5 (admin).

Without Supabase settings the app runs as a browser-only demo. With them it uses real accounts
(email sign-in links) and a real database. Payments are still a placeholder until Stripe is added.

## 1. Create the project

1. Sign in at https://supabase.com and click **New project**. Name it `firstsend`, pick a region near
   your customers, and save the database password somewhere safe.

## 2. Create the tables

1. In the project, open **SQL Editor** and click **New query**.
2. Paste the whole of `supabase/migrations/20261015000000_init.sql` and click **Run**.
   It should finish with "Success. No rows returned".

## 3. Set up sign-in

**Authentication > URL Configuration**

- Site URL: `https://firstsend.site/`
- Redirect URLs: add `https://firstsend.site/**` (and `http://localhost:3000/**` for local work)

**Authentication > Sign In / Providers > Email**: keep Email enabled. Leave "Confirm email" on.

Supabase's built-in email sender only allows a few emails an hour. Before launch, add your own sender
under **Authentication > Emails > SMTP Settings** (Resend or Postmark both work).

## 4. Give the website its keys

From **Project Settings > API**, copy the **Project URL** and the **anon / publishable** key.
Both are safe to put in a public website; the database rules protect the data.

In GitHub: **Settings > Secrets and variables > Actions > Variables tab > New repository variable**

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon / publishable key |

Then **Actions > Deploy site to GitHub Pages > Run workflow**. The live site now uses Supabase.

For local work, copy `.env.example` to `.env.local` and fill in the same two values.

Never put the `service_role` / secret key in the website or in GitHub variables.

## 5. Make yourself an admin

1. Sign up on the live site with your own email.
2. In **SQL Editor**, run (with your email):

   ```sql
   update public.profiles set is_admin = true where email = 'you@yourdomain.com';
   ```

3. An **Admin** link now shows in your app sidebar, and `/admin` lists every customer.

## How fulfilment works (until it's automated)

1. A customer signs up, "pays", answers the onboarding questions and picks domains. They appear in
   **Admin > Needs action** with "Setup".
2. Buy their domains and create the inboxes with your provider. Move the setup stage along as you go;
   the customer sees each step on their setup page.
3. Paste their inbox addresses into **Add inboxes**, set each inbox's health, then click **Ready to send**.
4. When a customer requests a replacement, it shows under **Replacements to do**. Enter the new
   address and click **Done**.
5. After an upgrade, the customer shows "More inboxes": add domains and inboxes to reach their plan.

## Order and status emails

The `notify` Edge Function sends three emails through Resend, from `no-reply@firstsend.site`:

- **New order needs setup**, to every admin, when a customer picks their domains.
- **You're ready to send**, to the customer, when an admin sets their setup to Ready.
- **Replacement requested**, to every admin, when a customer reports a burned inbox.

Database triggers wake the function through `pg_net` (keep that extension enabled). Each email is
recorded in a `*_notified_at` column, so it goes out once. If sending fails, it is retried the next
time something happens. The function needs a `RESEND_API_KEY` secret (a Resend key with sending
access) under Edge Functions → Secrets.

## Work emails only

Sign-ups and email changes from personal (Gmail, Yahoo, Outlook…) and throwaway domains are
rejected by a trigger on `auth.users`. The list lives in `public.blocked_email_domains`; add a row
to block another domain.

-- Stripe: customer per profile, invoice links, and webhook idempotency.
alter table public.profiles add column stripe_customer_id text unique;
alter table public.invoices add column stripe_invoice_id text unique;
alter table public.invoices add column url text;
alter table public.subscriptions add column stripe_status text;

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security; -- no policies: server only

-- Payments now go through Stripe. Browsers can no longer create or edit subscriptions directly;
-- the webhook (service role) does it.
revoke execute on function public.start_subscription(public.plan_id, text, text, text) from authenticated;
revoke execute on function public.update_card(text, text, text) from authenticated;
revoke execute on function public.change_plan(public.plan_id) from authenticated;
revoke execute on function public.set_subscription_status(text) from authenticated;

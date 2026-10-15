-- Firstsend schema.
-- Customers can read only their own rows. Every write goes through a function below,
-- so plan prices, vetting and setup status can't be changed from the browser.
-- Admins (profiles.is_admin) can read everything and run the admin_* functions.
-- Keep plan_* functions in sync with web/lib/plans.ts.

create type public.plan_id as enum ('starter', 'growth');
create type public.inbox_status as enum ('warming', 'good', 'watch', 'burned', 'replacing');
create type public.setup_stage as enum ('queued', 'domains', 'dns', 'inboxes', 'warmup', 'ready');
create type public.sequencer_id as enum ('instantly', 'smartlead', 'emailbison', 'lemlist', 'apollo');

-- ---------- Plans ----------

create function public.plan_price(p public.plan_id) returns int language sql immutable as $$
  select case p when 'starter' then 125 when 'growth' then 250 end
$$;

create function public.plan_per_day(p public.plan_id) returns int language sql immutable as $$
  select case p when 'starter' then 800 when 'growth' then 1600 end
$$;

-- 20 sends per inbox a day, 25 inboxes per domain.
create function public.plan_domains(p public.plan_id) returns int language sql immutable as $$
  select ceil(ceil(public.plan_per_day(p) / 20.0) / 25.0)::int
$$;

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan public.plan_id not null,
  pending_plan public.plan_id,
  status text not null default 'active' check (status in ('active', 'canceled')),
  started_at timestamptz not null default now(),
  renews_at timestamptz not null default now() + interval '30 days',
  card_brand text,
  card_last4 text,
  card_exp text,
  stripe_customer_id text,
  stripe_subscription_id text,
  setup_stage public.setup_stage,
  setup_started_at timestamptz,
  setup_done_at timestamptz
);

create table public.businesses (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  company text not null,
  website text not null,
  clients text not null check (clients in ('0', '1-3', '4-10', '10+')),
  use_case text not null check (use_case in ('agency', 'own', 'recruiting', 'b2c')),
  lead_source text not null check (lead_source in ('build', 'bought', 'unsure')),
  sequencer text not null,
  vetting_result text check (vetting_result in ('approved', 'declined')),
  vetting_reason text,
  updated_at timestamptz not null default now()
);

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null unique,
  byod boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.inboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  addr text not null unique,
  domain text not null,
  status public.inbox_status not null default 'warming',
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  replace_requested_at timestamptz
);

create table public.replacements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  inbox_id uuid references public.inboxes (id) on delete set null,
  old_addr text not null,
  new_addr text,
  requested_at timestamptz not null default now(),
  done_at timestamptz
);

create table public.connections (
  user_id uuid not null references public.profiles (id) on delete cascade,
  sequencer public.sequencer_id not null,
  at timestamptz not null default now(),
  inboxes int not null default 0,
  primary key (user_id, sequencer)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  amount int not null,
  label text not null
);

create index on public.domains (user_id);
create index on public.inboxes (user_id);
create index on public.replacements (user_id);
create index on public.invoices (user_id);

-- ---------- New users get a profile ----------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in step when someone changes their email.
create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------- Row level security ----------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.businesses enable row level security;
alter table public.domains enable row level security;
alter table public.inboxes enable row level security;
alter table public.replacements enable row level security;
alter table public.connections enable row level security;
alter table public.invoices enable row level security;

create policy "own or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own or admin" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
create policy "own or admin" on public.businesses for select using (user_id = auth.uid() or public.is_admin());
create policy "own or admin" on public.domains for select using (user_id = auth.uid() or public.is_admin());
create policy "own or admin" on public.inboxes for select using (user_id = auth.uid() or public.is_admin());
create policy "own or admin" on public.replacements for select using (user_id = auth.uid() or public.is_admin());
create policy "own or admin" on public.connections for select using (user_id = auth.uid() or public.is_admin());
create policy "own or admin" on public.invoices for select using (user_id = auth.uid() or public.is_admin());

-- Connections are harmless to edit directly.
create policy "own insert" on public.connections for insert with check (user_id = auth.uid());
create policy "own update" on public.connections for update using (user_id = auth.uid());
create policy "own delete" on public.connections for delete using (user_id = auth.uid());

-- ---------- Customer actions ----------

create function public.require_user() returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  return auth.uid();
end $$;

create function public.update_profile(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set name = trim(p_name) where id = public.require_user();
end $$;

-- TEMPORARY until Stripe: records a subscription without charging. The Stripe
-- webhook will create subscriptions instead, and this function gets dropped.
create function public.start_subscription(p_plan public.plan_id, p_brand text, p_last4 text, p_exp text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_user();
begin
  if exists (select 1 from public.subscriptions where user_id = uid) then
    raise exception 'You already have a plan';
  end if;
  insert into public.subscriptions (user_id, plan, card_brand, card_last4, card_exp)
  values (uid, p_plan, p_brand, right(p_last4, 4), p_exp);
  insert into public.invoices (user_id, amount, label)
  values (uid, public.plan_price(p_plan), initcap(p_plan::text) || ' plan, monthly');
end $$;

create function public.submit_business(
  p_company text, p_website text, p_clients text, p_use_case text, p_lead_source text, p_sequencer text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_user();
  v_result text := 'approved';
  v_reason text;
begin
  if not exists (select 1 from public.subscriptions where user_id = uid) then
    raise exception 'Choose a plan first';
  end if;
  -- Vetting rules live here so they can't be skipped from the browser.
  if p_use_case = 'b2c' then
    v_result := 'declined';
    v_reason := 'We only support B2B outreach. Cold email to consumers breaks our acceptable use policy.';
  end if;
  insert into public.businesses (user_id, company, website, clients, use_case, lead_source, sequencer, vetting_result, vetting_reason)
  values (uid, trim(p_company), trim(p_website), p_clients, p_use_case, p_lead_source, p_sequencer, v_result, v_reason)
  on conflict (user_id) do update set
    company = excluded.company, website = excluded.website, clients = excluded.clients,
    use_case = excluded.use_case, lead_source = excluded.lead_source, sequencer = excluded.sequencer,
    vetting_result = excluded.vetting_result, vetting_reason = excluded.vetting_reason, updated_at = now();
  return v_result;
end $$;

create function public.reopen_onboarding() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.businesses set vetting_result = null, vetting_reason = null
  where user_id = public.require_user() and vetting_result = 'declined';
end $$;

create function public.update_business(p_company text, p_website text, p_sequencer text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.businesses
  set company = trim(p_company), website = trim(p_website), sequencer = p_sequencer, updated_at = now()
  where user_id = public.require_user();
end $$;

create function public.choose_domains(p_names text[], p_byod boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_user();
  sub public.subscriptions;
  n text;
begin
  select * into sub from public.subscriptions where user_id = uid;
  if sub is null then raise exception 'Choose a plan first'; end if;
  if not exists (select 1 from public.businesses where user_id = uid and vetting_result = 'approved') then
    raise exception 'Finish the business questions first';
  end if;
  if exists (select 1 from public.domains where user_id = uid) then raise exception 'Domains already chosen'; end if;
  if coalesce(array_length(p_names, 1), 0) <> public.plan_domains(sub.plan) then
    raise exception 'Pick % domains', public.plan_domains(sub.plan);
  end if;
  foreach n in array p_names loop
    if lower(n) !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.[a-z]{2,}(\.[a-z]{2,})?$' then
      raise exception 'Invalid domain: %', n;
    end if;
    insert into public.domains (user_id, name, byod) values (uid, lower(n), p_byod);
  end loop;
  update public.subscriptions set setup_stage = 'queued', setup_started_at = now() where user_id = uid;
end $$;

create function public.request_replacement(p_inbox uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := public.require_user(); b public.inboxes;
begin
  select * into b from public.inboxes where id = p_inbox and user_id = uid;
  if b is null then raise exception 'Inbox not found'; end if;
  if b.status not in ('burned', 'watch') then raise exception 'Only burned or watched inboxes can be replaced'; end if;
  update public.inboxes set status = 'replacing', replace_requested_at = now() where id = b.id;
  insert into public.replacements (user_id, inbox_id, old_addr) values (uid, b.id, b.addr);
end $$;

create function public.change_plan(p_plan public.plan_id) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_user();
  sub public.subscriptions;
  left_share numeric;
begin
  select * into sub from public.subscriptions where user_id = uid;
  if sub is null or sub.status <> 'active' then raise exception 'No active plan'; end if;
  if p_plan = sub.plan then
    update public.subscriptions set pending_plan = null where user_id = uid;
    return 'unchanged';
  end if;
  if public.plan_price(p_plan) < public.plan_price(sub.plan) then
    update public.subscriptions set pending_plan = p_plan where user_id = uid;
    return 'scheduled';
  end if;
  -- Upgrade now and bill the difference for the rest of the period.
  -- An admin adds the extra domains and inboxes; the admin page flags accounts below their plan's inbox count.
  left_share := greatest(0, extract(epoch from sub.renews_at - now()) / extract(epoch from interval '30 days'));
  update public.subscriptions set plan = p_plan, pending_plan = null where user_id = uid;
  insert into public.invoices (user_id, amount, label)
  values (uid, round((public.plan_price(p_plan) - public.plan_price(sub.plan)) * left_share),
          'Upgrade to ' || initcap(p_plan::text) || ', rest of month');
  return 'upgraded';
end $$;

create function public.set_subscription_status(p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('active', 'canceled') then raise exception 'Bad status'; end if;
  update public.subscriptions set status = p_status where user_id = public.require_user();
end $$;

-- TEMPORARY until Stripe (the Stripe customer portal will handle cards).
create function public.update_card(p_brand text, p_last4 text, p_exp text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.subscriptions set card_brand = p_brand, card_last4 = right(p_last4, 4), card_exp = p_exp
  where user_id = public.require_user();
end $$;

-- ---------- Admin actions ----------

create function public.require_admin() returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
end $$;

create function public.admin_set_stage(p_user uuid, p_stage public.setup_stage) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.subscriptions
  set setup_stage = p_stage,
      setup_done_at = case when p_stage = 'ready' then now() else null end
  where user_id = p_user;
end $$;

-- Add domains for a customer (used after an upgrade, when the plan needs more).
create function public.admin_add_domains(p_user uuid, p_names text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  perform public.require_admin();
  foreach n in array p_names loop
    n := lower(trim(n));
    continue when n = '';
    insert into public.domains (user_id, name) values (p_user, n);
  end loop;
end $$;

-- Add inboxes from a list of addresses. Each address's domain must belong to the customer.
create function public.admin_add_inboxes(p_user uuid, p_addrs text[]) returns int
language plpgsql security definer set search_path = '' as $$
declare a text; d text; added int := 0;
begin
  perform public.require_admin();
  foreach a in array p_addrs loop
    a := lower(trim(a));
    continue when a = '';
    d := split_part(a, '@', 2);
    if not exists (select 1 from public.domains where user_id = p_user and name = d) then
      raise exception '% is not one of this customer''s domains', d;
    end if;
    insert into public.inboxes (user_id, addr, domain) values (p_user, a, d) on conflict (addr) do nothing;
    if found then added := added + 1; end if;
  end loop;
  return added;
end $$;

create function public.admin_set_inbox_status(p_inbox uuid, p_status public.inbox_status) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.inboxes
  set status = p_status, ready_at = case when p_status = 'good' and ready_at is null then now() else ready_at end
  where id = p_inbox;
end $$;

-- Finish a replacement: the old inbox is removed and the new one starts warming.
create function public.admin_complete_replacement(p_replacement uuid, p_new_addr text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.replacements; d text;
begin
  perform public.require_admin();
  select * into r from public.replacements where id = p_replacement and done_at is null;
  if r is null then raise exception 'Replacement not found or already done'; end if;
  p_new_addr := lower(trim(p_new_addr));
  d := split_part(p_new_addr, '@', 2);
  if not exists (select 1 from public.domains where user_id = r.user_id and name = d) then
    raise exception '% is not one of this customer''s domains', d;
  end if;
  delete from public.inboxes where id = r.inbox_id;
  insert into public.inboxes (user_id, addr, domain) values (r.user_id, p_new_addr, d);
  update public.replacements set new_addr = p_new_addr, done_at = now(), inbox_id = null where id = r.id;
end $$;

-- ---------- Grants ----------
-- Functions are callable by signed-in users only; each checks ownership or admin itself.

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
-- RLS policies call is_admin(), so signed-out requests need it too (it returns false for them).
grant execute on function public.is_admin() to anon;

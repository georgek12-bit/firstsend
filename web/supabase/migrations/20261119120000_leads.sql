-- Free lead lists from GetLeads. The `leads` Edge Function does the searching with the
-- service role; customers can only read their own requests and download their own files.

create table public.lead_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  filters jsonb not null,
  summary text not null default '',
  requested int not null check (requested > 0),
  status text not null default 'running' check (status in ('running', 'ready', 'failed')),
  rows int not null default 0,
  skipped int not null default 0, -- matches left out because this customer already had them
  file_path text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index lead_requests_user_idx on public.lead_requests (user_id, created_at desc);

alter table public.lead_requests enable row level security;
create policy "own or admin" on public.lead_requests for select using (user_id = (select auth.uid()) or public.is_admin());

-- Every email a customer has been given, so no one gets the same lead twice.
-- No policies: only the Edge Function (service role) touches it.
create table public.lead_history (
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  request_id uuid references public.lead_requests (id) on delete set null,
  at timestamptz not null default now(),
  primary key (user_id, email)
);

alter table public.lead_history enable row level security;

-- Records the emails this customer hasn't had before and returns just those.
create function public.claim_leads(p_user uuid, p_request uuid, p_emails text[]) returns setof text
language sql security definer set search_path = '' as $$
  insert into public.lead_history (user_id, email, request_id)
  select p_user, lower(e), p_request from unnest(p_emails) as e
  on conflict do nothing
  returning email
$$;

revoke execute on function public.claim_leads(uuid, uuid, text[]) from public, anon, authenticated;

-- Private bucket for the finished CSVs. Downloads go through signed links from the Edge Function.
insert into storage.buckets (id, name, public) values ('leads', 'leads', false) on conflict (id) do nothing;

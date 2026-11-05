-- Addresses allowed to sign up even though their domain is blocked (e.g. personal Gmail for testing).
-- Applied to the live project as signup_email_exceptions. Keep EMAIL_EXCEPTIONS in web/lib/state.ts in sync.
create table public.signup_email_exceptions (
  email text primary key check (email = lower(email)),
  reason text not null default '',
  created_at timestamptz not null default now()
);
alter table public.signup_email_exceptions enable row level security;
insert into public.signup_email_exceptions (email, reason) values ('georgekane172@gmail.com', 'testing');

create or replace function public.check_signup_email() returns trigger language plpgsql security definer set search_path = '' as $$
declare r text; begin
  if exists (select 1 from public.signup_email_exceptions where email = lower(new.email)) then return new; end if;
  select reason into r from public.blocked_email_domains where domain = lower(split_part(new.email,'@',2));
  if r = 'disposable' then raise exception 'Disposable email addresses can''t be used. Use your work email.' using errcode='P0001';
  elsif r = 'free' then raise exception 'Use your work email, like you@youragency.com.' using errcode='P0001'; end if;
  return new; end $$;

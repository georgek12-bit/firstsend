-- Server-side block on personal and throwaway sign-up emails, and order/status email triggers.
-- Applied to the live project as email_rules_1_blocklist, email_rules_2_trigger,
-- notifications_1_columns and notifications_2_triggers.

-- 1. Email rules -------------------------------------------------------------
create table public.blocked_email_domains (domain text primary key, reason text not null check (reason in ('free','disposable')));
alter table public.blocked_email_domains enable row level security;
insert into public.blocked_email_domains (domain, reason) values
  ('gmail.com','free'),('googlemail.com','free'),('yahoo.com','free'),('yahoo.co.uk','free'),('hotmail.com','free'),
  ('hotmail.co.uk','free'),('outlook.com','free'),('live.com','free'),('msn.com','free'),('icloud.com','free'),('me.com','free'),
  ('aol.com','free'),('proton.me','free'),('protonmail.com','free'),('gmx.com','free'),('gmx.net','free'),('yandex.com','free'),
  ('mail.com','free'),('zoho.com','free'),
  ('mailinator.com','disposable'),('guerrillamail.com','disposable'),('10minutemail.com','disposable'),('tempmail.com','disposable'),
  ('temp-mail.org','disposable'),('yopmail.com','disposable'),('trashmail.com','disposable'),('sharklasers.com','disposable'),
  ('getnada.com','disposable'),('maildrop.cc','disposable'),('dispostable.com','disposable'),('throwawaymail.com','disposable');

create function public.check_signup_email() returns trigger language plpgsql security definer set search_path = '' as $$
declare r text; begin
  select reason into r from public.blocked_email_domains where domain = lower(split_part(new.email,'@',2));
  if r = 'disposable' then raise exception 'Disposable email addresses can''t be used. Use your work email.' using errcode='P0001';
  elsif r = 'free' then raise exception 'Use your work email, like you@youragency.com.' using errcode='P0001'; end if;
  return new; end $$;
revoke execute on function public.check_signup_email() from public, anon, authenticated;
create trigger check_signup_email before insert on auth.users for each row execute function public.check_signup_email();
create trigger check_email_change before update of email on auth.users for each row
  when (new.email is distinct from old.email) execute function public.check_signup_email();

-- 2. Notifications -----------------------------------------------------------
-- Each column records when that email went out; the notify Edge Function claims rows where it is null.
alter table public.subscriptions add column order_notified_at timestamptz, add column ready_notified_at timestamptz;
alter table public.replacements add column notified_at timestamptz;
-- Don't email about anything that happened before this existed.
update public.subscriptions set order_notified_at = now() where setup_stage is not null;
update public.subscriptions set ready_notified_at = now() where setup_stage = 'ready';
update public.replacements set notified_at = now();

-- Wakes the notify function (needs pg_net). The function works out what is due itself.
create function public.ping_notify() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(url := 'https://vmnjfswqxxmykfnhecbm.supabase.co/functions/v1/notify', body := '{}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb);
  return null;
end $$;
revoke execute on function public.ping_notify() from public, anon, authenticated;
create trigger notify_on_stage after update of setup_stage on public.subscriptions for each row
  when (new.setup_stage is distinct from old.setup_stage and new.setup_stage in ('queued','ready')) execute function public.ping_notify();
create trigger notify_on_replacement after insert on public.replacements for each row execute function public.ping_notify();

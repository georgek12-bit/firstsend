-- Support tickets: a customer opens a ticket (optionally about one inbox) and chats with admins.
-- Customers read only their own; every write goes through a function below.
-- New messages wake the notify function, which emails the other side once per message.

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (length(subject) between 1 and 140),
  category text not null check (category in ('inbox', 'deliverability', 'setup', 'billing', 'other')),
  inbox_id uuid references public.inboxes (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  waiting_on text not null default 'admin' check (waiting_on in ('admin', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  -- The ticket's customer, so the read policy needs no join.
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_admin boolean not null default false,
  author_name text not null default '',
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

create index support_tickets_user_id_idx on public.support_tickets (user_id);
create index support_tickets_inbox_id_idx on public.support_tickets (inbox_id);
create index support_messages_ticket_id_idx on public.support_messages (ticket_id, created_at);
create index support_messages_user_id_idx on public.support_messages (user_id);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
create policy "own or admin" on public.support_tickets for select using (user_id = (select auth.uid()) or public.is_admin());
create policy "own or admin" on public.support_messages for select using (user_id = (select auth.uid()) or public.is_admin());

create function public.open_ticket(p_subject text, p_category text, p_inbox uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t uuid; who text;
begin
  if uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_inbox is not null and not exists (select 1 from public.inboxes where id = p_inbox and user_id = uid) then
    raise exception 'That inbox is not on your account';
  end if;
  select name into who from public.profiles where id = uid;
  insert into public.support_tickets (user_id, subject, category, inbox_id)
  values (uid, trim(p_subject), p_category, p_inbox) returning id into t;
  insert into public.support_messages (ticket_id, user_id, author_name, body)
  values (t, uid, coalesce(who, ''), trim(p_body));
  return t;
end $$;

-- The ticket's customer or an admin can reply. A customer reply reopens a closed ticket.
create function public.post_support_message(p_ticket uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t public.support_tickets; admin_reply boolean; who text;
begin
  select * into t from public.support_tickets where id = p_ticket;
  if t is null then raise exception 'Ticket not found'; end if;
  if t.user_id = uid then admin_reply := false;
  elsif public.is_admin() then admin_reply := true;
  else raise exception 'Ticket not found';
  end if;
  select name into who from public.profiles where id = uid;
  insert into public.support_messages (ticket_id, user_id, from_admin, author_name, body)
  values (t.id, t.user_id, admin_reply, coalesce(who, ''), trim(p_body));
  update public.support_tickets
  set updated_at = now(),
      waiting_on = case when admin_reply then 'customer' else 'admin' end,
      status = case when admin_reply then status else 'open' end
  where id = t.id;
end $$;

create function public.set_ticket_status(p_ticket uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('open', 'closed') then raise exception 'Bad status'; end if;
  update public.support_tickets set status = p_status, updated_at = now()
  where id = p_ticket and (user_id = auth.uid() or public.is_admin());
  if not found then raise exception 'Ticket not found'; end if;
end $$;

revoke execute on function public.open_ticket(text, text, uuid, text) from public, anon;
revoke execute on function public.post_support_message(uuid, text) from public, anon;
revoke execute on function public.set_ticket_status(uuid, text) from public, anon;
grant execute on function public.open_ticket(text, text, uuid, text) to authenticated;
grant execute on function public.post_support_message(uuid, text) to authenticated;
grant execute on function public.set_ticket_status(uuid, text) to authenticated;

create trigger notify_on_support_message after insert on public.support_messages
for each statement execute function public.ping_notify();

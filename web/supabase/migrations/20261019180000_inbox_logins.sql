-- Sending logins for each inbox, imported by an admin from the provider's file.
-- Customers can read only their own (they need them to load inboxes into a sequencer).

create table public.inbox_logins (
  inbox_id uuid primary key references public.inboxes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  imap_username text not null,
  imap_password text not null,
  imap_host text not null,
  imap_port int not null,
  smtp_username text not null,
  smtp_password text not null,
  smtp_host text not null,
  smtp_port int not null,
  updated_at timestamptz not null default now()
);

create index inbox_logins_user_id_idx on public.inbox_logins (user_id);

alter table public.inbox_logins enable row level security;
create policy "own or admin" on public.inbox_logins for select using (user_id = (select auth.uid()) or public.is_admin());

-- Import rows from the provider's file. Adds any inbox that's missing and saves its login.
-- Each address's domain must belong to the customer. Returns how many rows were saved.
create function public.admin_import_inboxes(p_user uuid, p_rows jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare r jsonb; a text; d text; ib uuid; saved int := 0;
begin
  perform public.require_admin();
  for r in select * from jsonb_array_elements(p_rows) loop
    a := lower(trim(r->>'email'));
    continue when coalesce(a, '') = '';
    d := split_part(a, '@', 2);
    if not exists (select 1 from public.domains where user_id = p_user and name = d) then
      raise exception '% is not one of this customer''s domains', d;
    end if;
    insert into public.inboxes (user_id, addr, domain) values (p_user, a, d) on conflict (addr) do nothing;
    select id into ib from public.inboxes where addr = a and user_id = p_user;
    if ib is null then raise exception '% belongs to another customer', a; end if;
    insert into public.inbox_logins as l (
      inbox_id, user_id, first_name, last_name,
      imap_username, imap_password, imap_host, imap_port,
      smtp_username, smtp_password, smtp_host, smtp_port
    ) values (
      ib, p_user, coalesce(r->>'first_name', ''), coalesce(r->>'last_name', ''),
      r->>'imap_username', r->>'imap_password', r->>'imap_host', (r->>'imap_port')::int,
      r->>'smtp_username', r->>'smtp_password', r->>'smtp_host', (r->>'smtp_port')::int
    )
    on conflict (inbox_id) do update set
      first_name = excluded.first_name, last_name = excluded.last_name,
      imap_username = excluded.imap_username, imap_password = excluded.imap_password,
      imap_host = excluded.imap_host, imap_port = excluded.imap_port,
      smtp_username = excluded.smtp_username, smtp_password = excluded.smtp_password,
      smtp_host = excluded.smtp_host, smtp_port = excluded.smtp_port,
      updated_at = now();
    saved := saved + 1;
  end loop;
  return saved;
end $$;

revoke execute on function public.admin_import_inboxes(uuid, jsonb) from public, anon;
grant execute on function public.admin_import_inboxes(uuid, jsonb) to authenticated;

-- A replaced inbox keeps its row but gets a new address, so its old login no longer applies.
create function public.clear_login_on_new_addr() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.inbox_logins where inbox_id = new.id;
  return new;
end $$;

create trigger inboxes_clear_login after update of addr on public.inboxes
for each row when (old.addr is distinct from new.addr) execute function public.clear_login_on_new_addr();

revoke execute on function public.clear_login_on_new_addr() from public, anon, authenticated;

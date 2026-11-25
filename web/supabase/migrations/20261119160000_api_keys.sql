-- Public API (api.firstsend.site). Customers create keys in Settings > API.
-- Only a SHA-256 hash of each key is stored; the full key is shown once, at creation.

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  prefix text not null, -- first characters, so customers can tell keys apart
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index api_keys_user_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;
create policy "own or admin" on public.api_keys for select using (user_id = (select auth.uid()) or public.is_admin());

-- Requests per key per minute, for rate limiting. Only the API function touches it.
create table public.api_usage (
  key_id uuid not null references public.api_keys (id) on delete cascade,
  minute timestamptz not null,
  count int not null default 0,
  primary key (key_id, minute)
);

alter table public.api_usage enable row level security;

-- Create a key for the signed-in customer. Returns the full key: the only time it is ever visible.
create function public.create_api_key(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := public.require_user();
  k text := 'fs_live_' || encode(extensions.gen_random_bytes(24), 'hex');
  row public.api_keys;
begin
  if (select count(*) from public.api_keys where user_id = uid and revoked_at is null) >= 10 then
    raise exception 'You can have up to 10 active keys. Revoke one first.';
  end if;
  insert into public.api_keys (user_id, name, prefix, key_hash)
  values (uid, coalesce(nullif(trim(p_name), ''), 'API key'), left(k, 14), encode(extensions.digest(k, 'sha256'), 'hex'))
  returning * into row;
  return jsonb_build_object('id', row.id, 'name', row.name, 'prefix', row.prefix, 'key', k, 'created_at', row.created_at);
end $$;

create function public.revoke_api_key(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.api_keys set revoked_at = now()
  where id = p_id and user_id = public.require_user() and revoked_at is null;
  if not found then raise exception 'Key not found'; end if;
end $$;

revoke execute on function public.create_api_key(text) from public, anon;
revoke execute on function public.revoke_api_key(uuid) from public, anon;
grant execute on function public.create_api_key(text) to authenticated;
grant execute on function public.revoke_api_key(uuid) to authenticated;

-- Look up a key by its hash and count the request. Returns the owner and this minute's count,
-- or nothing if the key is unknown or revoked. Service role only.
create function public.api_auth(p_hash text) returns table (key_id uuid, user_id uuid, used int)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare k public.api_keys; m timestamptz := date_trunc('minute', now()); c int;
begin
  select * into k from public.api_keys where key_hash = p_hash and revoked_at is null;
  if k is null then return; end if;
  insert into public.api_usage as u (key_id, minute, count) values (k.id, m, 1)
  on conflict (key_id, minute) do update set count = u.count + 1
  returning u.count into c;
  update public.api_keys set last_used_at = now() where id = k.id and (last_used_at is null or last_used_at < now() - interval '1 minute');
  delete from public.api_usage where api_usage.key_id = k.id and minute < m - interval '1 hour';
  return query select k.id, k.user_id, c;
end $$;

-- Same rules as request_replacement, for a customer acting through the API.
create function public.api_request_replacement(p_user uuid, p_inbox uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.inboxes;
begin
  select * into b from public.inboxes where id = p_inbox and user_id = p_user;
  if b is null then raise exception 'Inbox not found'; end if;
  if b.status not in ('burned', 'watch') then raise exception 'Only burned or watched inboxes can be replaced'; end if;
  update public.inboxes set status = 'replacing', replace_requested_at = now() where id = b.id;
  insert into public.replacements (user_id, inbox_id, old_addr) values (p_user, b.id, b.addr);
end $$;

revoke execute on function public.api_auth(text) from public, anon, authenticated;
revoke execute on function public.api_request_replacement(uuid, uuid) from public, anon, authenticated;

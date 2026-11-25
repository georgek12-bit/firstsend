-- Fix: api_auth's output column names (key_id, user_id) clashed with api_usage's columns,
-- so every API call failed with "column reference key_id is ambiguous".
create or replace function public.api_auth(p_hash text) returns table (key_id uuid, user_id uuid, used int)
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

revoke execute on function public.api_auth(text) from public, anon, authenticated;

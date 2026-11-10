-- Google, Microsoft and Apple send the person's name as full_name (or name), not our own 'name' field.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), '')
  );
  return new;
end $$;
revoke execute on function public.handle_new_user() from authenticated;

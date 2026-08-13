-- Fix: handle_new_user() lost its `set search_path = public` when migration 006
-- rewrote it. Without that, the unqualified `nextval('rhapsody_id_seq')` and
-- `user_role::"Role"` fail to resolve when the trigger fires under the auth
-- service's role (whose default search_path does not include `public`),
-- causing "Database error creating new user" on every signup and blocking
-- superadmin club-admin creation ("User row not found after creation").

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_rhapsody_id text;
  user_role text;
begin
  new_rhapsody_id := 'RH-' || lpad(nextval('rhapsody_id_seq')::text, 5, '0');
  user_role := coalesce(new.raw_user_meta_data->>'role', 'golfer');

  insert into public.users (auth_id, rhapsody_id, name, email, role, created_at, updated_at)
  values (
    new.id,
    new_rhapsody_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    user_role::"Role",
    now(),
    now()
  )
  on conflict (auth_id) do nothing;

  return new;
exception when others then
  raise log 'handle_new_user error for %: % %', new.email, sqlstate, sqlerrm;
  return new;
end;
$$;

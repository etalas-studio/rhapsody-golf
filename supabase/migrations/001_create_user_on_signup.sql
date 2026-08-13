-- Auto-create public.users row when a new auth.users record is inserted.
-- rhapsody_id is generated from a sequence: RH-00001, RH-00002, ...

create sequence if not exists rhapsody_id_seq start 10001;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_rhapsody_id text;
begin
  new_rhapsody_id := 'RH-' || lpad(nextval('rhapsody_id_seq')::text, 5, '0');

  insert into public.users (auth_id, rhapsody_id, name, email, role, created_at, updated_at)
  values (
    new.id,
    new_rhapsody_id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'golfer',
    now(),
    now()
  )
  on conflict (auth_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

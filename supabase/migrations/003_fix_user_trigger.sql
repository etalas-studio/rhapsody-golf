-- Fix: Prisma @default(cuid()) is app-level only; DB has no DEFAULT on id.
-- Trigger must supply id. Use gen_random_uuid()::text (valid string PK, compatible with Prisma).
-- Also add handicap_index default in case it's missing at DB level.

ALTER TABLE public.users
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN handicap_index SET DEFAULT 54.0;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  new_rhapsody_id TEXT;
BEGIN
  new_rhapsody_id := 'RH-' || LPAD(nextval('rhapsody_id_seq')::TEXT, 5, '0');
  INSERT INTO public.users (auth_id, rhapsody_id, name, email, role, handicap_index, created_at, updated_at)
  VALUES (
    NEW.id,
    new_rhapsody_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'golfer',
    54.0,
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$;

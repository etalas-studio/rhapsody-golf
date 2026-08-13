ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS terms_and_conditions text;

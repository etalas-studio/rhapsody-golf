-- Add price_includes column to clubs table.
-- Replaces cart_policy/cart_fee/caddie_policy/caddie_fee for display purposes in course setup.
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS price_includes text[] DEFAULT '{}';

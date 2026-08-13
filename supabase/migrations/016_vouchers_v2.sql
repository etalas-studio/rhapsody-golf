-- Migration 016: Voucher schema v2
-- Replaces old vouchers table (value: text) with new schema supporting
-- Percentage/FixedAmount discount types, quota tracking, and redemption log.

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "DiscountType" AS ENUM ('Percentage', 'FixedAmount');

-- ─── Alter vouchers table ─────────────────────────────────────────────────────

-- Drop old columns, add new ones.
-- We use IF EXISTS / IF NOT EXISTS to make this idempotent on re-run.

ALTER TABLE vouchers
  DROP COLUMN IF EXISTS value,
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS discount_type      "DiscountType" NOT NULL DEFAULT 'FixedAmount',
  ADD COLUMN IF NOT EXISTS discount_value     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_discount_cap   INTEGER,
  ADD COLUMN IF NOT EXISTS quota              INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS used_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starts_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS min_booking_amount INTEGER,
  ADD COLUMN IF NOT EXISTS is_public          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── Alter bookings table ─────────────────────────────────────────────────────

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS subtotal         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_id       TEXT REFERENCES vouchers(id);

-- Back-fill subtotal = amount for existing rows
UPDATE bookings SET subtotal = amount WHERE subtotal = 0;

-- ─── New table: voucher_redemptions ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  voucher_id   TEXT NOT NULL REFERENCES vouchers(id),
  user_id      TEXT NOT NULL REFERENCES users(id),
  booking_id   TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voucher_id, user_id)
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Golfer can read their own redemptions
CREATE POLICY "golfer_read_own_redemptions" ON voucher_redemptions
  FOR SELECT USING (user_id = auth.uid()::TEXT);

-- Club admin can read redemptions for their club's vouchers
CREATE POLICY "club_admin_read_redemptions" ON voucher_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vouchers v
      JOIN club_admins ca ON ca.club_id = v.club_id
      WHERE v.id = voucher_redemptions.voucher_id
        AND ca.user_id = auth.uid()::TEXT
    )
  );

-- Service role can do anything (backend)
CREATE POLICY "service_role_all_redemptions" ON voucher_redemptions
  FOR ALL USING (auth.role() = 'service_role');

-- ─── updated_at trigger for vouchers ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS vouchers_updated_at ON vouchers;
CREATE TRIGGER vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

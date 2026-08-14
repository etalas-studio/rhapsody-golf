-- Simplify VoucherStatus enum to Active/Inactive only.
-- Per-user state (Redeemed/Expired) is derived from voucher_redemptions + expiry_date.

-- 1. Migrate existing non-Active/Inactive values to Inactive before altering enum
UPDATE vouchers SET status = 'Active'::"VoucherStatus"
  WHERE status::text NOT IN ('Active', 'Inactive');

-- 2. Add Inactive to enum if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public."VoucherStatus"'::regtype
      AND enumlabel = 'Inactive'
  ) THEN
    ALTER TYPE "VoucherStatus" ADD VALUE 'Inactive';
  END IF;
END;
$$;

-- 3. Remove old values by renaming enum and creating a clean one
ALTER TYPE "VoucherStatus" RENAME TO "VoucherStatus_old";

CREATE TYPE "VoucherStatus" AS ENUM ('Active', 'Inactive');

ALTER TABLE vouchers
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE "VoucherStatus"
    USING status::text::"VoucherStatus",
  ALTER COLUMN status SET DEFAULT 'Active'::"VoucherStatus";

DROP TYPE "VoucherStatus_old";

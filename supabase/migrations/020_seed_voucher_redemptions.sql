-- Backfill voucher_redemptions for all bookings that used a voucher (including PendingPayment).
-- Derives ids via subquery — no hardcoded UUIDs.

INSERT INTO voucher_redemptions (voucher_id, user_id, booking_id, redeemed_at)
SELECT
  b.voucher_id,
  b.user_id,
  b.id AS booking_id,
  COALESCE(b.created_at, now()) AS redeemed_at
FROM bookings b
WHERE b.voucher_id IS NOT NULL
  AND b.status != 'Cancelled'
ON CONFLICT (voucher_id, user_id) DO NOTHING;

-- Sync used_count: count only Confirmed bookings (payment completed).
-- PendingPayment bookings hold the voucher_redemptions row but don't count toward used_count.
UPDATE vouchers v
SET used_count = (
  SELECT COUNT(*)
  FROM voucher_redemptions vr
  JOIN bookings b ON b.id = vr.booking_id
  WHERE vr.voucher_id = v.id
    AND b.status = 'Confirmed'
);

-- Atomically decrement vouchers.used_count (floor at 0) when a payment fails/expires.
CREATE OR REPLACE FUNCTION decrement_voucher_used_count(p_voucher_id TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE vouchers
  SET used_count = GREATEST(used_count - 1, 0)
  WHERE id = p_voucher_id;
END;
$$;

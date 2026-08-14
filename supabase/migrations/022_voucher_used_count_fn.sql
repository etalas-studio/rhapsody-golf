-- Atomic increment/decrement for vouchers.used_count via RPC.
-- Increment is called on payment confirmed; decrement is not needed (hold-then-confirm pattern).

CREATE OR REPLACE FUNCTION increment_voucher_used_count(p_voucher_id TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE vouchers SET used_count = used_count + 1 WHERE id = p_voucher_id;
END;
$$;

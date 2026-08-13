-- Migration 017: Fix vouchers RLS to allow golfers to read public vouchers.
-- The existing "golfer reads own" policy only covers user_id match.
-- Public vouchers (is_public = true) must also be readable by any authenticated golfer.

DROP POLICY IF EXISTS "vouchers: golfer reads own" ON vouchers;

CREATE POLICY "vouchers: golfer reads own or public" ON vouchers
  FOR SELECT USING (
    user_id = current_user_id()
    OR is_public = true
  );

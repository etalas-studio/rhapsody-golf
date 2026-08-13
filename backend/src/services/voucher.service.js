const supabase = require('../config/supabase');
const logger = require('../utils/logger');

// DB enum → display string (reverse of VOUCHER_TYPE_MAP)
const TYPE_DISPLAY_MAP = {
  GreenFee: 'Green Fee',
  FAndB: 'F&B',
  Cart: 'Cart',
  ProShop: 'Pro Shop',
};

/**
 * GET /api/vouchers — active vouchers for a user, optionally scoped to a club.
 */
async function getUserVouchers(userId, { clubId, allStatuses = false } = {}) {
  // Return vouchers that belong to this user OR are public.
  // PostgREST: user_id.eq.X does NOT match NULL rows, so we use
  // "user_id.eq.X,is_public.eq.true" which covers both cases correctly
  // because public vouchers have is_public=true regardless of user_id.
  const today = new Date().toISOString().slice(0, 10);
  const orFilter = `user_id.eq.${userId},is_public.eq.true`;
  let query = supabase
    .from('vouchers')
    .select('id, club_id, user_id, voucher_code, title, description, discount_type, discount_value, max_discount_cap, type, status, quota, used_count, starts_at, expiry_date, min_booking_amount, is_public, clubs(name, short_name)')
    .or(orFilter)
    .order('expiry_date');

  if (!allStatuses) {
    query = query.eq('status', 'Active').gte('expiry_date', today).lte('starts_at', today);
  }

  if (clubId) query = query.eq('club_id', clubId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((v) => ({ ...v, type: TYPE_DISPLAY_MAP[v.type] ?? v.type }));
}

/**
 * Validate and redeem a voucher in a booking context.
 * Returns { discount, voucherId } on success.
 * Throws on invalid / expired / already used / club mismatch.
 */
async function redeemVoucher({ voucherCode, userId, clubId }) {
  const { data: v, error } = await supabase
    .from('vouchers')
    .select('id, club_id, user_id, discount_type, discount_value, max_discount_cap, status, expiry_date, starts_at, used_count, quota, type')
    .eq('voucher_code', voucherCode)
    .single();

  if (error || !v) throw new Error('Voucher not found');
  if (v.status !== 'Active') throw new Error(`Voucher is ${v.status}`);
  if (new Date(v.expiry_date) < new Date()) throw new Error('Voucher has expired');
  if (new Date(v.starts_at) > new Date()) throw new Error('Voucher is not yet active');
  if (v.used_count >= v.quota) throw new Error('Voucher quota is exhausted');
  if (v.user_id && v.user_id !== userId) throw new Error('Voucher belongs to another user');
  if (clubId && v.club_id !== clubId) throw new Error('Voucher not valid at this club');

  // Increment used_count — redemption record created at booking confirm
  const { error: updErr } = await supabase
    .from('vouchers')
    .update({ used_count: v.used_count + 1 })
    .eq('id', v.id);

  if (updErr) throw new Error(updErr.message);

  logger.info('Voucher redeemed', { voucherCode, userId });
  return {
    voucherId: v.id,
    discount_type: v.discount_type,
    discount_value: v.discount_value,
    max_discount_cap: v.max_discount_cap,
  };
}

/**
 * POST /api/admin/vouchers — club admin issues a voucher.
 */
const VOUCHER_TYPE_MAP = {
  'Green Fee': 'GreenFee',
  'F&B': 'FAndB',
  'Cart': 'Cart',
  'Pro Shop': 'ProShop',
};

async function issueVoucher({
  club_id, user_id, title, description, discount_type, discount_value,
  max_discount_cap, type, status, quota, starts_at, expiry_date,
  min_booking_amount, is_public, voucher_code,
}) {
  const code = voucher_code ?? `${club_id.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const dbType = VOUCHER_TYPE_MAP[type] ?? type;

  const { data, error } = await supabase
    .from('vouchers')
    .insert({
      club_id,
      user_id: user_id ?? null,
      voucher_code: code,
      title,
      description: description ?? null,
      discount_type,
      discount_value,
      max_discount_cap: max_discount_cap ?? null,
      type: dbType ?? 'GreenFee',
      status: status ?? 'Active',
      quota,
      used_count: 0,
      starts_at,
      expiry_date,
      min_booking_amount: min_booking_amount ?? null,
      is_public: is_public ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  logger.info('Voucher issued', { code, club_id, user_id });
  return data;
}

module.exports = { getUserVouchers, redeemVoucher, issueVoucher, VOUCHER_TYPE_MAP };

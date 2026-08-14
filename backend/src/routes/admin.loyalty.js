const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { getAdminRule, upsertRule } = require('../services/loyalty.service');
const { issueVoucher, VOUCHER_TYPE_MAP, TYPE_DISPLAY_MAP } = require('../services/voucher.service');
const logger = require('../utils/logger');
const supabase = require('../config/supabase');

const router = Router();

// Club admin and superadmin only
function requireClubAdmin(req, res, next) {
  if (req.role !== 'club_admin' && req.role !== 'superadmin') {
    return res.status(403).json({ error: 'Club admin access required' });
  }
  next();
}

router.use(requireAuth, requireClubAdmin);

/**
 * GET /api/admin/loyalty-rules/:clubId
 */
router.get('/loyalty-rules/:clubId', async (req, res) => {
  try {
    const rule = await getAdminRule(req.params.clubId);
    res.json({ rule });
  } catch (err) {
    logger.error('GET /admin/loyalty-rules error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/loyalty-rules/:clubId
 * Body: any subset of rule fields to update.
 */
router.put('/loyalty-rules/:clubId', async (req, res) => {
  try {
    const rule = await upsertRule(req.params.clubId, req.body);
    res.json({ rule });
  } catch (err) {
    logger.error('PUT /admin/loyalty-rules error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/vouchers?clubId=
 * All vouchers for the club (not scoped to current user).
 */
router.get('/vouchers', async (req, res) => {
  const { clubId } = req.query;
  if (!clubId) return res.status(400).json({ error: 'clubId is required' });
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select('id, club_id, user_id, voucher_code, title, description, discount_type, discount_value, max_discount_cap, type, status, quota, used_count, starts_at, expiry_date, min_booking_amount, is_public')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    // Map DB enum back to display string
    const vouchers = (data ?? []).map((v) => ({ ...v, type: TYPE_DISPLAY_MAP[v.type] ?? v.type }));
    res.json({ vouchers });
  } catch (err) {
    logger.error('GET /admin/vouchers error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/vouchers
 * Body: { club_id, title, discount_type, discount_value, type, expiry_date, starts_at,
 *         quota, is_public, voucher_code?, description?, max_discount_cap?, min_booking_amount?, user_id? }
 */
/**
 * PATCH /api/admin/vouchers/:id
 * Update mutable fields of an existing voucher.
 */
router.patch('/vouchers/:id', async (req, res) => {
  const allowed =['title', 'description', 'discount_type', 'discount_value',
    'max_discount_cap', 'min_booking_amount', 'quota', 'starts_at', 'expiry_date',
    'is_public', 'type', 'status'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  // voucher_code is intentionally excluded — changing it would break redemptions

  if (updates.type) updates.type = VOUCHER_TYPE_MAP[updates.type] ?? updates.type;

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  try {
    const { data, error } = await supabase
      .from('vouchers')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    res.json({ voucher: data });
  } catch (err) {
    logger.error('PATCH /admin/vouchers/:id error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post('/vouchers', async (req, res) => {
  const {
    club_id, title, discount_type, discount_value, type,
    expiry_date, starts_at, quota, is_public, voucher_code,
    description, max_discount_cap, min_booking_amount, user_id,
  } = req.body;

  if (!club_id || !title || !discount_type || discount_value == null || !expiry_date || !starts_at || quota == null) {
    return res.status(400).json({ error: 'club_id, title, discount_type, discount_value, expiry_date, starts_at and quota are required' });
  }

  try {
    const voucher = await issueVoucher({
      club_id, user_id, title, description, discount_type, discount_value,
      max_discount_cap, type, status: 'Active', quota, starts_at, expiry_date,
      min_booking_amount, is_public: is_public ?? false, voucher_code,
    });
    res.status(201).json({ voucher });
  } catch (err) {
    logger.error('POST /admin/vouchers error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

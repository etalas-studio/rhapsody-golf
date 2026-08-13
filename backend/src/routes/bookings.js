const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createBooking,
  updateBookingStatus,
  getUserBookings,
} = require('../services/booking.service');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const router = Router();

// All booking routes require auth
router.use(requireAuth);

/**
 * GET /api/bookings
 * Query: ?status=Confirmed&limit=20&offset=0
 */
router.get('/', async (req, res) => {
  const { status, limit, offset } = req.query;
  try {
    const bookings = await getUserBookings(req.userId, {
      status,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ bookings });
  } catch (err) {
    logger.error('GET /bookings error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/bookings
 * Body: { slotId, players, cart?, caddie?, voucherCode? }
 *   OR: { club_id, tee_time, players, cart?, caddie?, voucher_id? }  (frontend convenience)
 */
router.post('/', async (req, res) => {
  let { slotId, players, cart, caddie, voucherCode } = req.body;
  const { club_id, tee_time, voucher_id } = req.body;

  // Support club_id + tee_time — look up the slot
  if (!slotId && club_id && tee_time) {
    const timePart = tee_time.includes('T') ? tee_time.split('T')[1].slice(0, 5) : tee_time;
    const datePart = tee_time.includes('T') ? tee_time.split('T')[0] : new Date().toISOString().slice(0, 10);
    const { data: slot } = await supabase
      .from('tee_slots')
      .select('id')
      .eq('club_id', club_id)
      .eq('date', datePart)
      .eq('time', timePart)
      .eq('available', true)
      .single();
    if (!slot) return res.status(409).json({ error: 'Slot no longer available' });
    slotId = slot.id;
    voucherCode = voucherCode ?? voucher_id ?? null;
  }

  if (!slotId || !players) {
    return res.status(400).json({ error: 'slotId (or club_id + tee_time) and players are required' });
  }

  try {
    const result = await createBooking({
      userId: req.userId,
      slotId,
      players: Number(players),
      cart: Boolean(cart),
      caddie: Boolean(caddie),
      voucherCode: voucherCode ?? null,
    });

    res.status(201).json({
      booking: result.booking,
      orderId: result.orderId,
      snapToken: result.snapToken,
      redirectUrl: result.redirectUrl,
      discountApplied: result.discountApplied,
    });
  } catch (err) {
    logger.error('POST /bookings error', { message: err.message });
    const status = err.message === 'Slot no longer available' ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/bookings/:id
 */
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, club_id, tee_time, tee_end_time, players, status, amount, subtotal, discount_amount, voucher_id, payment_status, game_type, channel_tag, ref_code, created_at, clubs(id, name, location), vouchers(voucher_code, title, discount_type, discount_value, max_discount_cap, type)')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Booking not found' });

  res.json({
    ...data,
    club_name: data.clubs?.name ?? null,
    clubs: undefined,
    voucher: data.vouchers ?? null,
    vouchers: undefined,
  });
});

/**
 * GET /api/bookings/:id/snap-token
 * Returns stored snap_token for PendingPayment bookings so user can resume payment.
 */
router.get('/:id/snap-token', async (req, res) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, snap_token, ref_code')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Booking not found' });
  if (data.status !== 'PendingPayment') return res.status(400).json({ error: 'Booking is not pending payment' });
  if (!data.snap_token) return res.status(410).json({ error: 'Payment token expired or unavailable' });

  res.json({ snap_token: data.snap_token, order_id: data.ref_code });
});

/**
 * PATCH /api/bookings/:id/status
 * Body: { status: 'Cancelled' | 'CheckedIn' | 'Completed' | 'NoShow' }
 * Golfers: Cancelled only. Club admins: all transitions.
 */
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['Cancelled', 'CheckedIn', 'Completed', 'NoShow'];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  try {
    const result = await updateBookingStatus(req.params.id, req.userId, status, req.role);
    res.json(result);
  } catch (err) {
    logger.error('PATCH /bookings/:id/status error', { message: err.message });
    const code = err.message === 'Booking not found' ? 404
      : err.message.startsWith('Not your') || err.message.startsWith('Golfers') ? 403
      : 500;
    res.status(code).json({ error: err.message });
  }
});

module.exports = router;

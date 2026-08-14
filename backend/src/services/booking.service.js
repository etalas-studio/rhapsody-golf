const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { earnPoints } = require('./loyalty.service');
const { snap } = require('../config/midtrans');

const MEMBER_DISCOUNT = 0.25; // 25%
const CHANNEL_TAG = 'GH_APP';

// Tee time price bands (IDR) — matches PRD §5.4
const PRICE_BANDS = [
  { start: '06:00', end: '10:30', price: 1_250_000, label: 'Early' },
  { start: '11:00', end: '13:30', price: 1_450_000, label: 'Prime' },
  { start: '14:00', end: '16:30', price: 1_100_000, label: 'Twilight' },
];

function priceForTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const mins = h * 60 + m;
  for (const band of PRICE_BANDS) {
    const [sh, sm] = band.start.split(':').map(Number);
    const [eh, em] = band.end.split(':').map(Number);
    if (mins >= sh * 60 + sm && mins <= eh * 60 + em) return band.price;
  }
  return 1_250_000; // fallback Early rate
}

/**
 * Get all tee slots for a club on a given date (available and booked).
 */
async function getTeeSlots(clubId, date) {
  const { data, error } = await supabase
    .from('tee_slots')
    .select('id, time, price, available')
    .eq('club_id', clubId)
    .eq('date', date)
    .order('time');

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Check if user has PaidMember status at this club → 25% discount.
 */
async function getMemberDiscount(userId, clubId) {
  const { data } = await supabase
    .from('club_members')
    .select('membership_status')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .single();

  return data?.membership_status === 'PaidMember' ? MEMBER_DISCOUNT : 0;
}

/**
 * Create a booking and return a Midtrans Snap token for payment.
 * Waterfall: base rate → member discount → voucher → Midtrans Snap.
 *
 * Booking is inserted with status PendingPayment.
 * Slot is locked (available=false) immediately to prevent double-booking.
 * If payment is not completed within 24h, Midtrans will expire the token;
 * the webhook handler resets the slot to available on expire/cancel.
 */
async function createBooking({
  userId,
  slotId,
  players,
  cart = false,
  caddie = false,
  voucherCode = null,
  channelTag = CHANNEL_TAG,
}) {
  // 1. Fetch slot — verify still available
  if (!slotId) throw new Error('Slot ID missing — booking cannot proceed');
  const { data: slot, error: slotErr } = await supabase
    .from('tee_slots')
    .select('id, club_id, date, time, end_time, price, available')
    .eq('id', slotId)
    .maybeSingle();

  if (slotErr || !slot) throw new Error(slotErr ? `Tee slot lookup failed: ${slotErr.message}` : `Tee slot not found (id: ${slotId})`);
  if (!slot.available) throw new Error('Slot no longer available');

  // 2. Fetch user details for Midtrans customer info
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, phone')
    .eq('id', userId)
    .single();

  const basePrice = slot.price ?? priceForTime(slot.time);

  // 3. Member discount
  const discountPct = await getMemberDiscount(userId, slot.club_id);
  const discountedRate = Math.round(basePrice * (1 - discountPct));

  // 4. Add-ons
  const CART_FEE = 150_000;
  const CADDIE_FEE = 200_000;
  const addons = (cart ? CART_FEE : 0) + (caddie ? CADDIE_FEE : 0);

  // 5. Voucher discount — voucherCode is actually the voucher_code string
  let voucherDiscount = 0;
  let voucherId = null;
  const today = new Date().toISOString().slice(0, 10);
  if (voucherCode) {
    const { data: v } = await supabase
      .from('vouchers')
      .select('id, discount_type, discount_value, max_discount_cap, status, expiry_date, starts_at, used_count, quota, club_id, user_id, min_booking_amount')
      .eq('voucher_code', voucherCode)
      .single();
    if (
      v &&
      v.status === 'Active' &&
      v.expiry_date >= today &&
      v.starts_at <= today &&
      v.used_count < v.quota &&
      (!v.user_id || v.user_id === userId) &&
      (!v.club_id || v.club_id === slot.club_id)
    ) {
      if (!v.min_booking_amount || discountedRate >= v.min_booking_amount) {
        if (v.discount_type === 'Percentage') {
          const raw = Math.round(discountedRate * (v.discount_value / 100));
          voucherDiscount = v.max_discount_cap ? Math.min(raw, v.max_discount_cap) : raw;
        } else {
          voucherDiscount = Math.min(v.discount_value, discountedRate);
        }
        voucherId = v.id;
      }
    }
  }

  const totalAmount = Math.max(0, discountedRate + addons - voucherDiscount);

  // 6. Build tee datetime — column is timestamp without time zone, store literal WIB (no offset)
  const teeTime = `${slot.date}T${slot.time}:00`;
  const teeEndTime = slot.end_time ?? null;

  // 7. Insert booking — slot locked immediately
  const { randomUUID } = require('crypto');
  // Generate orderId before INSERT so ref_code is set atomically
  const bookingId = randomUUID();
  const orderId = `RGC-${bookingId.slice(0, 8).toUpperCase()}-${Date.now()}`;

  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .insert({
      id: bookingId,
      club_id: slot.club_id,
      user_id: userId,
      tee_time: teeTime,
      tee_end_time: teeEndTime,
      players,
      status: 'PendingPayment',
      amount: totalAmount,
      subtotal: discountedRate,
      discount_amount: voucherDiscount,
      voucher_id: voucherId,
      payment_status: 'Pending',
      channel_tag: channelTag,
      game_type: 'Casual',
      ref_code: orderId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (bookErr) throw new Error(bookErr.message);

  // Lock slot — released by webhook if payment expires/cancelled
  await supabase.from('tee_slots').update({ available: false }).eq('id', slotId);

  // Hold the voucher for this user — used_count is incremented only on payment confirmed.
  // vouchers.status is only Active/Inactive — never mutated here.
  if (voucherId) {
    await supabase.from('voucher_redemptions').upsert(
      { voucher_id: voucherId, user_id: userId, booking_id: booking.id, redeemed_at: new Date().toISOString() },
      { onConflict: 'voucher_id,user_id' }
    );
  }

  // 8. Create Midtrans Snap transaction — orderId already set as ref_code during INSERT

  const itemDetails = [
    {
      id: 'green_fee',
      name: `Green Fee (${slot.time})`,
      price: discountedRate,
      quantity: players,
    },
  ];
  if (cart) itemDetails.push({ id: 'cart', name: 'Golf Cart', price: CART_FEE, quantity: 1 });
  if (caddie) itemDetails.push({ id: 'caddie', name: 'Caddie', price: CADDIE_FEE, quantity: 1 });
  if (voucherDiscount > 0) {
    itemDetails.push({
      id: 'voucher',
      name: `Voucher (${voucherCode})`,
      price: -voucherDiscount,
      quantity: 1,
    });
  }

  const snapParam = {
    transaction_details: {
      order_id: orderId,
      gross_amount: totalAmount,
    },
    item_details: itemDetails,
    customer_details: {
      first_name: user?.name ?? 'Guest',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
    custom_field1: booking.id,       // booking UUID — used in webhook to resolve booking
    custom_field2: slot.club_id,
    expiry: {
      unit: 'hours',
      duration: 24,
    },
  };

  let snapToken, redirectUrl;
  try {
    const snapResponse = await snap.createTransaction(snapParam);
    snapToken = snapResponse.token;
    redirectUrl = snapResponse.redirect_url;

    // Persist token so user can resume payment later (token valid 24h)
    await supabase.from('bookings').update({ snap_token: snapToken }).eq('id', booking.id);
  } catch (snapErr) {
    // Roll back: release slot + reset booking status
    await supabase.from('tee_slots').update({ available: true }).eq('id', slotId);
    await supabase.from('bookings').update({ status: 'Cancelled' }).eq('id', booking.id);
    if (voucherId) {
      await supabase.from('voucher_redemptions').delete().eq('booking_id', booking.id);
    }
    logger.error('Midtrans Snap error', { message: snapErr.message, orderId });
    throw new Error('Payment gateway error — please try again');
  }

  // Pending payment record
  await supabase.from('payments').insert({
    club_id: slot.club_id,
    user_id: userId,
    booking_id: booking.id,
    amount: totalAmount,
    payment_method_type: 'Midtrans',
    transaction_status: 'Pending',
    reference_number: orderId,
    settlement_status: 'Pending',
    category: 'GreenFee',
  });

  logger.info('Booking created — awaiting payment', {
    bookingId: booking.id,
    orderId,
    amount: totalAmount,
  });

  return {
    booking: { ...booking, ref_code: orderId },
    snapToken,
    redirectUrl,
    discountApplied: discountPct > 0,
    orderId,
  };
}

/**
 * PATCH /api/bookings/:id/status
 * Allowed transitions per role: club_admin can set CheckedIn/Completed/NoShow; golfer can Cancelled.
 */
async function updateBookingStatus(bookingId, userId, newStatus, role) {
  const { data: existing, error } = await supabase
    .from('bookings')
    .select('id, user_id, club_id, status, tee_time, amount')
    .eq('id', bookingId)
    .single();

  if (error || !existing) throw new Error('Booking not found');

  // Scope check
  if (role === 'golfer' && existing.user_id !== userId) throw new Error('Not your booking');
  if (role === 'golfer' && newStatus !== 'Cancelled') throw new Error('Golfers can only cancel');

  const { error: updErr } = await supabase
    .from('bookings')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', bookingId);

  if (updErr) throw new Error(updErr.message);

  // If cancelling — restore slot + issue refund if user had paid
  let refundAmount = 0;
  if (newStatus === 'Cancelled') {
    // Restore tee slot availability (look up by club + date + time)
    const slotDate = existing.tee_time.slice(0, 10);
    const slotTime = existing.tee_time.slice(11, 16);
    await supabase
      .from('tee_slots')
      .update({ available: true })
      .eq('club_id', existing.club_id)
      .eq('date', slotDate)
      .eq('time', slotTime);

    // Only issue refund if booking was already paid (not PendingPayment)
    if (existing.status !== 'PendingPayment') {
      const hoursOut = (new Date(existing.tee_time) - new Date()) / 36e5;
      const pct = hoursOut > 72 ? 1 : hoursOut > 24 ? 0.5 : 0;
      refundAmount = Math.round(existing.amount * pct);

      if (refundAmount > 0) {
        await supabase.from('payments').insert({
          club_id: existing.club_id,
          user_id: existing.user_id,
          booking_id: bookingId,
          amount: -refundAmount,
          payment_method_type: 'MemberAccount',
          transaction_status: 'Refunded',
          reference_number: `REF-${Date.now()}`,
          settlement_status: 'Settled',
          category: 'GreenFee',
        });
      }
    }
  }

  // If completed — auto-earn loyalty points
  if (newStatus === 'Completed') {
    earnPoints({
      userId: existing.user_id,
      clubId: existing.club_id,
      bookingId,
      amount: existing.amount,
      teeTime: existing.tee_time,
    }).catch((e) => logger.warn('Loyalty earn failed', { message: e.message }));
  }

  // If checking in — create Visit record
  if (newStatus === 'CheckedIn') {
    await supabase.from('visits').insert({
      club_id: existing.club_id,
      user_id: existing.user_id,
      booking_id: bookingId,
      check_in_time: new Date().toISOString(),
      status: 'CheckedIn',
    });
  }

  return { bookingId, newStatus, refundAmount };
}

/**
 * GET /api/bookings — user's own bookings, paginated.
 */
async function getUserBookings(userId, { status, limit = 20, offset = 0 } = {}) {
  let query = supabase
    .from('bookings')
    .select('id, club_id, tee_time, tee_end_time, players, status, amount, payment_status, game_type, channel_tag, ref_code, created_at, clubs(id, name, location)')
    .eq('user_id', userId)
    .order('tee_time', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    ...b,
    club_name: b.clubs?.name ?? null,
    clubs: undefined,
  }));
}

module.exports = { getTeeSlots, createBooking, updateBookingStatus, getUserBookings, priceForTime };

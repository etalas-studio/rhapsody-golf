const { Router } = require('express');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const config = require('../config');
const { snap, core } = require('../config/midtrans');
const { earnPoints } = require('../services/loyalty.service');
const { generateInvoice } = require('../services/invoice.service');
const { audit } = require('../services/audit.service');
const logger = require('../utils/logger');

const router = Router();

/**
 * Generate invoice PDF + persist a chat message so the user sees it
 * in their in-app chat on next open.
 * Non-blocking — errors are logged, not re-thrown.
 */
async function deliverInvoice(booking) {
  const [{ data: user }, { data: club }] = await Promise.all([
    supabase.from('users').select('name, email, rhapsody_id').eq('id', booking.user_id).single(),
    supabase.from('clubs').select('name').eq('id', booking.club_id).single(),
  ]);

  const invoice = await generateInvoice({ booking, user, club });

  // Persist the invoice message into the user's most recent active chat session
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id, state')
    .eq('user_id', booking.user_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const confirmText = [
    'Pembayaran kamu sudah kami terima. Booking terkonfirmasi! 🎉',
    '',
    `Kode Booking : ${booking.ref_code}`,
    `Lapangan     : ${club?.name || '-'}`,
    `Tanggal      : ${new Date(booking.tee_time).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}`,
    `Jam          : ${new Date(booking.tee_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB`,
    '',
    `📄 Invoice: ${invoice.pdf_url}`,
    '',
    'Tunjukkan kode booking saat check-in di lapangan. Sampai jumpa! ⛳',
  ].join('\n');

  if (session) {
    await supabase.from('chat_messages').insert({
      session_id: session.id,
      role: 'assistant',
      content: confirmText,
    });

    // Mark session DONE — next user message starts fresh conversation
    if (session.state === 'WAITING_PAYMENT') {
      await supabase
        .from('chat_sessions')
        .update({ state: 'DONE', status: 'closed' })
        .eq('id', session.id);
    }
  }

  logger.info('Invoice delivered', { bookingId: booking.id, refCode: booking.ref_code });
  return invoice;
}

/**
 * Verify Midtrans webhook signature.
 * signature_key = SHA512(order_id + status_code + gross_amount + server_key)
 */
function verifySignature(orderId, statusCode, grossAmount, incomingSignature) {
  const raw = `${orderId}${statusCode}${grossAmount}${config.midtrans.serverKey}`;
  const expected = crypto.createHash('sha512').update(raw).digest('hex');
  return expected === incomingSignature;
}

/**
 * POST /api/payments/midtrans-webhook
 * Receives Midtrans HTTP notification for all transaction statuses.
 * No auth middleware — Midtrans posts from their servers; verified by signature.
 */
router.post('/midtrans-webhook', async (req, res) => {
  const {
    order_id,
    transaction_status,
    fraud_status,
    status_code,
    gross_amount,
    signature_key,
    payment_type,
    custom_field1: bookingId,
    custom_field2: clubId,
  } = req.body;

  // Always respond 200 quickly — Midtrans retries on non-2xx
  res.sendStatus(200);

  // Verify signature
  if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
    logger.warn('Midtrans webhook invalid signature', { order_id });
    return;
  }

  // Resolve booking by ref_code (order_id) if custom_field1 missing
  let resolvedBookingId = bookingId;
  let resolvedClubId = clubId;

  if (!resolvedBookingId) {
    const { data: bk } = await supabase
      .from('bookings')
      .select('id, club_id, tee_slot_id, user_id')
      .eq('ref_code', order_id)
      .single();
    if (!bk) {
      logger.warn('Midtrans webhook: booking not found', { order_id });
      return;
    }
    resolvedBookingId = bk.id;
    resolvedClubId = bk.club_id;
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, user_id, club_id, amount, tee_time, status')
    .eq('id', resolvedBookingId)
    .single();

  if (!booking) {
    logger.warn('Midtrans webhook: booking row missing', { order_id, resolvedBookingId });
    return;
  }

  // Idempotency — skip if already in terminal state
  if (['Confirmed', 'Cancelled'].includes(booking.status)) {
    logger.info('Midtrans webhook: booking already settled', { order_id, status: booking.status });
    return;
  }

  const isSuccess =
    (transaction_status === 'capture' && fraud_status === 'accept') ||
    transaction_status === 'settlement';

  const isFailed =
    transaction_status === 'cancel' ||
    transaction_status === 'deny' ||
    transaction_status === 'expire';

  if (isSuccess) {
    // ── PAYMENT CONFIRMED ──────────────────────────────────────────────────
    await supabase
      .from('bookings')
      .update({ status: 'Confirmed', payment_status: 'Paid' })
      .eq('id', resolvedBookingId);

    await supabase
      .from('payments')
      .update({
        transaction_status: 'Paid',
        settlement_status: 'Settled',
        payment_method_type: payment_type ?? 'Midtrans',
      })
      .eq('reference_number', order_id);

    // Increment used_count now that payment is confirmed.
    // voucher_redemptions row was inserted at booking creation (holds the slot).
    if (booking.voucher_id) {
      await supabase.rpc('increment_voucher_used_count', { p_voucher_id: booking.voucher_id });
    }

    // Auto-earn loyalty points (non-blocking)
    earnPoints({
      userId: booking.user_id,
      clubId: booking.club_id,
      bookingId: resolvedBookingId,
      amount: booking.amount,
      teeTime: booking.tee_time,
    }).catch((e) => logger.warn('Loyalty earn failed after payment', { message: e.message }));

    // Generate + deliver invoice via in-app chat (non-blocking)
    deliverInvoice(booking).catch((e) =>
      logger.error('Failed to deliver invoice', { message: e.message, bookingId: resolvedBookingId })
    );

    logger.info('Booking confirmed via Midtrans', {
      bookingId: resolvedBookingId,
      orderId: order_id,
      amount: gross_amount,
    });

    audit(
      { userId: booking.user_id, userName: null, role: 'golfer', clubId: booking.club_id, ip: 'midtrans' },
      'payment_confirmed',
      { orderId: order_id, amount: booking.amount }
    );
  } else if (isFailed) {
    // ── PAYMENT FAILED / EXPIRED ───────────────────────────────────────────
    await supabase
      .from('bookings')
      .update({ status: 'Cancelled', payment_status: 'Failed' })
      .eq('id', resolvedBookingId);

    await supabase
      .from('payments')
      .update({ transaction_status: transaction_status, settlement_status: 'Failed' })
      .eq('reference_number', order_id);

    // Release the slot — someone else can book it
    const { data: slotData } = await supabase
      .from('bookings')
      .select('tee_slots(id)')
      .eq('id', resolvedBookingId)
      .single();

    // Try to find the slot via tee_time + club_id if join not available
    const { data: slot } = await supabase
      .from('tee_slots')
      .select('id')
      .eq('club_id', booking.club_id)
      .eq('available', false)
      .filter('date', 'eq', booking.tee_time?.slice(0, 10))
      .filter('time', 'eq', booking.tee_time?.slice(11, 16))
      .single();

    if (slot) {
      await supabase.from('tee_slots').update({ available: true }).eq('id', slot.id);
    }

    // Payment failed — release the voucher hold so the user can reuse it.
    // used_count was never incremented (that only happens on confirmed), so no decrement needed.
    await supabase.from('voucher_redemptions').delete().eq('booking_id', resolvedBookingId);

    logger.info('Booking cancelled — payment failed/expired', {
      bookingId: resolvedBookingId,
      orderId: order_id,
      transaction_status,
    });
  }
  // pending / other statuses — no action needed
});

/**
 * GET /api/payments/status/:orderId
 * Let the frontend poll for payment status after Snap popup closes.
 * Auth required via requireAuth from router — added in server.js at the route level.
 */
const { requireAuth } = require('../middleware/auth');

router.get('/status/:orderId', requireAuth, async (req, res) => {
  const { orderId } = req.params;

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, status, payment_status, amount, tee_time, ref_code, club_id, user_id')
    .eq('ref_code', orderId)
    .eq('user_id', req.userId)
    .single();

  if (error || !booking) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // If still pending, proactively check Midtrans so local dev (no webhook) still works
  if (booking.status === 'PendingPayment') {
    try {
      const mtStatus = await core.transaction.status(orderId);
      const settled =
        (mtStatus.transaction_status === 'capture' && mtStatus.fraud_status === 'accept') ||
        mtStatus.transaction_status === 'settlement';
      const failed =
        ['cancel', 'deny', 'expire'].includes(mtStatus.transaction_status);

      if (settled) {
        await supabase.from('bookings')
          .update({ status: 'Confirmed', payment_status: 'Paid', updated_at: new Date().toISOString() })
          .eq('id', booking.id);
        await supabase.from('payments')
          .update({ transaction_status: 'Paid', settlement_status: 'Settled' })
          .eq('reference_number', orderId);

        booking.status = 'Confirmed';
        booking.payment_status = 'Paid';
        logger.info('Status poll: settled booking', { orderId, bookingId: booking.id });
      } else if (failed) {
        await supabase.from('bookings')
          .update({ status: 'Cancelled', payment_status: 'Failed', updated_at: new Date().toISOString() })
          .eq('id', booking.id);
        booking.status = 'Cancelled';
        booking.payment_status = 'Failed';
      }
    } catch (mtErr) {
      // Midtrans not reachable or order not found yet — return current DB state
      logger.warn('Status poll: Midtrans query failed', { orderId, message: mtErr.message });
    }
  }

  res.json({
    orderId,
    bookingId: booking.id,
    status: booking.status,
    paymentStatus: booking.payment_status,
    amount: booking.amount,
    teeTime: booking.tee_time,
  });
});

module.exports = router;

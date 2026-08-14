const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const EXPIRY_HOURS = 24;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

async function expireStaleBookings() {
  const cutoff = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: stale, error } = await supabase
    .from('bookings')
    .select('id, club_id, tee_time, voucher_id')
    .eq('status', 'PendingPayment')
    .lte('created_at', cutoff);

  if (error) {
    logger.error('Booking expiry check failed', { message: error.message });
    return;
  }
  if (!stale?.length) return;

  for (const booking of stale) {
    try {
      // Cancel booking
      await supabase
        .from('bookings')
        .update({ status: 'Cancelled', payment_status: 'Failed', updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      // Release tee slot
      const slotDate = booking.tee_time?.slice(0, 10);
      const slotTime = booking.tee_time?.slice(11, 16);
      if (slotDate && slotTime) {
        await supabase
          .from('tee_slots')
          .update({ available: true })
          .eq('club_id', booking.club_id)
          .eq('date', slotDate)
          .eq('time', slotTime);
      }

      // Fail the payment record
      await supabase
        .from('payments')
        .update({ transaction_status: 'Failed', settlement_status: 'Failed' })
        .eq('booking_id', booking.id)
        .eq('transaction_status', 'Pending');

      // Release voucher hold (used_count was never incremented — just delete the hold)
      if (booking.voucher_id) {
        await supabase
          .from('voucher_redemptions')
          .delete()
          .eq('booking_id', booking.id);
      }

      logger.info('Booking expired — slot released', { bookingId: booking.id });
    } catch (err) {
      logger.error('Failed to expire booking', { bookingId: booking.id, message: err.message });
    }
  }
}

/**
 * Auto-complete bookings that are CheckedIn and whose tee_end_time
 * (fallback: tee_time + 30min) has already passed current time.
 * Triggers loyalty earn via the same path as manual completion.
 */
async function completeCheckedInBookings() {
  const now = new Date().toISOString();

  const { data: checkedIn, error } = await supabase
    .from('bookings')
    .select('id, user_id, club_id, amount, tee_time, tee_end_time')
    .eq('status', 'CheckedIn');

  if (error) {
    logger.error('CheckedIn completion check failed', { message: error.message });
    return;
  }
  if (!checkedIn?.length) return;

  const { earnPoints } = require('./loyalty.service');

  for (const booking of checkedIn) {
    try {
      // Use tee_end_time if available, otherwise tee_time + 30min as fallback
      const endTime = booking.tee_end_time
        ? new Date(booking.tee_end_time)
        : new Date(new Date(booking.tee_time).getTime() + 30 * 60 * 1000);

      if (endTime > new Date(now)) continue; // not finished yet

      await supabase
        .from('bookings')
        .update({ status: 'Completed', updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      // Earn loyalty points (non-blocking)
      earnPoints({
        userId: booking.user_id,
        clubId: booking.club_id,
        bookingId: booking.id,
        amount: booking.amount,
        teeTime: booking.tee_time,
      }).catch((e) => logger.warn('Loyalty earn failed on auto-complete', { message: e.message }));

      logger.info('Booking auto-completed from CheckedIn', { bookingId: booking.id });
    } catch (err) {
      logger.error('Failed to auto-complete booking', { bookingId: booking.id, message: err.message });
    }
  }
}

/**
 * Mark Confirmed (paid) bookings as NoShow if tee_time has already passed
 * and user never checked in.
 */
async function markNoShowBookings() {
  const now = new Date().toISOString();

  const { data: confirmed, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('status', 'Confirmed')
    .lt('tee_time', now);

  if (error) {
    logger.error('NoShow check failed', { message: error.message });
    return;
  }
  if (!confirmed?.length) return;

  for (const booking of confirmed) {
    try {
      await supabase
        .from('bookings')
        .update({ status: 'NoShow', updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      logger.info('Booking marked NoShow', { bookingId: booking.id });
    } catch (err) {
      logger.error('Failed to mark NoShow', { bookingId: booking.id, message: err.message });
    }
  }
}

function startBookingExpiryScheduler() {
  // Run once on startup to catch stale bookings from downtime
  expireStaleBookings().catch((e) =>
    logger.error('Initial expiry check failed', { message: e.message })
  );
  completeCheckedInBookings().catch((e) =>
    logger.error('Initial completion check failed', { message: e.message })
  );
  markNoShowBookings().catch((e) =>
    logger.error('Initial no-show check failed', { message: e.message })
  );

  setInterval(() => {
    expireStaleBookings().catch((e) =>
      logger.error('Scheduled expiry check failed', { message: e.message })
    );
    completeCheckedInBookings().catch((e) =>
      logger.error('Scheduled completion check failed', { message: e.message })
    );
    markNoShowBookings().catch((e) =>
      logger.error('Scheduled no-show check failed', { message: e.message })
    );
  }, CHECK_INTERVAL_MS);

  logger.info(`Booking schedulers started (expiry: ${EXPIRY_HOURS}h, completion + no-show: every 5min)`);
}

module.exports = { startBookingExpiryScheduler };

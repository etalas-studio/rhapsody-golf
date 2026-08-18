const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour

/**
 * Auto-close events whose registration_deadline has passed and are still Open.
 */
async function autoCloseEvents() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('events')
    .update({ status: 'Closed' })
    .eq('status', 'Open')
    .lt('registration_deadline', now)
    .select('id, title');

  if (error) {
    logger.error('Event auto-close failed', { message: error.message });
    return;
  }
  if (data?.length) {
    logger.info(`Auto-closed ${data.length} event(s) past deadline`, {
      ids: data.map((e) => e.id),
    });
  }
}

/**
 * Expire PendingPayment registrations older than 24 hours
 * (Midtrans Snap tokens expire after 24h by default).
 */
async function expireStaleEventRegistrations() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('event_registrations')
    .update({ status: 'Cancelled' })
    .eq('status', 'PendingPayment')
    .lt('registered_at', cutoff)
    .select('id');

  if (error) {
    logger.error('Event registration expiry failed', { message: error.message });
    return;
  }
  if (data?.length) {
    logger.info(`Expired ${data.length} stale event registration(s)`);
  }
}

function startEventScheduler() {
  // Run once on startup to catch anything missed during downtime
  autoCloseEvents().catch((e) =>
    logger.error('Initial event auto-close failed', { message: e.message })
  );
  expireStaleEventRegistrations().catch((e) =>
    logger.error('Initial event registration expiry failed', { message: e.message })
  );

  setInterval(() => {
    autoCloseEvents().catch((e) =>
      logger.error('Scheduled event auto-close failed', { message: e.message })
    );
    expireStaleEventRegistrations().catch((e) =>
      logger.error('Scheduled event registration expiry failed', { message: e.message })
    );
  }, CHECK_INTERVAL_MS);

  logger.info('Event scheduler started (auto-close + registration expiry: every 1h)');
}

module.exports = { startEventScheduler };

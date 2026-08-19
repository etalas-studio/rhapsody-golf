const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { audit } = require('../services/audit.service');
const {
  listEvents,
  getEvent,
  getMyRegistration,
  getUserEventRegistrations,
  getEventSnapToken,
  registerForEvent,
  cancelMyRegistration,
} = require('../services/event.service');
const logger = require('../utils/logger');

const router = Router();

// ─── Public ────────────────────────────────────────────────────────────────────

/**
 * GET /api/events?clubId=&limit=&offset=
 * Returns Open events only.
 */
router.get('/', async (req, res) => {
  const { clubId, limit, offset } = req.query;
  try {
    const events = await listEvents({
      clubId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ events });
  } catch (err) {
    logger.error('GET /events error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/events/my-registrations
 * All event registrations (history) for the authenticated user.
 */
router.get('/my-registrations', requireAuth, async (req, res) => {
  try {
    const registrations = await getUserEventRegistrations(req.userId);
    res.json({ registrations });
  } catch (err) {
    logger.error('GET /events/my-registrations error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/events/:id
 * Returns event detail with slots_used and slots_available.
 */
router.get('/:id', async (req, res) => {
  try {
    const event = await getEvent(req.params.id);
    res.json({ event });
  } catch (err) {
    const code = err.message === 'Event not found' ? 404 : 500;
    res.status(code).json({ error: err.message });
  }
});

// ─── Authenticated ────────────────────────────────────────────────────────────

/**
 * GET /api/events/:id/my-registration
 * Returns the authenticated user's registration + participants for this event.
 */
router.get('/:id/my-registration', requireAuth, async (req, res) => {
  try {
    const registration = await getMyRegistration({
      eventId: req.params.id,
      userId: req.userId,
    });
    res.json({ registration }); // null if not registered
  } catch (err) {
    logger.error('GET /events/:id/my-registration error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/events/:id/snap-token
 * Returns stored snap_token for a PendingPayment registration (resume payment).
 */
router.get('/:id/snap-token', requireAuth, async (req, res) => {
  try {
    const result = await getEventSnapToken({ eventId: req.params.id, userId: req.userId });
    res.json(result);
  } catch (err) {
    const code = err.message.includes('expired') || err.message.includes('unavailable') ? 410
      : err.message.includes('No pending') ? 404 : 500;
    res.status(code).json({ error: err.message });
  }
});

/**
 * POST /api/events/:id/register
 * Body: { players: [{ name, phone?, email? }] }
 *   players[0] = the registrant (themselves); additional entries = extra players.
 *
 * Free event  → returns { status: 'Confirmed', registrationId }
 * Paid event  → returns { snapToken, registrationId }
 */
router.post('/:id/register', requireAuth, async (req, res) => {
  const { players } = req.body;

  if (!Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'players array with at least one entry is required' });
  }
  if (players.some(p => !p.name?.trim())) {
    return res.status(400).json({ error: 'All players must have a name' });
  }

  try {
    const result = await registerForEvent({
      eventId: req.params.id,
      userId: req.userId,
      players,
    });
    audit(req, 'event_register', {
      detail: { eventId: req.params.id, playerCount: players.length },
    });
    res.status(201).json(result);
  } catch (err) {
    logger.error('POST /events/:id/register error', { message: err.message });
    const code =
      err.message === 'Event not found' ? 404
      : err.message.startsWith('Already') ? 409
      : err.message.startsWith('Not enough quota') || err.message.startsWith('Registration is')
        || err.message.includes('deadline') ? 400
      : 500;
    res.status(code).json({ error: err.message });
  }
});

/**
 * DELETE /api/events/:id/my-registration
 * Cancel the authenticated user's registration.
 * Only allowed before registration_deadline.
 */
router.delete('/:id/my-registration', requireAuth, async (req, res) => {
  try {
    const result = await cancelMyRegistration({
      eventId: req.params.id,
      userId: req.userId,
    });
    audit(req, 'event_cancel_registration', { detail: { eventId: req.params.id } });
    res.json(result);
  } catch (err) {
    logger.error('DELETE /events/:id/my-registration error', { message: err.message });
    const code =
      err.message === 'Event not found' ? 404
      : err.message === 'Registration not found or already cancelled' ? 404
      : err.message.startsWith('Cannot cancel') ? 400
      : 500;
    res.status(code).json({ error: err.message });
  }
});

module.exports = router;

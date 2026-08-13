const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { audit } = require('../services/audit.service');
const {
  listTournaments,
  getTournament,
  registerForTournament,
  cancelRegistration,
} = require('../services/tournament.service');
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const router = Router();

// ─── Public endpoints ─────────────────────────────────────────────────────────

/**
 * GET /api/tournaments?clubId=&status=&format=&limit=&offset=
 */
router.get('/', async (req, res) => {
  const { clubId, status, format, limit, offset } = req.query;
  try {
    const tournaments = await listTournaments({
      clubId,
      status,
      format,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ tournaments });
  } catch (err) {
    logger.error('GET /tournaments error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tournaments/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const tournament = await getTournament(req.params.id);
    res.json({ tournament });
  } catch (err) {
    const code = err.message === 'Tournament not found' ? 404 : 500;
    res.status(code).json({ error: err.message });
  }
});

/**
 * GET /api/tournaments/:id/leaderboard
 * Public — returns leaderboard entries ordered by score.
 */
router.get('/:id/leaderboard', async (req, res) => {
  const { flight } = req.query;

  let query = supabase
    .from('tournament_registrations')
    .select(`
      id, flight, tee_time, status, position, score, payment_status,
      users(id, name, rhapsody_id, handicap_index)
    `)
    .eq('tournament_id', req.params.id)
    .not('score', 'is', null)
    .order('score');

  if (flight) query = query.eq('flight', flight);

  const { data, error } = await query;
  if (error) {
    logger.error('GET /tournaments/:id/leaderboard error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json({ leaderboard: data ?? [] });
});

// ─── Auth-required endpoints ──────────────────────────────────────────────────

/**
 * GET /api/tournaments/my/registrations
 * The authenticated user's tournament registrations.
 */
router.get('/my/registrations', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select(`
      id, status, registered_at, flight, tee_time, position, score, payment_status,
      tournaments(id, title, date, format, club_id, clubs(short_name))
    `)
    .eq('user_id', req.userId)
    .order('registered_at', { ascending: false });

  if (error) {
    logger.error('GET /tournaments/my/registrations error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json({ registrations: data });
});

/**
 * POST /api/tournaments/:id/register
 */
router.post('/:id/register', requireAuth, async (req, res) => {
  try {
    const result = await registerForTournament({
      tournamentId: req.params.id,
      userId: req.userId,
    });
    audit(req, 'tournament_register', { detail: { tournamentId: req.params.id } });
    res.status(201).json(result);
  } catch (err) {
    logger.error('POST /tournaments/:id/register error', { message: err.message });
    const code = err.message === 'Tournament not found' ? 404
      : err.message.startsWith('Already') ? 409
      : 400;
    res.status(code).json({ error: err.message });
  }
});

/**
 * DELETE /api/tournaments/:id/register
 */
router.delete('/:id/register', requireAuth, async (req, res) => {
  try {
    const result = await cancelRegistration({
      tournamentId: req.params.id,
      userId: req.userId,
    });
    audit(req, 'tournament_cancel_registration', { detail: { tournamentId: req.params.id } });
    res.json(result);
  } catch (err) {
    logger.error('DELETE /tournaments/:id/register error', { message: err.message });
    const code = err.message === 'Registration not found' ? 404
      : err.message.startsWith('Cannot cancel') ? 400
      : 500;
    res.status(code).json({ error: err.message });
  }
});

/**
 * POST /api/tournaments/:id/score
 * Submit live hole-by-hole score for a tournament round.
 * Body: { scores: [{ hole, strokes, verified }] }
 */
router.post('/:id/score', requireAuth, async (req, res) => {
  const { scores } = req.body;
  if (!Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({ error: 'scores array is required' });
  }

  // Verify registration exists and is active
  const { data: reg, error: regErr } = await supabase
    .from('tournament_registrations')
    .select('id, status')
    .eq('tournament_id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (regErr || !reg) return res.status(404).json({ error: 'Registration not found' });
  if (!['Confirmed', 'CheckedIn', 'Registered'].includes(reg.status)) {
    return res.status(400).json({ error: 'Not an active registration' });
  }

  // Compute gross from submitted strokes
  const gross = scores.reduce((s, h) => s + (h.strokes || 0), 0);
  const holesComplete = scores.filter((h) => h.strokes > 0).length;
  const allVerified = scores.every((h) => h.strokes === 0 || h.verified);

  // Update registration score + status if all 18 holes submitted
  const patch = { score: gross };
  if (holesComplete === 18) {
    patch.status = allVerified ? 'Completed' : 'Completed'; // TD verifies offline
  }

  const { error: updErr } = await supabase
    .from('tournament_registrations')
    .update(patch)
    .eq('id', reg.id);

  if (updErr) {
    logger.error('POST /tournaments/:id/score error', { message: updErr.message });
    return res.status(500).json({ error: updErr.message });
  }

  logger.info('Tournament score submitted', {
    tournamentId: req.params.id,
    userId: req.userId,
    gross,
    holesComplete,
    allVerified,
  });

  res.json({ gross, holesComplete, allVerified, submitted: holesComplete === 18 });
});

module.exports = router;

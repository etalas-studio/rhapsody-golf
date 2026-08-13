const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { saveScorecard, getScorecards } = require('../services/scorecard.service');
const logger = require('../utils/logger');

const router = Router();

/**
 * GET /api/scorecards?clubId=&limit=&offset=
 * Auth-scoped to current user.
 */
router.get('/', requireAuth, async (req, res) => {
  const { clubId, limit, offset } = req.query;
  try {
    const scorecards = await getScorecards(req.userId, {
      clubId,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ scorecards });
  } catch (err) {
    logger.error('GET /scorecards error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scorecards
 * Save a completed scorecard and trigger async handicap recalculation.
 * Body: { clubId, date, courseName, strokes: number[18], pars: number[18] }
 */
router.post('/', requireAuth, async (req, res) => {
  const { clubId, date, courseName, strokes, pars } = req.body;

  if (!clubId || !date || !courseName) {
    return res.status(400).json({ error: 'clubId, date, and courseName are required' });
  }
  if (!Array.isArray(strokes) || strokes.length !== 18) {
    return res.status(400).json({ error: 'strokes must be an array of 18 numbers' });
  }
  if (!Array.isArray(pars) || pars.length !== 18) {
    return res.status(400).json({ error: 'pars must be an array of 18 numbers' });
  }

  try {
    const scorecard = await saveScorecard({
      userId: req.userId,
      clubId,
      date,
      courseName,
      strokes: strokes.map(Number),
      pars: pars.map(Number),
    });
    res.status(201).json({ scorecard });
  } catch (err) {
    logger.error('POST /scorecards error', { message: err.message });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

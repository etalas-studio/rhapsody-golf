const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { earnPoints, getBalances, getLedger } = require('../services/loyalty.service');
const logger = require('../utils/logger');

const router = Router();

router.use(requireAuth);

/**
 * GET /api/loyalty
 * Returns points balance grouped by club.
 */
router.get('/', async (req, res) => {
  try {
    const result = await getBalances(req.userId);
    res.json(result);
  } catch (err) {
    logger.error('GET /loyalty error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/loyalty/history?clubId=&limit=&offset=
 */
router.get('/history', async (req, res) => {
  const { clubId, limit, offset } = req.query;
  try {
    const entries = await getLedger(req.userId, {
      clubId,
      limit: limit ? Number(limit) : 30,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ entries });
  } catch (err) {
    logger.error('GET /loyalty/history error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/loyalty/earn
 * Triggered server-side after booking status → Completed.
 * Also callable manually (club_admin / internal).
 * Body: { bookingId, clubId, amount, teeTime }
 */
router.post('/earn', async (req, res) => {
  const { bookingId, clubId, amount, teeTime } = req.body;
  if (!bookingId || !clubId || !amount) {
    return res.status(400).json({ error: 'bookingId, clubId and amount are required' });
  }
  try {
    const result = await earnPoints({
      userId: req.userId,
      clubId,
      bookingId,
      amount: Number(amount),
      teeTime,
    });
    res.json(result);
  } catch (err) {
    logger.error('POST /loyalty/earn error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

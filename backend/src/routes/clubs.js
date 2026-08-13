const { Router } = require('express');
const supabase = require('../config/supabase');
const { getTeeSlots } = require('../services/booking.service');
const logger = require('../utils/logger');

const router = Router();

/**
 * GET /api/clubs
 * Public — list all active clubs.
 */
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, short_name, location, region, logo_url, banner_url, theme_color, app_type, starting_price, rating, facilities, price_includes, description, active, operating_hours, number_of_holes, par, length_yards, course_rating, slope_rating')
    .eq('active', true)
    .order('name');

  if (error) {
    logger.error('GET /clubs error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json({ clubs: data });
});

/**
 * GET /api/clubs/:id
 * Public — single club detail.
 */
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Club not found' });
  res.json({ club: data });
});

/**
 * GET /api/clubs/:id/tee-slots?date=YYYY-MM-DD
 * Public — available tee slots for a club on a date.
 */
router.get('/:id/tee-slots', async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
  }

  try {
    const slots = await getTeeSlots(req.params.id, date);
    res.json({ slots });
  } catch (err) {
    logger.error('GET /tee-slots error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

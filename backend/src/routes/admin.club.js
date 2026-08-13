const { Router } = require('express');
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { scopeClub } = require('../middleware/clubScope');
const { audit } = require('../services/audit.service');
const { updateBookingStatus } = require('../services/booking.service');
const logger = require('../utils/logger');

const router = Router();

function requireClubAdmin(req, res, next) {
  if (req.role !== 'club_admin' && req.role !== 'superadmin') {
    return res.status(403).json({ error: 'Club admin access required' });
  }
  next();
}

router.use(requireAuth, requireClubAdmin);

// ─── Tee sheet ────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/teesheet?clubId=&date=YYYY-MM-DD
 *     OR ?clubId=&from=YYYY-MM-DD&to=YYYY-MM-DD  (range)
 * Returns bookings for a club with player details.
 */
router.get('/teesheet', scopeClub, async (req, res) => {
  const { date, from, to } = req.query;
  const valid = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  let start, end;
  if (from && to) {
    if (!valid(from) || !valid(to)) {
      return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
    }
    if (from > to) {
      return res.status(400).json({ error: 'from must not be after to' });
    }
    start = `${from}T00:00:00+07:00`;
    end = `${to}T23:59:59+07:00`;
  } else if (date) {
    if (!valid(date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    start = `${date}T00:00:00+07:00`;
    end = `${date}T23:59:59+07:00`;
  } else {
    return res.status(400).json({ error: 'date OR from&to query params required (YYYY-MM-DD)' });
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, ref_code, tee_time, tee_end_time, players, status, amount, payment_status, channel_tag, game_type,
      users(id, name, rhapsody_id, email, handicap_index)
    `)
    .eq('club_id', req.clubId)
    .gte('tee_time', start)
    .lte('tee_time', end)
    .order('tee_time');

  if (error) {
    logger.error('GET /admin/teesheet error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }

  const bookings = (data ?? []).map((b) => ({
    ...b,
    cart: false,
    caddie: false,
    user: b.users ?? { name: '—', rhapsody_id: '—' },
  }));

  res.json({ date, clubId: req.clubId, bookings });
});

/**
 * PATCH /api/admin/bookings/:id/checkin
 * Body: { clubId }
 */
router.patch('/bookings/:id/checkin', async (req, res) => {
  const { clubId } = req.body;
  if (!clubId) return res.status(400).json({ error: 'clubId is required' });
  req.clubId = clubId;

  try {
    const result = await updateBookingStatus(req.params.id, req.userId, 'CheckedIn', req.role);
    audit(req, 'checkin_booking', { detail: { bookingId: req.params.id } });
    res.json(result);
  } catch (err) {
    logger.error('PATCH /admin/bookings/:id/checkin error', { message: err.message });
    const code = err.message === 'Booking not found' ? 404 : 500;
    res.status(code).json({ error: err.message });
  }
});

// ─── Members ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/members?clubId=&search=&status=&limit=&offset=
 */
router.get('/members', scopeClub, async (req, res) => {
  const { search, status, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('club_members')
    .select(`
      id, club_member_id, membership_status, membership_type, start_date, expiry_date,
      users(id, name, email, rhapsody_id, handicap_index, phone)
    `)
    .eq('club_id', req.clubId)
    .range(Number(offset), Number(offset) + Number(limit) - 1)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('membership_status', status);

  const { data, error } = await query;
  if (error) {
    logger.error('GET /admin/members error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }

  // Client-side search filter (simple name/email/rhapsody_id match)
  const members = search
    ? data.filter((m) => {
        const q = search.toLowerCase();
        const u = m.users;
        return (
          u?.name?.toLowerCase().includes(q) ||
          u?.email?.toLowerCase().includes(q) ||
          u?.rhapsody_id?.toLowerCase().includes(q) ||
          m.club_member_id?.toLowerCase().includes(q)
        );
      })
    : data;

  res.json({ members });
});

/**
 * GET /api/admin/members/:memberId?clubId=
 * 360-view: member + bookings + loyalty + vouchers.
 */
router.get('/members/:memberId', scopeClub, async (req, res) => {
  const { memberId } = req.params;

  const [memberRes, bookingsRes, loyaltyRes, vouchersRes] = await Promise.all([
    supabase
      .from('club_members')
      .select('*, users(id, name, email, rhapsody_id, handicap_index, phone, created_at)')
      .eq('id', memberId)
      .eq('club_id', req.clubId)
      .single(),

    supabase
      .from('bookings')
      .select('id, tee_time, players, status, amount, payment_status, game_type')
      .eq('user_id', (await supabase.from('club_members').select('user_id').eq('id', memberId).single()).data?.user_id)
      .eq('club_id', req.clubId)
      .order('tee_time', { ascending: false })
      .limit(20),

    supabase
      .from('loyalty_ledger')
      .select('points, transaction_type, description, created_at')
      .eq('user_id', (await supabase.from('club_members').select('user_id').eq('id', memberId).single()).data?.user_id)
      .eq('club_id', req.clubId)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('vouchers')
      .select('voucher_code, title, value, status, expiry_date, type')
      .eq('user_id', (await supabase.from('club_members').select('user_id').eq('id', memberId).single()).data?.user_id)
      .eq('club_id', req.clubId)
      .order('created_at', { ascending: false }),
  ]);

  if (memberRes.error || !memberRes.data) {
    return res.status(404).json({ error: 'Member not found in this club' });
  }

  const loyaltyTotal = (loyaltyRes.data ?? []).reduce((s, e) => s + e.points, 0);

  res.json({
    member: memberRes.data,
    bookings: bookingsRes.data ?? [],
    loyalty: { total: loyaltyTotal, entries: loyaltyRes.data ?? [] },
    vouchers: vouchersRes.data ?? [],
  });
});

// ─── Campaigns ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/campaigns?clubId=
 */
router.get('/campaigns', scopeClub, async (req, res) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('club_id', req.clubId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('GET /admin/campaigns error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json({ campaigns: data });
});

/**
 * POST /api/admin/campaigns
 * Body: { clubId, title, targetSegment, campaignType, startsAt, endsAt }
 */
router.post('/campaigns', async (req, res) => {
  const { clubId, title, targetSegment, campaignType, startsAt, endsAt } = req.body;
  if (!clubId || !title || !campaignType || !startsAt || !endsAt) {
    return res.status(400).json({ error: 'clubId, title, campaignType, startsAt, endsAt are required' });
  }
  req.clubId = clubId;

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      club_id: clubId,
      title,
      target_segment: targetSegment ?? 'All',
      campaign_type: campaignType,
      status: 'Draft',
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select()
    .single();

  if (error) {
    logger.error('POST /admin/campaigns error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }

  audit(req, 'create_campaign', { detail: { campaignId: data.id, title } });
  res.status(201).json({ campaign: data });
});

/**
 * PATCH /api/admin/campaigns/:id
 * Body: { clubId, status?, title?, ... }
 */
router.patch('/campaigns/:id', async (req, res) => {
  const { clubId, ...fields } = req.body;
  if (!clubId) return res.status(400).json({ error: 'clubId is required' });
  req.clubId = clubId;

  const allowed = ['title', 'status', 'target_segment', 'starts_at', 'ends_at'];
  const patch = {};
  for (const k of allowed) {
    if (fields[k] !== undefined) patch[k] = fields[k];
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(patch)
    .eq('id', req.params.id)
    .eq('club_id', clubId)
    .select()
    .single();

  if (error || !data) {
    return res.status(error ? 500 : 404).json({ error: error?.message ?? 'Campaign not found' });
  }

  audit(req, 'update_campaign', { detail: { campaignId: req.params.id, patch } });
  res.json({ campaign: data });
});

// ─── Analytics ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/analytics?clubId=
 * Returns: revenue_30d, bookings_30d, members_total, avg_handicap, visit_trend (last 7 days)
 */
router.get('/analytics', scopeClub, async (req, res) => {
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();

  const [allBookings, members, visits7, tournamentsRes, vouchersRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('amount, status, tee_time')
      .eq('club_id', req.clubId),

    supabase
      .from('club_members')
      .select('membership_status, users(handicap_index)')
      .eq('club_id', req.clubId),

    supabase
      .from('bookings')
      .select('tee_time, status')
      .eq('club_id', req.clubId)
      .gte('tee_time', since7)
      .in('status', ['CheckedIn', 'Completed']),

    supabase
      .from('tournaments')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', req.clubId),

    supabase
      .from('vouchers')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', req.clubId),
  ]);

  const completed = (allBookings.data ?? []).filter((b) => b.status === 'Completed' || b.status === 'CheckedIn');
  const revenueTotal = completed.reduce((s, b) => s + b.amount, 0);
  const bookingsTotal = (allBookings.data ?? []).length;

  const membersTotal = (members.data ?? []).length;
  const paidMembers = (members.data ?? []).filter((m) => m.membership_status === 'PaidMember').length;
  const handicaps = (members.data ?? []).map((m) => m.users?.handicap_index).filter(Boolean);
  const avgHandicap = handicaps.length ? (handicaps.reduce((s, h) => s + h, 0) / handicaps.length).toFixed(1) : null;

  // Daily visit counts for last 7 days
  const visitMap = {};
  for (const v of visits7.data ?? []) {
    const day = v.tee_time.slice(0, 10);
    visitMap[day] = (visitMap[day] ?? 0) + 1;
  }
  const visitTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10);
    return { date: d, visits: visitMap[d] ?? 0 };
  });

  res.json({
    revenue_30d: revenueTotal,
    bookings_30d: bookingsTotal,
    revenue_total: revenueTotal,
    bookings_total: bookingsTotal,
    tournaments_total: tournamentsRes.count ?? 0,
    vouchers_total: vouchersRes.count ?? 0,
    members_total: membersTotal,
    paid_members: paidMembers,
    avg_handicap: avgHandicap ? Number(avgHandicap) : null,
    visit_trend: visitTrend,
  });
});

// ─── Audit log ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/audit?clubId=&limit=&offset=
 */
router.get('/audit', scopeClub, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, actor_name, role, action, ip, timestamp')
    .eq('club_id', req.clubId)
    .order('timestamp', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (error) {
    logger.error('GET /admin/audit error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json({ entries: data });
});

// ─── Tee slot generation ──────────────────────────────────────────────────────

/**
 * GET /api/admin/generate-tee-slots/preview
 * Returns the start date for the next generate based on last existing slot.
 */
router.get('/generate-tee-slots/preview', async (req, res) => {
  const { data: ca } = await supabase
    .from('club_admins').select('club_id').eq('user_id', req.userId).single();
  const clubId = ca?.club_id;
  if (!clubId) return res.status(403).json({ error: 'No club assigned to this admin' });

  const { data: last } = await supabase
    .from('tee_slots')
    .select('date')
    .eq('club_id', clubId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  let startDate;
  if (last?.date) {
    // day after last slot, but never before today
    const lastDt = new Date(last.date);
    lastDt.setDate(lastDt.getDate() + 1);
    startDate = lastDt.toISOString().slice(0, 10) > today
      ? lastDt.toISOString().slice(0, 10)
      : today;
  } else {
    startDate = today;
  }

  res.json({ start_date: startDate, last_slot_date: last?.date ?? null });
});

/**
 * POST /api/admin/generate-tee-slots
 * Generate tee slots starting from the day after the last existing slot (or today).
 * Body: { days: number } — number of days to generate (default 30)
 */
router.post('/generate-tee-slots', async (req, res) => {
  const { randomUUID } = require('crypto');
  const days = Math.min(Math.max(parseInt(req.body?.days ?? 30), 1), 180);

  const { data: ca } = await supabase
    .from('club_admins').select('club_id').eq('user_id', req.userId).single();
  const clubId = ca?.club_id;
  if (!clubId) return res.status(403).json({ error: 'No club assigned to this admin' });

  // Find last existing slot to compute start date
  const { data: last } = await supabase
    .from('tee_slots')
    .select('date')
    .eq('club_id', clubId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const today = new Date().toISOString().slice(0, 10);
  let startDate;
  if (last?.date) {
    const lastDt = new Date(last.date);
    lastDt.setDate(lastDt.getDate() + 1);
    startDate = lastDt.toISOString().slice(0, 10) > today
      ? lastDt.toISOString().slice(0, 10)
      : today;
  } else {
    startDate = today;
  }

  // Read tee config from clubs (interval, band ranges, default prices)
  const { data: cfg } = await supabase
    .from('clubs')
    .select('tee_interval_minutes, early_start, early_end, early_default_price, prime_start, prime_end, prime_default_price, twilight_start, twilight_end, twilight_default_price')
    .eq('id', clubId)
    .single();

  const intervalMins = cfg?.tee_interval_minutes ?? 30;
  const bands = {
    early:    { start: cfg?.early_start    ?? '06:00', end: cfg?.early_end    ?? '10:30', price: cfg?.early_default_price    ?? 1_250_000 },
    prime:    { start: cfg?.prime_start    ?? '11:00', end: cfg?.prime_end    ?? '13:30', price: cfg?.prime_default_price    ?? 1_450_000 },
    twilight: { start: cfg?.twilight_start ?? '14:00', end: cfg?.twilight_end ?? '16:30', price: cfg?.twilight_default_price ?? 1_100_000 },
  };

  function toMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

  function priceFor(timeStr) {
    const mins = toMins(timeStr);
    for (const b of Object.values(bands)) {
      if (mins >= toMins(b.start) && mins <= toMins(b.end)) return b.price;
    }
    return bands.twilight.price;
  }

  // Generate time slots from earliest band start to latest band end using interval
  const firstMin = Math.min(...Object.values(bands).map((b) => toMins(b.start)));
  const lastMin  = Math.max(...Object.values(bands).map((b) => toMins(b.end)));
  const allTimes = [];
  for (let m = firstMin; m <= lastMin; m += intervalMins) {
    allTimes.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`);
  }

  const start = new Date(startDate);
  const rows = [];
  for (let d = 0; d < days; d++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + d);
    const date = dt.toISOString().slice(0, 10);
    for (const time of allTimes) {
      rows.push({ id: randomUUID(), club_id: clubId, date, time, price: priceFor(time), available: true });
    }
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase
      .from('tee_slots')
      .upsert(rows.slice(i, i + 500), { onConflict: 'club_id,date,time', ignoreDuplicates: true });
    if (error) return res.status(500).json({ error: error.message, inserted });
    inserted += rows.slice(i, i + 500).length;
  }

  logger.info('Tee slots generated by club admin', { clubId, startDate, days, rows: rows.length });
  res.json({ success: true, slots_attempted: rows.length, start_date: startDate });
});

/**
 * PATCH /api/admin/tee-slots/bulk-price
 * Update all future slots of a band with a new price.
 * Body: { band: "early"|"prime"|"twilight", price: number }
 */
router.patch('/tee-slots/bulk-price', scopeClub, async (req, res) => {
  const { band, price } = req.body;
  if (!band || !price) return res.status(400).json({ error: 'band and price required' });
  if (!['early', 'prime', 'twilight'].includes(band)) {
    return res.status(400).json({ error: 'band must be early, prime, or twilight' });
  }

  const BAND_RANGES = {
    early:    { start: '06:00', end: '10:30' },
    prime:    { start: '11:00', end: '13:30' },
    twilight: { start: '14:00', end: '16:30' },
  };
  const range = BAND_RANGES[band];
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('tee_slots')
    .update({ price: Number(price) })
    .eq('club_id', req.clubId)
    .gte('date', today)
    .gte('time', range.start)
    .lte('time', range.end)
    .select('id');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ updated: data?.length ?? 0, band, price: Number(price) });
});

/**
 * GET /api/admin/tee-slots?date=YYYY-MM-DD
 * List all tee slots for the club on a given date.
 */
router.get('/tee-slots', scopeClub, async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
  }

  const { data, error } = await supabase
    .from('tee_slots')
    .select('id, date, time, price, available')
    .eq('club_id', req.clubId)
    .eq('date', date)
    .order('time');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ slots: data ?? [] });
});

/**
 * PATCH /api/admin/tee-slots/:id
 * Update price and/or available on a single slot.
 * Body: { price?: number, available?: boolean }
 */
router.patch('/tee-slots/:id', scopeClub, async (req, res) => {
  const { price, available } = req.body;
  if (price === undefined && available === undefined) {
    return res.status(400).json({ error: 'price or available required' });
  }

  const updates = {};
  if (price !== undefined) updates.price = Number(price);
  if (available !== undefined) updates.available = Boolean(available);

  const { data, error } = await supabase
    .from('tee_slots')
    .update(updates)
    .eq('id', req.params.id)
    .eq('club_id', req.clubId) // club scoping guard
    .select('id, date, time, price, available')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ slot: data });
});

/**
 * GET /api/admin/tee-config
 * Fetch tee time config for the admin's club.
 */
router.get('/tee-config', scopeClub, async (req, res) => {
  const { data, error } = await supabase
    .from('clubs')
    .select('tee_interval_minutes, early_start, early_end, early_default_price, prime_start, prime_end, prime_default_price, twilight_start, twilight_end, twilight_default_price')
    .eq('id', req.clubId)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ config: data });
});

/**
 * PATCH /api/admin/tee-config
 * Save tee time config (interval, band ranges, default prices) to club.
 * Used by the Konfigurasi card — applies to next generate, not existing slots.
 */
router.patch('/tee-config', scopeClub, async (req, res) => {
  const {
    tee_interval_minutes,
    early_start, early_end, early_default_price,
    prime_start, prime_end, prime_default_price,
    twilight_start, twilight_end, twilight_default_price,
  } = req.body;

  const updates = {};
  if (tee_interval_minutes !== undefined) updates.tee_interval_minutes = Number(tee_interval_minutes);
  if (early_start !== undefined) updates.early_start = early_start;
  if (early_end !== undefined) updates.early_end = early_end;
  if (early_default_price !== undefined) updates.early_default_price = Number(early_default_price);
  if (prime_start !== undefined) updates.prime_start = prime_start;
  if (prime_end !== undefined) updates.prime_end = prime_end;
  if (prime_default_price !== undefined) updates.prime_default_price = Number(prime_default_price);
  if (twilight_start !== undefined) updates.twilight_start = twilight_start;
  if (twilight_end !== undefined) updates.twilight_end = twilight_end;
  if (twilight_default_price !== undefined) updates.twilight_default_price = Number(twilight_default_price);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  const { data, error } = await supabase
    .from('clubs')
    .update(updates)
    .eq('id', req.clubId)
    .select('tee_interval_minutes, early_start, early_end, early_default_price, prime_start, prime_end, prime_default_price, twilight_start, twilight_end, twilight_default_price')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ config: data });
});

// ─── Course Setup ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/club?clubId=
 * Returns full club profile for the club admin's own club.
 */
router.get('/club', scopeClub, async (req, res) => {
  const { data, error } = await supabase
    .from('clubs')
    .select(`
      id, name, short_name, location, region, address, phone, email,
      operating_hours, maps_url, logo_url, banner_url, image_urls, description,
      facilities, price_includes, terms_and_conditions, established_in, number_of_holes, par, length_yards,
      course_rating, slope_rating, starting_price, rating, active
    `)
    .eq('id', req.clubId)
    .single();

  if (error) {
    logger.error('GET /admin/club error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json({ club: data });
});

/**
 * PATCH /api/admin/club
 * Body: { clubId, ...editableFields }
 * Only the fields listed below are writable by club_admin.
 */
router.patch('/club', scopeClub, async (req, res) => {
  const ALLOWED = [
    'name', 'short_name', 'location', 'region', 'address', 'phone', 'email',
    'operating_hours', 'maps_url', 'logo_url', 'banner_url', 'image_urls', 'description',
    'facilities', 'price_includes', 'terms_and_conditions', 'established_in', 'number_of_holes', 'par', 'length_yards',
    'course_rating', 'slope_rating',
    'starting_price',
  ];

  const updates = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  const { data, error } = await supabase
    .from('clubs')
    .update(updates)
    .eq('id', req.clubId)
    .select('id, name, short_name, location, description, facilities, price_includes, terms_and_conditions, maps_url, image_urls')
    .single();

  if (error) {
    logger.error('PATCH /admin/club error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }

  audit(req, 'update_club_profile', { detail: { fields: Object.keys(updates) } });
  res.json({ club: data });
});

module.exports = router;

const { Router } = require('express');
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = Router();

function requireSuperadmin(req, res, next) {
  if (req.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
}

router.use(requireAuth, requireSuperadmin);

// ─── Network-wide analytics ───────────────────────────────────────────────────

/**
 * GET /api/superadmin/analytics
 * Aggregated across all clubs: revenue, bookings, members, top clubs.
 */
router.get('/analytics', async (req, res) => {
  const now = new Date();
  const start30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const [
      { data: revenue30d, error: revErr },
      { data: bookings30d, error: bkErr },
      { count: golfersTotal, error: golErr },
      { data: perClub, error: pcErr },
    ] = await Promise.all([
      // revenue last 30d (completed bookings)
      supabase
        .from('bookings')
        .select('amount')
        .eq('status', 'Completed')
        .gte('created_at', start30d),
      // bookings last 30d (all statuses)
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start30d),
      // total golfers across network — club membership isn't used in this MVP,
      // so network-wide "members" means golfer accounts, not club_members rows.
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'golfer'),
      // per-club revenue + booking count last 30d
      supabase
        .from('bookings')
        .select('club_id, amount, status, created_at')
        .gte('created_at', start30d),
    ]);

    // surface first error
    const firstErr = revErr || bkErr || golErr || pcErr;
    if (firstErr) {
      logger.error('Superadmin analytics error', { message: firstErr.message });
      return res.status(500).json({ error: firstErr.message });
    }

    const totalRevenue30d = (revenue30d || []).reduce((s, b) => s + (b.amount || 0), 0);

    // Aggregate per club
    const clubMap = {};
    for (const b of perClub || []) {
      if (!clubMap[b.club_id]) clubMap[b.club_id] = { club_id: b.club_id, revenue: 0, bookings: 0 };
      clubMap[b.club_id].bookings += 1;
      if (b.status === 'Completed') clubMap[b.club_id].revenue += b.amount || 0;
    }
    const topClubs = Object.values(clubMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 7-day visit trend — not yet tracked, return empty
    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    const visitTrendArray = Object.entries(dayMap).map(([date, visits]) => ({ date, visits }));

    res.json({
      revenue_30d: totalRevenue30d,
      bookings_30d: bookings30d || 0,
      members_total: golfersTotal || 0,
      top_clubs: topClubs,
      visit_trend_7d: visitTrendArray,
    });
  } catch (err) {
    logger.error('Superadmin analytics unexpected error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ─── Cross-club member view ───────────────────────────────────────────────────

/**
 * GET /api/superadmin/members?search=&clubId=&status=&limit=&offset=
 * Network-wide member search. Can filter by club.
 */
router.get('/members', async (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('users')
    .select('id, name, email, phone, rhapsody_id, created_at', { count: 'exact' })
    .eq('role', 'golfer')
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  const { data, count, error } = await query;
  if (error) {
    logger.error('Superadmin golfers error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }

  let result = data || [];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.rhapsody_id?.toLowerCase().includes(q)
    );
  }

  // Normalise field name for frontend
  result = result.map((u) => ({ ...u, joined_at: u.created_at }));

  res.json({ members: result, total: count || 0 });
});

/**
 * GET /api/superadmin/members/:userId
 * Full 360-view of a user across all clubs.
 */
router.get('/members/:userId', async (req, res) => {
  const { userId } = req.params;

  const [
    { data: user, error: uErr },
    { data: memberships, error: mErr },
    { data: bookings, error: bErr },
    { data: loyalty, error: lErr },
    { data: vouchers, error: vErr },
    { data: registrations, error: rErr },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase
      .from('club_members')
      .select('id, membership_status, club_member_id, joined_at, clubs(id, name, short_name)')
      .eq('user_id', userId),
    supabase
      .from('bookings')
      .select('id, tee_time, status, amount, club_id, clubs(short_name)')
      .eq('user_id', userId)
      .order('tee_time', { ascending: false })
      .limit(20),
    supabase
      .from('loyalty_ledger')
      .select('club_id, points, clubs(short_name)')
      .eq('user_id', userId),
    supabase
      .from('vouchers')
      .select('code, discount_value, status, expires_at, club_id')
      .eq('user_id', userId)
      .eq('status', 'Active'),
    supabase
      .from('tournament_registrations')
      .select('id, status, score, tournaments(title, date, format)')
      .eq('user_id', userId)
      .order('registered_at', { ascending: false })
      .limit(10),
  ]);

  const firstErr = uErr || mErr || bErr || lErr || vErr || rErr;
  if (uErr) return res.status(404).json({ error: 'User not found' });
  if (firstErr) {
    logger.error('Superadmin member 360 error', { message: firstErr.message });
    return res.status(500).json({ error: firstErr.message });
  }

  // Aggregate loyalty balance per club
  const loyaltyMap = {};
  for (const row of loyalty || []) {
    loyaltyMap[row.club_id] = loyaltyMap[row.club_id] || {
      club_id: row.club_id,
      club_name: row.clubs?.short_name,
      balance: 0,
    };
    loyaltyMap[row.club_id].balance += row.points || 0;
  }

  res.json({
    user,
    memberships: memberships || [],
    recent_bookings: bookings || [],
    loyalty_balances: Object.values(loyaltyMap),
    active_vouchers: vouchers || [],
    tournament_history: registrations || [],
  });
});

// ─── Audit log ────────────────────────────────────────────────────────────────

/**
 * GET /api/superadmin/audit?clubId=&userId=&action=&limit=&offset=
 * Network-wide audit log (superadmin can query across all clubs).
 */
router.get('/audit', async (req, res) => {
  const { clubId, userId, action, limit = 50, offset = 0 } = req.query;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (clubId) query = query.eq('club_id', clubId);
  if (userId) query = query.eq('user_id', userId);
  if (action) query = query.eq('action', action);

  const { data, count, error } = await query;
  if (error) {
    logger.error('Superadmin audit log error', { message: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json({ logs: data || [], total: count || 0 });
});

// ─── Integration health ───────────────────────────────────────────────────────

/**
 * GET /api/superadmin/health
 * Checks connectivity of key subsystems: Supabase DB, Anthropic AI (ping).
 */
router.get('/health', async (req, res) => {
  const checks = {};

  // Supabase DB — lightweight probe
  const dbStart = Date.now();
  const { error: dbErr } = await supabase
    .from('clubs')
    .select('id', { head: true, count: 'exact' });
  checks.supabase_db = {
    ok: !dbErr,
    latency_ms: Date.now() - dbStart,
    error: dbErr?.message ?? null,
  };

  // Supabase Auth — check service role key is functional
  const authStart = Date.now();
  const { error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  checks.supabase_auth = {
    ok: !authErr,
    latency_ms: Date.now() - authStart,
    error: authErr?.message ?? null,
  };

  // Anthropic API — only check if key is configured, don't burn tokens
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  checks.anthropic_ai = {
    ok: !!anthropicKey && anthropicKey.startsWith('sk-ant-'),
    configured: !!anthropicKey,
    error: anthropicKey ? null : 'ANTHROPIC_API_KEY not set',
  };

  const allOk = Object.values(checks).every((c) => c.ok);
  const checksArray = Object.entries(checks).map(([key, val]) => ({
    name: key.replace(/_/g, ' '),
    status: val.ok ? 'ok' : 'fail',
    latency_ms: val.latency_ms ?? null,
    error: val.error ?? null,
  }));
  res.status(allOk ? 200 : 207).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: checksArray,
  });
});

// ─── Cross-club clubs list ────────────────────────────────────────────────────

/**
 * GET /api/superadmin/clubs
 * All clubs with summary stats.
 */
router.get('/clubs', async (req, res) => {
  const [
    { data: clubs, error: cErr },
    { data: memberCounts, error: mcErr },
  ] = await Promise.all([
    supabase.from('clubs').select('*').order('name'),
    supabase
      .from('club_members')
      .select('club_id')
      .eq('membership_status', 'PaidMember'),
  ]);

  if (cErr) {
    logger.error('Superadmin clubs error', { message: cErr.message });
    return res.status(500).json({ error: cErr.message });
  }

  // Count paid members per club
  const paidByClub = {};
  for (const m of memberCounts || []) {
    paidByClub[m.club_id] = (paidByClub[m.club_id] || 0) + 1;
  }

  const result = (clubs || []).map((c) => ({
    ...c,
    paid_members: paidByClub[c.id] || 0,
  }));

  res.json({ clubs: result });
});

// ─── Create club ─────────────────────────────────────────────────────────────

/**
 * POST /api/superadmin/clubs
 * Create a new golf course/club.
 */
router.post('/clubs', async (req, res) => {
  const { randomUUID } = require('crypto');
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Club name is required.' });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('clubs')
    .insert({
      id: randomUUID(),
      name: name.trim(),
      short_name: name.trim(),
      location: null,
      region: null,
      theme_color: '#0e3b2e',
      app_type: 'ClubBranded',
      starting_price: 0,
      rating: 0,
      facilities: [],
      description: null,
      cart_policy: 'optional',
      cart_fee: 0,
      caddie_policy: 'optional',
      caddie_fee: 0,
      active: false,
      created_at: now,
      updated_at: now,
    })
    .select('id, name')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  logger.info('Club created', { name, id: data.id });
  res.status(201).json({ club: data });
});

router.patch('/clubs/:id', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be boolean' });

  const { data, error } = await supabase
    .from('clubs')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, active')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  logger.info('Club active toggled', { id, active });
  res.json({ club: data });
});

// ─── Club Admin management ────────────────────────────────────────────────────

/**
 * GET /api/superadmin/club-admins
 * List users who currently hold an active club_admins assignment, joined with
 * their club. Uses an inner join on club_admins (not just role=club_admin) so
 * that removing someone's assignment drops them from this list — the users
 * row and role label survive underneath, but they're no longer "a club admin"
 * from this page's point of view.
 */
router.get('/club-admins', async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, created_at, club_admins!inner(club_id, clubs(id, name))')
    .eq('role', 'club_admin')
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ admins: data });
});

/**
 * POST /api/superadmin/club-admins
 * Create a new club_admin account and assign to a club.
 * Body: { name, email, password, club_id }
 */
router.post('/club-admins', async (req, res) => {
  const { name, email, password, club_id } = req.body;
  if (!name || !email || !password || !club_id) {
    return res.status(400).json({ error: 'name, email, password, club_id required' });
  }

  // 1. Create auth user — pass name + role via metadata so the trigger inserts correctly
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role: 'club_admin' },
  });
  if (authErr) return res.status(400).json({ error: authErr.message });

  const authId = authData.user.id;

  // 2. Wait for trigger then fetch the users row it created
  await new Promise((r) => setTimeout(r, 1500));
  const { data: rows, error: userErr } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .limit(1);

  const userRow = rows?.[0];
  if (userErr || !userRow) {
    await supabase.auth.admin.deleteUser(authId);
    return res.status(500).json({ error: userErr?.message ?? 'User row not found after creation' });
  }

  // 3. Assign to club
  const { error: caErr } = await supabase
    .from('club_admins')
    .insert({ user_id: userRow.id, club_id });

  if (caErr) return res.status(500).json({ error: caErr.message });

  logger.info('Club admin created', { email, club_id });
  res.status(201).json({ success: true, user_id: userRow.id });
});

/**
 * DELETE /api/superadmin/club-admins/:userId
 * Remove club_admin assignment (demotes to no role — does not delete auth account).
 */
router.delete('/club-admins/:userId', async (req, res) => {
  const { error } = await supabase
    .from('club_admins')
    .delete()
    .eq('user_id', req.params.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ─── Tee slot generation ──────────────────────────────────────────────────────

/**
 * POST /api/superadmin/generate-tee-slots
 * Generate 60 days of tee slots for all clubs (or a specific club_id).
 * Body: { club_id? }  — omit to generate for all clubs.
 * Slots: 06:00–16:30 every 30 min = 22 slots/day/club. Skips existing.
 */
router.post('/generate-tee-slots', async (req, res) => {
  const { randomUUID } = require('crypto');
  const { club_id } = req.body || {};

  // Build club list
  const clubQuery = supabase.from('clubs').select('id');
  if (club_id) clubQuery.eq('id', club_id);
  const { data: clubs, error: cErr } = await clubQuery;
  if (cErr) return res.status(500).json({ error: cErr.message });

  // Time slots 06:00–16:30 every 30 min
  const TIMES = [];
  for (let h = 6; h <= 16; h++) {
    for (const m of [0, 30]) {
      if (h === 16 && m === 30) { TIMES.push('16:30'); break; }
      if (h < 16) TIMES.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
    }
  }
  // 06:00..16:30 inclusive
  const allTimes = [];
  for (let mins = 6*60; mins <= 16*60+30; mins += 30) {
    allTimes.push(`${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`);
  }

  const PRICE_BANDS = [
    { start: 6*60, end: 10*60+30, price: 1_250_000 },
    { start: 11*60, end: 13*60+30, price: 1_450_000 },
    { start: 14*60, end: 16*60+30, price: 1_100_000 },
  ];
  function priceFor(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const mins = h*60+m;
    for (const b of PRICE_BANDS) if (mins >= b.start && mins <= b.end) return b.price;
    return 1_250_000;
  }

  const today = new Date();
  const rows = [];
  for (const club of clubs) {
    for (let d = 0; d < 60; d++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() + d);
      const date = dt.toISOString().slice(0, 10);
      for (const time of allTimes) {
        rows.push({ id: randomUUID(), club_id: club.id, date, time, price: priceFor(time), available: true });
      }
    }
  }

  // Upsert in batches of 500 — skip existing (on_conflict: ignore)
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('tee_slots')
      .upsert(batch, { onConflict: 'club_id,date,time', ignoreDuplicates: true });
    if (error) return res.status(500).json({ error: error.message, inserted });
    inserted += batch.length;
  }

  logger.info('Tee slots generated', { clubs: clubs.length, rows: rows.length });
  res.json({ success: true, clubs: clubs.length, slots_attempted: rows.length });
});

module.exports = router;

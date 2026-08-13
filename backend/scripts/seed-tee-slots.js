/**
 * Seed 60-day rolling tee slots for all clubs.
 * Run: node backend/scripts/seed-tee-slots.js
 * Safe to re-run — uses upsert, won't duplicate existing slots.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Tee time intervals (every 8 minutes, 06:00–16:30)
const PRICE_BANDS = [
  { start: [6, 0],  end: [10, 30], price: 1_250_000 },
  { start: [11, 0], end: [13, 30], price: 1_450_000 },
  { start: [14, 0], end: [16, 30], price: 1_100_000 },
];

function generateTimeslots(intervalMinutes = 30) {
  const slots = [];
  for (const band of PRICE_BANDS) {
    const [sh, sm] = band.start;
    const [eh, em] = band.end;
    let h = sh, m = sm;
    while (h * 60 + m <= eh * 60 + em) {
      const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endTotal = h * 60 + m + intervalMinutes;
      const endStr = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
      slots.push({ time: startStr, end_time: endStr, price: band.price });
      m += intervalMinutes;
      if (m >= 60) { h += 1; m -= 60; }
    }
  }
  return slots;
}

function dateRange(days) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function main() {
  console.log('Fetching clubs…');
  const { data: clubs, error: clubErr } = await supabase.from('clubs').select('id, short_name');
  if (clubErr) { console.error(clubErr.message); process.exit(1); }

  const timeslots = generateTimeslots();
  const dates = dateRange(60);

  console.log(`Generating ${clubs.length} clubs × ${dates.length} days × ${timeslots.length} slots = ${clubs.length * dates.length * timeslots.length} rows`);

  let total = 0;
  for (const club of clubs) {
    const rows = [];
    for (const date of dates) {
      for (const ts of timeslots) {
        rows.push({
          club_id: club.id,
          date,
          time: ts.time,
          price: ts.price,
          available: true,
        });
      }
    }

    // Upsert in batches of 500
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase
        .from('tee_slots')
        .upsert(batch, { onConflict: 'club_id,date,time', ignoreDuplicates: true });
      if (error) { console.error(`Error seeding ${club.short_name}:`, error.message); break; }
    }

    total += rows.length;
    console.log(`  ✓ ${club.short_name} — ${rows.length} slots`);
  }

  console.log(`Done. ${total} slots upserted.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

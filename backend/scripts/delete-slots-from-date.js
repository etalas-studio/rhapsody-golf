/**
 * Delete tee slots for a specific club from a given date onwards.
 * Run: node backend/scripts/delete-slots-from-date.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const CLUB_NAME = 'Queen Hills';
const FROM_DATE = '2026-09-01'; // inclusive

async function main() {
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('id, name, short_name')
    .or(`name.ilike.%${CLUB_NAME}%,short_name.ilike.%${CLUB_NAME}%`)
    .single();

  if (clubErr || !club) {
    console.error('Club not found:', clubErr?.message);
    process.exit(1);
  }

  console.log(`Club: ${club.name} (${club.id})`);

  // Check actual date range in DB
  const { data: range } = await supabase
    .from('tee_slots')
    .select('date')
    .eq('club_id', club.id)
    .order('date', { ascending: true })
    .limit(1);

  const { data: rangeEnd } = await supabase
    .from('tee_slots')
    .select('date')
    .eq('club_id', club.id)
    .order('date', { ascending: false })
    .limit(1);

  console.log(`Slot range: ${range?.[0]?.date} → ${rangeEnd?.[0]?.date}`);

  // Count slots >= FROM_DATE
  const { count } = await supabase
    .from('tee_slots')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', club.id)
    .gte('date', FROM_DATE);

  console.log(`Slots to delete from ${FROM_DATE}: ${count}`);

  if (!count || count === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const { error: delErr } = await supabase
    .from('tee_slots')
    .delete()
    .eq('club_id', club.id)
    .gte('date', FROM_DATE);

  if (delErr) {
    console.error('Delete failed:', delErr.message);
    process.exit(1);
  }

  console.log(`Deleted ${count} slots from ${CLUB_NAME} starting ${FROM_DATE}.`);
}

main();

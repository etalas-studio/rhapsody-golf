#!/usr/bin/env node
/**
 * Creates 3 test users in Supabase Auth + public.users via service role.
 * Run: node backend/scripts/seed-test-users.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const USERS = [
  { email: "golfer@rhapsody.test", password: "testpass123", name: "Michael Tan", role: "golfer" },
  { email: "admin@rhapsody.test",  password: "testpass123", name: "Club Admin",  role: "club_admin" },
  { email: "super@rhapsody.test",  password: "testpass123", name: "Super Admin", role: "superadmin" },
];

async function main() {
  for (const u of USERS) {
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name },
    });

    if (authErr) {
      if (authErr.message.includes("already been registered")) {
        console.log(`⏭  ${u.email} already exists`);
        continue;
      }
      console.error(`✗  ${u.email}: ${authErr.message}`);
      continue;
    }

    // Wait for trigger to fire
    await new Promise((r) => setTimeout(r, 600));

    // Override role if not golfer (trigger defaults to 'golfer')
    if (u.role !== "golfer") {
      const { error: roleErr } = await supabase
        .from("users")
        .update({ role: u.role })
        .eq("auth_id", authData.user.id);
      if (roleErr) console.warn(`  ⚠ role update failed for ${u.email}: ${roleErr.message}`);
    }

    console.log(`✓  ${u.email} created (role: ${u.role})`);
  }

  console.log("\nTest accounts:");
  for (const u of USERS) {
    console.log(`  ${u.email}  /  ${u.password}  (${u.role})`);
  }
}

main().catch(console.error);

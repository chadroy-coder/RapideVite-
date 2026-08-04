// One-off helper: directly set a user's password via the Supabase Admin API.
// Bypasses the dashboard UI and the reset-password email entirely (useful
// when Gmail's link-scanning invalidates recovery emails before you can
// click them).
//
// Usage:
//   npx tsx scripts/set-password.ts chadroyy@gmail.com "NewPassword123"
//
// Delete this file when you're done - it's not meant to stick around.

import { config as loadEnvLocal } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnvLocal({ path: ".env.local" });

async function main() {
  const [, , email, newPassword] = process.argv;
  if (!email || !newPassword) {
    console.error('Usage: npx tsx scripts/set-password.ts <email> "<new-password>"');
    process.exit(1);
  }
  if (newPassword.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  // Find the user by email (Admin API lists users; there are only a
  // handful of accounts on this project so a single page is enough).
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error("Failed to update password:", updateError.message);
    process.exit(1);
  }

  console.log(`Password updated for ${email}. You can log in with it now.`);
}

main();

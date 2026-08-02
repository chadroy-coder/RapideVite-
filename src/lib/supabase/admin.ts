import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. SERVER ONLY - never import this from a Client Component.
// Bypasses RLS. Used for privileged admin operations (bulk import, storage cleanup)
// after we have already verified the caller's role ourselves.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

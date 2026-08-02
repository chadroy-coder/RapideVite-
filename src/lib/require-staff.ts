import "server-only";
import { createClient } from "@/lib/supabase/server";

// Defense-in-depth check used inside every admin server action, in addition
// to the RLS policies in supabase/migrations/0002_rls.sql and the route
// guard in middleware.ts. Never trust the client to only call this from an
// admin page - always re-verify the role server-side before mutating data.
export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifie.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    throw new Error("Acces refuse.");
  }

  return { supabase, user, role: profile.role as "admin" | "staff" };
}

export async function requireAdmin() {
  const result = await requireStaff();
  if (result.role !== "admin") throw new Error("Reserve aux administrateurs.");
  return result;
}

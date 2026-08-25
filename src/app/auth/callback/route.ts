import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect back from Google (and any other OAuth provider) after
// the user approves sign-in. Supabase sends us here with ?code=..., which we
// swap for a real session cookie, then bounce the user to where they wanted
// to go (?redirect_to=...) or the account page by default.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") ?? "/compte";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}

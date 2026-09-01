import { NextResponse } from "next/server";
import { logApkDownload } from "@/lib/actions/apk-downloads";

// Every hit here is one download attempt (not necessarily a completed
// install) - logged before redirecting to the actual static file so the
// count reflects real user activity from the /telecharger page's button,
// not just requests directly to /downloads/RapidVit.apk.
export async function GET(request: Request) {
  await logApkDownload();
  return NextResponse.redirect(new URL("/downloads/RapidVit.apk", request.url));
}

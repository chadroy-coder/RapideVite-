"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// Called from the /api/download-apk route handler, not from a logged-in
// user's own action - anyone downloading the sideloaded app is by
// definition not authenticated staff, so this writes via the service-role
// client rather than requireStaff().
export async function logApkDownload() {
  const admin = createAdminClient();
  await admin.from("apk_downloads").insert({});
}

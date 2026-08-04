import type { Subscription } from "@/types/database";

// Plain helper (not a Server Action) - kept out of src/lib/actions/subscription.ts
// because every export from a "use server" file must be an async function.
export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub || sub.status !== "active") return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
  return true;
}

"use server";

// Actions behind the /woulib-livreur/[token] page - mirrors the exact
// magic-link pattern in src/lib/actions/driver.ts (used for grocery orders).
// No driver login system: the unguessable per-request token
// (woulib_requests.driver_access_token) IS the access control, checked
// against the database with the service-role client on every call.

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WoulibStatus } from "@/types/database";

async function resolveRequestIdFromToken(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("woulib_requests")
    .select("id")
    .eq("driver_access_token", token)
    .maybeSingle();
  return data?.id as string | undefined;
}

export async function getWoulibRequestForDriver(token: string) {
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("woulib_requests")
    .select("*, vehicle_type:woulib_vehicle_types(*)")
    .eq("driver_access_token", token)
    .maybeSingle();
  return request ?? null;
}

export async function updateWoulibDriverLocation(token: string, lat: number, lng: number) {
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { error: "Position invalide." };
  }
  const requestId = await resolveRequestIdFromToken(token);
  if (!requestId) return { error: "Lien invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("woulib_requests")
    .update({ driver_lat: lat, driver_lng: lng, driver_location_updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { error: "Impossible d'enregistrer la position." };
  return { error: null };
}

// The driver moves the request forward one step at a time - no skipping
// straight from "accepted" to "completed" from this console (admin can still
// force a status via the admin queue if something goes wrong).
const NEXT_STATUS: Partial<Record<WoulibStatus, WoulibStatus>> = {
  accepted: "en_route_pickup",
  en_route_pickup: "picked_up",
  picked_up: "en_route_dropoff",
  en_route_dropoff: "completed",
};

export async function advanceWoulibStatus(token: string, currentStatus: WoulibStatus) {
  const next = NEXT_STATUS[currentStatus];
  if (!next) return { error: "Statut invalide.", status: null };

  const requestId = await resolveRequestIdFromToken(token);
  if (!requestId) return { error: "Lien invalide.", status: null };

  const admin = createAdminClient();
  const { error } = await admin.from("woulib_requests").update({ status: next }).eq("id", requestId);
  if (error) return { error: "Impossible de mettre a jour le statut.", status: null };
  revalidatePath(`/mes-woulib/${requestId}`);
  return { error: null, status: next };
}

export async function getWoulibDriverStatus(token: string) {
  const requestId = await resolveRequestIdFromToken(token);
  if (!requestId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("woulib_requests").select("status").eq("id", requestId).single();
  return (data?.status as WoulibStatus) ?? null;
}

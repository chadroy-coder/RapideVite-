"use server";

import { createClient } from "@/lib/supabase/server";
import { estimateRoute, calculateFare } from "@/lib/woulib";
import { woulibRequestSchema, type WoulibRequestInput } from "@/lib/validations/schemas";
import { WOULIB_LIVE_STATUSES, type WoulibRequest, type WoulibVehicleType } from "@/types/database";

export async function getVehicleTypes(): Promise<WoulibVehicleType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("woulib_vehicle_types")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []) as WoulibVehicleType[];
}

// Live price quote shown to the customer while they're filling out the
// request form, before anything is saved - re-run with the real
// pickup/dropoff coordinates every time either pin moves or the vehicle
// type changes.
export async function quoteWoulib(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
  vehicleTypeId: string
) {
  const supabase = await createClient();
  const { data: vehicleType } = await supabase
    .from("woulib_vehicle_types")
    .select("*")
    .eq("id", vehicleTypeId)
    .single();
  if (!vehicleType) return { error: "Type de vehicule invalide.", quote: null };

  const route = await estimateRoute(pickup, dropoff);
  const price = calculateFare(vehicleType, route);

  return {
    error: null,
    quote: {
      distanceKm: Math.round(route.distanceKm * 10) / 10,
      durationMinutes: Math.round(route.durationMinutes),
      price,
    },
  };
}

export async function createWoulibRequest(input: WoulibRequestInput) {
  const parsed = woulibRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides", requestId: null, requestNumber: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Veuillez vous connecter pour faire une demande.", requestId: null, requestNumber: null };
  }

  const { data: vehicleType } = await supabase
    .from("woulib_vehicle_types")
    .select("*")
    .eq("id", parsed.data.vehicle_type_id)
    .single();
  if (!vehicleType) {
    return { error: "Type de vehicule invalide.", requestId: null, requestNumber: null };
  }

  // Price is recomputed server-side from the real coordinates rather than
  // trusting whatever number the client showed on the quote screen - same
  // "never trust the client for the price" rule as placeOrder().
  const pickup = { lat: parsed.data.pickup_lat, lng: parsed.data.pickup_lng };
  const dropoff = { lat: parsed.data.dropoff_lat, lng: parsed.data.dropoff_lng };
  const route = await estimateRoute(pickup, dropoff);
  const price = calculateFare(vehicleType, route);

  const { data: request, error } = await supabase
    .from("woulib_requests")
    .insert({
      user_id: user.id,
      service_type: parsed.data.service_type,
      vehicle_type_id: parsed.data.vehicle_type_id,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      pickup_address: parsed.data.pickup_address || null,
      dropoff_lat: dropoff.lat,
      dropoff_lng: dropoff.lng,
      dropoff_address: parsed.data.dropoff_address || null,
      contact_name: parsed.data.contact_name,
      contact_phone: parsed.data.contact_phone,
      package_description: parsed.data.package_description || null,
      notes: parsed.data.notes || null,
      payment_method: parsed.data.payment_method,
      distance_km: Math.round(route.distanceKm * 10) / 10,
      duration_minutes: Math.round(route.durationMinutes),
      estimated_price: price,
      status: "requested",
    })
    .select()
    .single();

  if (error || !request) {
    return { error: "Impossible de creer la demande. Veuillez reessayer.", requestId: null, requestNumber: null };
  }

  return { error: null, requestId: request.id as string, requestNumber: request.request_number as string };
}

export async function getMyWoulibRequests() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("woulib_requests")
    .select("*, vehicle_type:woulib_vehicle_types(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as WoulibRequest[];
}

export async function getWoulibRequestById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("woulib_requests")
    .select("*, vehicle_type:woulib_vehicle_types(*), driver:drivers(name, phone, photo_url)")
    .eq("id", id)
    .single();
  return (data ?? null) as unknown as WoulibRequest | null;
}

// Lightweight poll target for the customer's live tracking page, mirroring
// getOrderLiveState() in orders.ts.
export async function getWoulibLiveState(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("woulib_requests")
    .select("status, driver_lat, driver_lng, driver_location_updated_at")
    .eq("id", id)
    .single();
  return data ?? null;
}

// Powers a bottom-nav "Woulib in progress" indicator, mirroring
// getLiveOrderCount() in orders.ts.
export async function getLiveWoulibCount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("woulib_requests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", WOULIB_LIVE_STATUSES);
  return count ?? 0;
}

export async function cancelWoulibRequest(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter." };

  const { data: request } = await supabase.from("woulib_requests").select("user_id, status").eq("id", id).single();
  if (!request || request.user_id !== user.id) return { error: "Demande introuvable." };
  if (request.status !== "requested") {
    return { error: "Cette demande est deja en cours - contactez le chauffeur directement." };
  }

  const { error } = await supabase.from("woulib_requests").update({ status: "cancelled" }).eq("id", id);
  if (error) return { error: "Impossible d'annuler la demande." };
  return { error: null };
}

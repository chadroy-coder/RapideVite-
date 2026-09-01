"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import type { WoulibRequest, WoulibStatus, WoulibVehicleType } from "@/types/database";

export async function listWoulibRequestsAdmin(filters?: { status?: WoulibStatus }) {
  const { supabase } = await requireStaff();
  let q = supabase
    .from("woulib_requests")
    .select("*, vehicle_type:woulib_vehicle_types(*), driver:drivers(name, phone, photo_url)")
    .order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as WoulibRequest[];
}

export async function getWoulibRequestAdmin(id: string) {
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("woulib_requests")
    .select("*, vehicle_type:woulib_vehicle_types(*), driver:drivers(name, phone, photo_url)")
    .eq("id", id)
    .single();
  return (data ?? null) as unknown as WoulibRequest | null;
}

// Assigning a driver from the roster is what actually moves a brand-new
// request out of "requested" - mirrors how updateOrderStatus() lets staff
// pick a driver for a grocery order, but here it also advances the status
// since there's no "confirmed"/"preparing" prep stage for a ride/package.
export async function assignWoulibDriver(requestId: string, driverId: string) {
  const { supabase } = await requireStaff();
  const { data: current } = await supabase.from("woulib_requests").select("status").eq("id", requestId).single();
  if (!current) return { error: "Demande introuvable." };

  const { error } = await supabase
    .from("woulib_requests")
    .update({
      assigned_driver_id: driverId,
      status: current.status === "requested" ? "accepted" : current.status,
    })
    .eq("id", requestId);
  if (error) return { error: "Impossible d'assigner le chauffeur." };
  revalidatePath("/admin/woulib");
  revalidatePath(`/admin/woulib/${requestId}`);
  return { error: null };
}

export async function updateWoulibStatusAdmin(requestId: string, status: WoulibStatus) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("woulib_requests").update({ status }).eq("id", requestId);
  if (error) return { error: "Impossible de mettre a jour le statut." };
  revalidatePath("/admin/woulib");
  revalidatePath(`/admin/woulib/${requestId}`);
  revalidatePath(`/mes-woulib/${requestId}`);
  return { error: null };
}

export async function setWoulibFinalPrice(requestId: string, finalPrice: number) {
  const { supabase } = await requireStaff();
  if (typeof finalPrice !== "number" || Number.isNaN(finalPrice) || finalPrice < 0) {
    return { error: "Prix invalide." };
  }
  const { error } = await supabase.from("woulib_requests").update({ final_price: finalPrice }).eq("id", requestId);
  if (error) return { error: "Impossible de mettre a jour le prix." };
  revalidatePath("/admin/woulib");
  revalidatePath(`/admin/woulib/${requestId}`);
  revalidatePath(`/mes-woulib/${requestId}`);
  return { error: null };
}

// ---------- Vehicle type pricing (Moto / Voiture rates) ----------

export async function listVehicleTypesAdmin() {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("woulib_vehicle_types").select("*").order("sort_order", { ascending: true });
  return (data ?? []) as WoulibVehicleType[];
}

export async function updateVehicleTypePricing(
  id: string,
  input: { base_fare: number; price_per_km: number; price_per_minute: number; active: boolean }
) {
  const { supabase } = await requireStaff();
  const { base_fare, price_per_km, price_per_minute, active } = input;
  if ([base_fare, price_per_km, price_per_minute].some((v) => typeof v !== "number" || Number.isNaN(v) || v < 0)) {
    return { error: "Valeurs invalides." };
  }
  const { error } = await supabase
    .from("woulib_vehicle_types")
    .update({ base_fare, price_per_km, price_per_minute, active })
    .eq("id", id);
  if (error) return { error: "Impossible de mettre a jour la tarification." };
  revalidatePath("/admin/woulib");
  revalidatePath("/woulib");
  return { error: null };
}

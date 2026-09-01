"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROOF_REQUIRED_PAYMENT_METHODS, type WoulibRequest, type WoulibStatus, type WoulibVehicleType } from "@/types/database";

export async function listWoulibRequestsAdmin(filters?: { status?: WoulibStatus; pendingPayment?: boolean }) {
  const { supabase } = await requireStaff();
  let q = supabase
    .from("woulib_requests")
    .select("*, vehicle_type:woulib_vehicle_types(*), driver:drivers(name, phone, photo_url)")
    .order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  // MonCash/NatCash/Sogebank requests whose screenshot hasn't been reviewed
  // yet - used by the "A verifier" quick filter on the admin Woulib list.
  if (filters?.pendingPayment) {
    q = q.eq("payment_status", "pending").in("payment_method", PROOF_REQUIRED_PAYMENT_METHODS);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as WoulibRequest[];
}

// Count of manual-method Woulib requests awaiting a payment verification
// decision - powers the badge on the admin quick filter.
export async function countPendingWoulibPaymentVerifications() {
  const { supabase } = await requireStaff();
  const { count, error } = await supabase
    .from("woulib_requests")
    .select("*", { count: "exact", head: true })
    .eq("payment_status", "pending")
    .in("payment_method", PROOF_REQUIRED_PAYMENT_METHODS);
  if (error) return 0;
  return count ?? 0;
}

export async function getWoulibRequestAdmin(id: string) {
  const { supabase } = await requireStaff();
  const { data: request } = await supabase
    .from("woulib_requests")
    .select("*, vehicle_type:woulib_vehicle_types(*), driver:drivers(name, phone, photo_url)")
    .eq("id", id)
    .single();
  if (!request) return null;

  // payment-proofs is a private bucket, so admins view it via a short-lived
  // signed URL rather than a public one - same pattern as getOrderAdmin().
  let paymentProofSignedUrl: string | null = null;
  if (request.payment_proof_url) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from("payment-proofs")
      .createSignedUrl(request.payment_proof_url, 60 * 15);
    paymentProofSignedUrl = signed?.signedUrl ?? null;
  }

  return { ...(request as unknown as WoulibRequest), paymentProofSignedUrl };
}

// For MonCash/NatCash/Sogebank requests: after checking the uploaded
// screenshot, staff mark the transfer as confirmed ("paid") or rejected
// ("failed"). Mirrors verifyOrderPayment() in admin-orders.ts.
export async function verifyWoulibPayment(requestId: string, approve: boolean) {
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("woulib_requests")
    .update({ payment_status: approve ? "paid" : "failed" })
    .eq("id", requestId);
  if (error) return { error: "Impossible de mettre a jour le statut du paiement." };
  revalidatePath("/admin/woulib");
  revalidatePath(`/admin/woulib/${requestId}`);
  revalidatePath(`/mes-woulib/${requestId}`);
  return { error: null };
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

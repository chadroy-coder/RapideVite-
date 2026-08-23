"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { orderStatusUpdateSchema, type OrderStatusUpdateInput } from "@/lib/validations/schemas";
import type { Order, OrderItem, OrderStatus } from "@/types/database";

export async function listOrdersAdmin(filters?: { status?: OrderStatus; query?: string }) {
  const { supabase } = await requireStaff();
  let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.query) {
    q = q.or(`order_number.ilike.%${filters.query}%,customer_name.ilike.%${filters.query}%,customer_phone.ilike.%${filters.query}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getOrderAdmin(id: string) {
  const { supabase } = await requireStaff();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!order) return null;
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", id);

  // payment-proofs is a private bucket (screenshots can contain personal
  // financial info), so admins view it via a short-lived signed URL rather
  // than a public one.
  let paymentProofSignedUrl: string | null = null;
  if (order.payment_proof_url) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from("payment-proofs")
      .createSignedUrl(order.payment_proof_url, 60 * 15);
    paymentProofSignedUrl = signed?.signedUrl ?? null;
  }

  return { ...(order as Order), items: (items ?? []) as OrderItem[], paymentProofSignedUrl };
}

// For MonCash/NatCash/Sogebank orders: after checking the uploaded
// screenshot, staff mark the transfer as confirmed ("paid") or rejected
// ("failed"). Does not touch card/cash_on_delivery orders - those flow
// through Stripe or get paid at the door.
export async function verifyOrderPayment(orderId: string, approve: boolean) {
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: approve ? "paid" : "failed" })
    .eq("id", orderId);
  if (error) return { error: "Impossible de mettre a jour le statut du paiement." };
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${orderId}`);
  revalidatePath(`/commandes/${orderId}`);
  return { error: null };
}

export async function updateOrderStatus(input: OrderStatusUpdateInput) {
  const { supabase } = await requireStaff();
  const parsed = orderStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  const d = parsed.data;
  const { error } = await supabase
    .from("orders")
    .update({
      status: d.status,
      assigned_delivery_person: d.assigned_delivery_person || null,
      estimated_delivery_time: d.estimated_delivery_time || null,
      driver_photo_url: d.driver_photo_url || null,
    })
    .eq("id", d.order_id);
  if (error) return { error: "Impossible de mettre a jour la commande." };
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${d.order_id}`);
  revalidatePath(`/commandes/${d.order_id}`);
  return { error: null };
}

export async function uploadDriverPhoto(formData: FormData) {
  await requireStaff();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier fourni.", url: null };

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `drivers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage
    .from("product-images")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (error) return { error: "Echec du telechargement de la photo.", url: null };

  const { data } = admin.storage.from("product-images").getPublicUrl(path);
  return { error: null, url: data.publicUrl };
}

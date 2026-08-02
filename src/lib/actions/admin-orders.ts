"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
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
  return { ...(order as Order), items: (items ?? []) as OrderItem[] };
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
    })
    .eq("id", d.order_id);
  if (error) return { error: "Impossible de mettre a jour la commande." };
  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${d.order_id}`);
  return { error: null };
}

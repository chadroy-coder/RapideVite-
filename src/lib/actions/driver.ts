"use server";

// Actions behind the /livreur/[token] page. There is no driver login system
// yet - the unguessable per-order token (orders.driver_access_token, a
// random 16-byte hex string) IS the access control, checked against the
// database with the service-role client on every call. Never trust a token
// format check alone; always confirm it actually matches a row.
//
// Scope note: substitutions/refunds here only change order_items - they do
// NOT recompute orders.total or touch payment records. Reconciling what the
// customer was actually charged vs. what they received is a manual admin
// step for now (flagged to Chad - can be automated in a later pass).

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveOrderIdFromToken(token: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("orders").select("id").eq("driver_access_token", token).maybeSingle();
  return data?.id as string | undefined;
}

export async function getOrderForDriver(token: string) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("driver_access_token", token)
    .maybeSingle();
  if (!order) return null;

  const { data: items } = await admin
    .from("order_items")
    .select(
      "*, product:products!order_items_product_id_fkey(image_url), substitute_product:products!order_items_substitute_product_id_fkey(name, image_url)"
    )
    .eq("order_id", order.id);

  return { order, items: items ?? [] };
}

export async function updateDriverLocation(token: string, lat: number, lng: number) {
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { error: "Position invalide." };
  }
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("orders")
    .update({ driver_lat: lat, driver_lng: lng, driver_location_updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) return { error: "Impossible d'enregistrer la position." };
  return { error: null };
}

export async function markItemFound(token: string, itemId: string) {
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("order_items")
    .update({ fulfillment_status: "found", substitute_status: null })
    .eq("id", itemId)
    .eq("order_id", orderId);
  if (error) return { error: "Impossible de mettre a jour l'article." };
  revalidatePath(`/commandes/${orderId}`);
  return { error: null };
}

// Undoes an accidental "Trouve" tap - back to needing a decision.
export async function resetItemStatus(token: string, itemId: string) {
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("order_items")
    .update({ fulfillment_status: "pending", substitute_status: null, substitute_product_id: null, substitute_variant_id: null })
    .eq("id", itemId)
    .eq("order_id", orderId);
  if (error) return { error: "Impossible de reinitialiser l'article." };
  revalidatePath(`/commandes/${orderId}`);
  return { error: null };
}

export async function markItemUnavailable(token: string, itemId: string) {
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("order_items")
    .update({ fulfillment_status: "unavailable", substitute_status: null, substitute_product_id: null, substitute_variant_id: null })
    .eq("id", itemId)
    .eq("order_id", orderId);
  if (error) return { error: "Impossible de mettre a jour l'article." };
  revalidatePath(`/commandes/${orderId}`);
  return { error: null };
}

// Suggests replacements from the same category as the original product -
// simple "similar item" logic for v1 (no fuzzy name/brand matching yet).
export async function listSimilarProducts(token: string, originalProductId: string) {
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide.", products: [] };

  const admin = createAdminClient();
  const { data: original } = await admin.from("products").select("category_id").eq("id", originalProductId).single();
  if (!original?.category_id) return { error: null, products: [] };

  const { data: candidates } = await admin
    .from("products")
    .select("id, name, image_url, variants:product_variants(id, size, selling_price, is_default, active, in_stock)")
    .eq("category_id", original.category_id)
    .eq("active", true)
    .eq("is_draft_product", false)
    .neq("id", originalProductId)
    .limit(8);

  const products = (candidates ?? [])
    .map((p) => {
      const variant = (p.variants ?? []).find((v: { is_default: boolean; active: boolean; in_stock: boolean }) => v.is_default && v.active && v.in_stock);
      if (!variant) return null;
      return {
        productId: p.id as string,
        name: p.name as string,
        imageUrl: p.image_url as string | null,
        variantId: variant.id as string,
        size: variant.size as string | null,
        price: Number(variant.selling_price),
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, 5);

  return { error: null, products };
}

export async function proposeSubstitute(token: string, itemId: string, substituteProductId: string, substituteVariantId: string) {
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("order_items")
    .update({
      fulfillment_status: "unavailable",
      substitute_product_id: substituteProductId,
      substitute_variant_id: substituteVariantId,
      substitute_status: "proposed",
      substitute_proposed_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("order_id", orderId);
  if (error) return { error: "Impossible de proposer un remplacement." };
  revalidatePath(`/commandes/${orderId}`);
  return { error: null };
}

export async function refundItem(token: string, itemId: string) {
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("order_items")
    .update({
      fulfillment_status: "refunded",
      substitute_status: null,
      substitute_product_id: null,
      substitute_variant_id: null,
    })
    .eq("id", itemId)
    .eq("order_id", orderId);
  if (error) return { error: "Impossible de mettre a jour l'article." };
  revalidatePath(`/commandes/${orderId}`);
  return { error: null };
}

// Called by the driver page's own timer when the customer hasn't responded
// to a proposed substitute within the wait window - proceeds with the
// picker's suggestion rather than leaving the driver stuck at the store.
export async function autoApplySubstitute(token: string, itemId: string) {
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide." };

  const admin = createAdminClient();
  // Only auto-apply if still awaiting a response - if the customer already
  // answered in the meantime, don't clobber their decision.
  const { data: item } = await admin
    .from("order_items")
    .select("substitute_status")
    .eq("id", itemId)
    .eq("order_id", orderId)
    .single();
  if (item?.substitute_status !== "proposed") return { error: null };

  const { error } = await admin
    .from("order_items")
    .update({ fulfillment_status: "substituted", substitute_status: "auto_applied" })
    .eq("id", itemId)
    .eq("order_id", orderId);
  if (error) return { error: "Impossible de finaliser le remplacement." };
  revalidatePath(`/commandes/${orderId}`);
  return { error: null };
}

// Lightweight poll target for the driver page - just the fulfillment/
// substitute fields it needs to refresh per item without refetching images.
export async function getItemStatuses(token: string) {
  const orderId = await resolveOrderIdFromToken(token);
  if (!orderId) return { error: "Lien invalide.", items: [] };
  const admin = createAdminClient();
  const { data } = await admin
    .from("order_items")
    .select("id, fulfillment_status, substitute_status")
    .eq("order_id", orderId);
  return { error: null, items: data ?? [] };
}

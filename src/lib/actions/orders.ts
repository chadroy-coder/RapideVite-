"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/schemas";
import { LIVE_ORDER_STATUSES, type Order, type OrderItem } from "@/types/database";

export interface CartLine {
  variantId: string;
  quantity: number;
}

// Places an order. Prices, product names, and inventory are ALWAYS
// re-read from the database here - the client only supplies variant IDs
// and quantities, so a tampered localStorage cart can never change what
// gets charged.
export async function placeOrder(cartLines: CartLine[], input: CheckoutInput) {
  if (cartLines.length === 0) {
    return { error: "Votre panier est vide.", orderId: null, orderNumber: null };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides", orderId: null, orderNumber: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Veuillez vous connecter pour passer une commande.", orderId: null, orderNumber: null };
  }

  const variantIds = cartLines.map((l) => l.variantId);
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("*, product:products(name, active)")
    .in("id", variantIds);

  if (variantsError || !variants || variants.length !== variantIds.length) {
    return { error: "Un ou plusieurs produits ne sont plus disponibles.", orderId: null, orderNumber: null };
  }

  let subtotal = 0;
  const lineItems: {
    product_id: string;
    variant_id: string;
    product_name: string;
    variant_label: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }[] = [];

  for (const line of cartLines) {
    const variant = variants.find((v) => v.id === line.variantId);
    if (!variant || !variant.active || !variant.in_stock) {
      return { error: "Un produit de votre panier n'est plus en stock.", orderId: null, orderNumber: null };
    }
    if (variant.inventory_quantity < line.quantity) {
      return {
        error: `Stock insuffisant pour ${variant.product?.name ?? "un produit"} (${variant.inventory_quantity} disponible).`,
        orderId: null,
        orderNumber: null,
      };
    }
    const lineTotal = Number(variant.selling_price) * line.quantity;
    subtotal += lineTotal;
    lineItems.push({
      product_id: variant.product_id,
      variant_id: variant.id,
      product_name: variant.product?.name ?? "Produit",
      variant_label: variant.size,
      unit_price: Number(variant.selling_price),
      quantity: line.quantity,
      line_total: lineTotal,
    });
  }

  const { data: deliverySettings } = await supabase
    .from("delivery_settings")
    .select("standard_delivery_fee")
    .single();

  // RapidVit Plus+ members get unlimited free delivery for the month -
  // waive the fee here so it's enforced server-side, not just in the UI.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  const isPlusMember =
    !!subscription &&
    subscription.status === "active" &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) >= new Date());

  const deliveryFee = isPlusMember ? 0 : (deliverySettings?.standard_delivery_fee ?? 1.15);
  const total = subtotal + deliveryFee;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      customer_name: parsed.data.customer_name,
      customer_phone: parsed.data.customer_phone,
      department: parsed.data.department,
      commune: parsed.data.commune,
      neighborhood: parsed.data.neighborhood || null,
      street: parsed.data.street,
      delivery_instructions: parsed.data.delivery_instructions || null,
      subtotal,
      delivery_fee: deliveryFee,
      discount: 0,
      total,
      payment_method: parsed.data.payment_method,
      payment_status: "pending",
      status: "new",
    })
    .select()
    .single();

  if (orderError || !order) {
    return { error: "Impossible de creer la commande. Veuillez reessayer.", orderId: null, orderNumber: null };
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(lineItems.map((li) => ({ ...li, order_id: order.id })));

  if (itemsError) {
    return { error: "Erreur lors de l'enregistrement des articles.", orderId: null, orderNumber: null };
  }

  // Decrement inventory for each purchased variant.
  for (const line of cartLines) {
    const variant = variants.find((v) => v.id === line.variantId)!;
    await supabase
      .from("product_variants")
      .update({ inventory_quantity: variant.inventory_quantity - line.quantity })
      .eq("id", line.variantId);
  }

  if (parsed.data.save_address) {
    // Only one address should be "default" at a time - that's the one the
    // checkout form pre-fills next time, so clear the old default first.
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("addresses").insert({
      user_id: user.id,
      label: "Livraison",
      department: parsed.data.department,
      commune: parsed.data.commune,
      neighborhood: parsed.data.neighborhood || null,
      street: parsed.data.street,
      delivery_instructions: parsed.data.delivery_instructions || null,
      is_default: true,
    });
  }

  // Keep the profile's name/phone in sync so future checkouts (and the
  // account page) reflect the latest details the customer typed in.
  await supabase
    .from("profiles")
    .update({ full_name: parsed.data.customer_name, phone: parsed.data.customer_phone })
    .eq("id", user.id);

  return { error: null, orderId: order.id as string, orderNumber: order.order_number as string };
}

// Uploads the customer's MonCash/NatCash/Sogebank transfer screenshot for an
// order they just placed, and records its storage path on the order. Runs
// with the service-role client (customers have no update grant on orders -
// see orders_staff_update in 0002_rls.sql) but only after verifying the
// order actually belongs to the calling user, so a customer can never attach
// a "proof" to someone else's order.
export async function uploadPaymentProof(orderId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter.", url: null };

  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id")
    .eq("id", orderId)
    .single();
  if (!order || order.user_id !== user.id) {
    return { error: "Commande introuvable.", url: null };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier fourni.", url: null };
  if (file.size > 20 * 1024 * 1024) {
    return { error: "Fichier trop volumineux (max 20 Mo).", url: null };
  }

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("payment-proofs")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: "Echec du telechargement de la preuve de paiement.", url: null };
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({ payment_proof_url: path })
    .eq("id", orderId);

  if (updateError) {
    return { error: "Preuve envoyee mais impossible de l'associer a la commande.", url: null };
  }

  return { error: null, url: path };
}

export async function getOrderById(orderId: string) {
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select(
      "*, product:products!order_items_product_id_fkey(image_url), substitute_product:products!order_items_substitute_product_id_fkey(name, image_url)"
    )
    .eq("order_id", orderId);
  return { ...(order as Order), items: (items ?? []) as unknown as OrderItem[] };
}

// Lightweight poll target for the customer's order tracking page - driver
// location + per-item status only, so the page can refresh every few
// seconds without re-fetching the whole order.
export async function getOrderLiveState(orderId: string) {
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("driver_lat, driver_lng, driver_location_updated_at, status, payment_status")
    .eq("id", orderId)
    .single();
  const { data: items } = await supabase
    .from("order_items")
    .select("id, fulfillment_status, substitute_status, substitute_product_id, substitute_variant_id, substitute_product:products!order_items_substitute_product_id_fkey(name, image_url)")
    .eq("order_id", orderId);
  return { order: order ?? null, items: (items ?? []) as unknown as OrderItem[] };
}

// Customer's response to a picker-proposed substitute. Ownership is
// verified against the session user, then applied with the service-role
// client since customers have no direct update grant on order_items
// (order_items_staff_all is the only update policy - see 0002_rls.sql).
export async function respondToSubstitute(orderId: string, itemId: string, accept: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter." };

  const { data: order } = await supabase.from("orders").select("id, user_id").eq("id", orderId).single();
  if (!order || order.user_id !== user.id) return { error: "Commande introuvable." };

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("order_items")
    .select("substitute_status")
    .eq("id", itemId)
    .eq("order_id", orderId)
    .single();
  if (item?.substitute_status !== "proposed") {
    return { error: "Cette proposition n'est plus disponible." };
  }

  const { error } = await admin
    .from("order_items")
    .update(
      accept
        ? { fulfillment_status: "substituted", substitute_status: "accepted" }
        : { fulfillment_status: "refunded", substitute_status: "declined" }
    )
    .eq("id", itemId)
    .eq("order_id", orderId);
  if (error) return { error: "Impossible d'enregistrer votre reponse." };
  return { error: null };
}

// Powers the "order in progress" badge on the bottom nav's Commandes icon -
// deliberately just a boolean-ish count, not the full order list, so it's
// cheap enough to poll every so often while the customer browses.
export async function getLiveOrderCount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", LIVE_ORDER_STATUSES);
  return count ?? 0;
}

export async function getMyOrders() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("orders")
    .select("*, items:order_items(*, product:products!order_items_product_id_fkey(image_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as (Order & { items: OrderItem[] })[];
}

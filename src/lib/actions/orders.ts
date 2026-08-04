"use server";

import { createClient } from "@/lib/supabase/server";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/schemas";
import type { Order, OrderItem } from "@/types/database";

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

export async function getOrderById(orderId: string) {
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("*, product:products(image_url)")
    .eq("order_id", orderId);
  return { ...(order as Order), items: (items ?? []) as unknown as OrderItem[] };
}

export async function getMyOrders() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("orders")
    .select("*, items:order_items(*, product:products(image_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as (Order & { items: OrderItem[] })[];
}

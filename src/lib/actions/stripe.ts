"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe, getStripeCurrency } from "@/lib/stripe";
import type { Order, OrderItem } from "@/types/database";

// Creates a Stripe Checkout Session for an already-created order (see
// placeOrder in src/lib/actions/orders.ts) and returns the hosted checkout
// URL to redirect the customer to. The order is not modified beyond storing
// the Checkout Session id for later lookup by the webhook.
export async function createCheckoutSession(orderId: string) {
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { error: "Commande introuvable.", url: null };
  }

  const typedOrder = order as Order & { items: OrderItem[] };

  if (typedOrder.items.length === 0) {
    return { error: "Cette commande ne contient aucun article.", url: null };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const currency = getStripeCurrency();

  const lineItems = typedOrder.items.map((item) => ({
    price_data: {
      currency,
      product_data: {
        name: item.variant_label ? `${item.product_name} (${item.variant_label})` : item.product_name,
      },
      unit_amount: Math.round(Number(item.unit_price) * 100),
    },
    quantity: item.quantity,
  }));

  if (Number(typedOrder.delivery_fee) > 0) {
    lineItems.push({
      price_data: {
        currency,
        product_data: { name: "Frais de livraison" },
        unit_amount: Math.round(Number(typedOrder.delivery_fee) * 100),
      },
      quantity: 1,
    });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${siteUrl}/commande-confirmee/${orderId}?paiement=succes`,
      cancel_url: `${siteUrl}/commande-confirmee/${orderId}?paiement=annule`,
      client_reference_id: orderId,
      metadata: { order_id: orderId, order_number: typedOrder.order_number },
    });

    if (!session.url) {
      return { error: "Impossible de creer la session de paiement.", url: null };
    }

    await supabase
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);

    return { error: null, url: session.url };
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return { error: "Le paiement par carte est momentanement indisponible.", url: null };
  }
}

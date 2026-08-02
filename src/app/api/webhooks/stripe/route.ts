import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe calls this endpoint directly (no user session), so we verify the
// request using the raw body + signing secret rather than trusting cookies,
// and use the service-role client to bypass RLS when writing the order.
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id ?? session.client_reference_id;

    if (orderId) {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        })
        .eq("id", orderId);

      if (error) {
        console.error("Failed to mark order as paid from Stripe webhook:", error.message);
        // Return 500 so Stripe retries the webhook rather than silently losing the payment update.
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
      }
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id ?? session.client_reference_id;
    if (orderId) {
      const supabase = createAdminClient();
      await supabase.from("orders").update({ payment_status: "failed" }).eq("id", orderId);
    }
  }

  return NextResponse.json({ received: true });
}

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

  if (
    (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
    (event.data.object as Stripe.Checkout.Session).mode === "payment"
  ) {
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

  // RapidVit Plus+ subscription checkout completed - link the Stripe
  // customer/subscription to our user so the status-change events below
  // can find the right row by subscription id alone (no user_id on those).
  if (event.type === "checkout.session.completed" && (event.data.object as Stripe.Checkout.Session).mode === "subscription") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? session.metadata?.user_id;
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
    const stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);

    if (userId && stripeSubscriptionId) {
      const supabase = createAdminClient();
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const periodEnd = subscription.items.data[0]?.current_period_end;

      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          status: subscription.status === "active" || subscription.status === "trialing" ? "active" : subscription.status,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("Failed to record RapidVit Plus+ subscription:", error.message);
      }
    }
  }

  // Subscription renewed, went past due, or otherwise changed status.
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const supabase = createAdminClient();
    const periodEnd = subscription.items.data[0]?.current_period_end;

    const status =
      subscription.status === "active" || subscription.status === "trialing"
        ? "active"
        : subscription.status === "past_due"
          ? "past_due"
          : subscription.status === "canceled" || subscription.status === "unpaid" || subscription.status === "incomplete_expired"
            ? "canceled"
            : "inactive";

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Failed to update RapidVit Plus+ subscription:", error.message);
    }
  }

  // Subscription cancelled (immediately, or at period end and now expired).
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Failed to cancel RapidVit Plus+ subscription:", error.message);
    }
  }

  return NextResponse.json({ received: true });
}

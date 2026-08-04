"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { SUBSCRIPTION_PRICE_USD, type Subscription } from "@/types/database";

// RapidVit Plus+ - $30/month, card only (Stripe subscription mode), waives
// the delivery fee on every order placed while the subscription is active.

export async function getMySubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
  return (data as Subscription | null) ?? null;
}

export async function createSubscriptionCheckout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter pour vous abonner.", url: null };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { user_id: user.id },
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "RapidVit Plus+",
              description: "Livraisons illimitees pendant 1 mois",
            },
            unit_amount: SUBSCRIPTION_PRICE_USD * 100,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/abonnement?paiement=succes`,
      cancel_url: `${siteUrl}/abonnement?paiement=annule`,
    });

    if (!session.url) return { error: "Impossible de creer la session d'abonnement.", url: null };
    return { error: null, url: session.url };
  } catch (err) {
    console.error("Stripe subscription checkout error:", err);
    return { error: "L'abonnement est momentanement indisponible.", url: null };
  }
}

export async function createBillingPortalSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Veuillez vous connecter.", url: null };

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) return { error: "Aucun abonnement trouve.", url: null };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl}/abonnement`,
    });
    return { error: null, url: portal.url };
  } catch (err) {
    console.error("Stripe billing portal error:", err);
    return { error: "Impossible d'ouvrir la gestion de l'abonnement. Verifiez que le Customer Portal est active dans Stripe.", url: null };
  }
}

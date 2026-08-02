import Stripe from "stripe";

// Server-only Stripe client. Never import this from a Client Component -
// STRIPE_SECRET_KEY must stay on the server.
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Currency used for Stripe Checkout line items. Defaults to Haitian Gourde
// to match the rest of the storefront (see src/lib/format.ts formatHTG).
// If your Stripe account rejects HTG (some account countries only support
// settling in a limited currency list), set STRIPE_CURRENCY=usd in
// .env.local and adjust pricing/display accordingly.
export function getStripeCurrency(): string {
  return (process.env.STRIPE_CURRENCY || "htg").toLowerCase();
}

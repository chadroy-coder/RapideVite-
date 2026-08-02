-- Stripe payment tracking columns on orders.
-- Populated when payment_method = 'card': stripe_checkout_session_id is set
-- when the Checkout Session is created, stripe_payment_intent_id is set by
-- the webhook once Stripe confirms the payment succeeded.

alter table public.orders
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

create index if not exists orders_stripe_session_idx on public.orders(stripe_checkout_session_id);

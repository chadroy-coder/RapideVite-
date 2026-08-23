-- Driver/picker link: a single unauthenticated, per-order magic link
-- (orders.driver_access_token) that a driver opens on their phone to (a)
-- broadcast live GPS while delivering, and (b) work through the order's
-- item list, checking items off or flagging them unavailable and proposing
-- a substitute. There is no driver login system yet - the token itself is
-- the access control, validated server-side in src/lib/actions/driver.ts.
-- SMS/push notifications are a later phase; for now the customer sees
-- substitution prompts on their order tracking page (polled, not push).

alter table public.orders
  add column if not exists driver_access_token text unique
    default encode(gen_random_bytes(16), 'hex'),
  add column if not exists driver_lat double precision,
  add column if not exists driver_lng double precision,
  add column if not exists driver_location_updated_at timestamptz;

-- Backfill tokens for any orders created before this migration.
update public.orders set driver_access_token = encode(gen_random_bytes(16), 'hex')
where driver_access_token is null;

alter table public.orders alter column driver_access_token set not null;

create index if not exists orders_driver_token_idx on public.orders(driver_access_token);

-- Per-item fulfillment status, set by whoever is picking/delivering the
-- order via the /livreur/[token] link.
--   pending     - not yet checked
--   found       - picked, all good
--   unavailable - flagged out of stock, no substitute decided yet
--   substituted - customer (or the timeout) accepted a replacement item
--   refunded    - item dropped from the order, no replacement
--
-- substitute_status tracks the customer's response to a proposed swap:
--   proposed      - picker suggested a substitute, awaiting customer response
--   accepted      - customer said yes
--   declined      - customer said no (item becomes refunded)
--   auto_applied  - customer didn't respond in time, picker's suggestion was used
alter table public.order_items
  add column if not exists fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'found', 'unavailable', 'substituted', 'refunded')),
  add column if not exists substitute_product_id uuid references public.products(id) on delete set null,
  add column if not exists substitute_variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists substitute_status text
    check (substitute_status in ('proposed', 'accepted', 'declined', 'auto_applied')),
  add column if not exists substitute_proposed_at timestamptz;

comment on column public.order_items.fulfillment_status is
  'Set from the driver/picker link (/livreur/[token]), not the admin panel. Does not affect order.total - price reconciliation for substitutions/refunds is a manual admin step for now.';

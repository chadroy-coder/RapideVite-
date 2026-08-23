-- Department/commune dropped from the delivery form - between street +
-- neighborhood text and the new optional customer GPS pin below, the formal
-- administrative division was redundant friction for customers. Columns are
-- kept (nullable) rather than dropped so existing order/address history
-- isn't destroyed.

alter table public.orders
  alter column department drop not null,
  alter column commune drop not null;

alter table public.addresses
  alter column department drop not null,
  alter column commune drop not null;

-- One-time customer location share at checkout ("share your location so the
-- driver can find you") - distinct from orders.driver_lat/driver_lng, which
-- is the driver's own live-moving position from the /livreur/[token] page.
-- This is a single pin captured once when the customer taps "share", not a
-- continuous stream.
alter table public.orders
  add column if not exists customer_lat double precision,
  add column if not exists customer_lng double precision,
  add column if not exists customer_location_shared_at timestamptz;

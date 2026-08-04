-- Adds a driver headshot photo alongside the existing driver name
-- (assigned_delivery_person) and estimated_delivery_time columns, so the
-- customer-facing order tracking page can show who's delivering and when.
alter table public.orders
  add column if not exists driver_photo_url text;

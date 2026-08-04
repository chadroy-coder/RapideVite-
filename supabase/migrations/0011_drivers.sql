-- Reusable delivery driver roster, so staff can add a driver's name and
-- headshot once and just pick them from a list per order, instead of
-- re-typing the name and re-uploading the photo on every single order.
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.drivers enable row level security;

-- Staff/admin only - this is an internal roster, never queried directly by
-- customers (the order's own assigned_delivery_person/driver_photo_url
-- columns, copied at assignment time, are what customers see).
drop policy if exists "drivers_staff_all" on public.drivers;
create policy "drivers_staff_all" on public.drivers
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

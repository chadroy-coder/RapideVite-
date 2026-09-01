-- Woulib: ride + package delivery, using the SAME driver roster as grocery
-- delivery (public.drivers) rather than a separate driver marketplace.
-- Follows the exact same "no driver login" pattern as /livreur/[token]:
-- staff assign a request to a roster driver, who gets a per-request magic
-- link (woulib_requests.driver_access_token) to broadcast GPS and update
-- status. Pricing is computed client/server-side from a real driving
-- distance+duration (OSRM public routing API, no key/billing - see
-- src/lib/woulib.ts) times a per-vehicle-type fare formula stored here.

create sequence if not exists woulib_request_number_seq start 1000;

-- Vehicle tiers (car / moto for now). Mirrors the products+variants idea of
-- "one row per option customers pick", but simple enough to be a single
-- table since there's no separate parent/variant relationship here.
create table if not exists public.woulib_vehicle_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('car', 'moto')),
  base_fare numeric(10,2) not null default 0,
  price_per_km numeric(10,2) not null default 0,
  price_per_minute numeric(10,2) not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.woulib_vehicle_types (name, kind, base_fare, price_per_km, price_per_minute, sort_order)
values
  ('Moto', 'moto', 1.00, 0.35, 0.05, 1),
  ('Voiture', 'car', 2.00, 0.55, 0.08, 2)
on conflict do nothing;

create table if not exists public.woulib_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default ('WL-' || nextval('woulib_request_number_seq')::text),
  user_id uuid not null references public.profiles(id) on delete cascade,

  service_type text not null check (service_type in ('ride', 'package')),
  vehicle_type_id uuid not null references public.woulib_vehicle_types(id),

  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_address text,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  dropoff_address text,

  -- 'ride': who's travelling. 'package': who's receiving it. Either way
  -- this is who the driver contacts at drop-off, separate from the
  -- requesting account (auth user might be sending someone else a package).
  contact_name text not null,
  contact_phone text not null,
  package_description text,
  notes text,

  distance_km numeric(8,2),
  duration_minutes numeric(8,2),
  estimated_price numeric(10,2),
  final_price numeric(10,2),

  payment_method text not null default 'cash_on_delivery'
    check (payment_method in ('cash_on_delivery', 'moncash', 'natcash', 'sogebank', 'card')),

  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'en_route_pickup', 'picked_up', 'en_route_dropoff', 'completed', 'cancelled')),

  assigned_driver_id uuid references public.drivers(id) on delete set null,
  driver_access_token text unique default encode(gen_random_bytes(16), 'hex'),
  driver_lat double precision,
  driver_lng double precision,
  driver_location_updated_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists woulib_requests_user_idx on public.woulib_requests(user_id);
create index if not exists woulib_requests_status_idx on public.woulib_requests(status);
create index if not exists woulib_requests_token_idx on public.woulib_requests(driver_access_token);

create or replace function public.set_woulib_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists woulib_requests_set_updated_at on public.woulib_requests;
create trigger woulib_requests_set_updated_at
  before update on public.woulib_requests
  for each row execute function public.set_woulib_updated_at();

alter table public.woulib_vehicle_types enable row level security;
alter table public.woulib_requests enable row level security;

drop policy if exists "woulib_vehicle_types_public_read" on public.woulib_vehicle_types;
create policy "woulib_vehicle_types_public_read" on public.woulib_vehicle_types
  for select using (active = true or public.is_staff_or_admin());

drop policy if exists "woulib_vehicle_types_staff_write" on public.woulib_vehicle_types;
create policy "woulib_vehicle_types_staff_write" on public.woulib_vehicle_types
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

drop policy if exists "woulib_requests_owner_select" on public.woulib_requests;
create policy "woulib_requests_owner_select" on public.woulib_requests
  for select using (user_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "woulib_requests_owner_insert" on public.woulib_requests;
create policy "woulib_requests_owner_insert" on public.woulib_requests
  for insert with check (user_id = auth.uid());

-- No customer UPDATE policy, same reasoning as orders: driver-location
-- writes and status transitions go through the service-role admin client
-- (src/lib/actions/woulib.ts / admin-woulib.ts), with ownership/token
-- checked manually in the server action before calling it.
drop policy if exists "woulib_requests_staff_all" on public.woulib_requests;
create policy "woulib_requests_staff_all" on public.woulib_requests
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

comment on table public.woulib_requests is
  'Ride + package delivery requests. Uses the same driver roster (public.drivers) as grocery orders, assigned by staff, then accessed by the driver via the per-request driver_access_token magic link - no separate driver login system, matching the existing /livreur/[token] pattern.';

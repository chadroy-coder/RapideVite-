-- Row Level Security for RapideVite

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.delivery_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Helper: is the current user staff or admin?
create or replace function public.is_staff_or_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$ language sql security definer stable;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ============ PROFILES ============
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "profiles_admin_update_any" on public.profiles;
create policy "profiles_admin_update_any" on public.profiles
  for update using (public.is_admin());

-- ============ CATEGORIES (public read, staff write) ============
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select using (true);

drop policy if exists "categories_staff_write" on public.categories;
create policy "categories_staff_write" on public.categories
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- ============ PRODUCTS (public read active, staff manage all) ============
drop policy if exists "products_public_read_active" on public.products;
create policy "products_public_read_active" on public.products
  for select using (active = true or public.is_staff_or_admin());

drop policy if exists "products_staff_write" on public.products;
create policy "products_staff_write" on public.products
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- ============ PRODUCT VARIANTS ============
drop policy if exists "variants_public_read_active" on public.product_variants;
create policy "variants_public_read_active" on public.product_variants
  for select using (active = true or public.is_staff_or_admin());

drop policy if exists "variants_staff_write" on public.product_variants;
create policy "variants_staff_write" on public.product_variants
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- ============ ADDRESSES (owner only) ============
drop policy if exists "addresses_owner_all" on public.addresses;
create policy "addresses_owner_all" on public.addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "addresses_staff_read" on public.addresses;
create policy "addresses_staff_read" on public.addresses
  for select using (public.is_staff_or_admin());

-- ============ DELIVERY SETTINGS / ZONES ============
drop policy if exists "delivery_settings_public_read" on public.delivery_settings;
create policy "delivery_settings_public_read" on public.delivery_settings
  for select using (true);

drop policy if exists "delivery_settings_admin_write" on public.delivery_settings;
create policy "delivery_settings_admin_write" on public.delivery_settings
  for update using (public.is_admin());

drop policy if exists "delivery_zones_public_read" on public.delivery_zones;
create policy "delivery_zones_public_read" on public.delivery_zones
  for select using (true);

drop policy if exists "delivery_zones_admin_write" on public.delivery_zones;
create policy "delivery_zones_admin_write" on public.delivery_zones
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- ============ ORDERS (owner + staff) ============
drop policy if exists "orders_owner_select" on public.orders;
create policy "orders_owner_select" on public.orders
  for select using (user_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "orders_owner_insert" on public.orders;
create policy "orders_owner_insert" on public.orders
  for insert with check (user_id = auth.uid());

drop policy if exists "orders_staff_update" on public.orders;
create policy "orders_staff_update" on public.orders
  for update using (public.is_staff_or_admin());

-- ============ ORDER ITEMS ============
drop policy if exists "order_items_owner_select" on public.order_items;
create policy "order_items_owner_select" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff_or_admin()))
  );

drop policy if exists "order_items_owner_insert" on public.order_items;
create policy "order_items_owner_insert" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists "order_items_staff_all" on public.order_items;
create policy "order_items_staff_all" on public.order_items
  for all using (public.is_staff_or_admin());

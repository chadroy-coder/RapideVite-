-- RapideVite initial schema
-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============ ENUMS ============
do $$ begin
  create type user_role as enum ('customer', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash_on_delivery', 'moncash', 'natcash', 'card');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

-- ============ PROFILES (extends auth.users) ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ CATEGORIES ============
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ PRODUCTS ============
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  brand text,
  category_id uuid references public.categories(id) on delete set null,
  subcategory text,
  image_url text,
  additional_images text[] not null default '{}',
  featured boolean not null default false,
  promotion boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(active);
create index if not exists products_name_trgm_idx on public.products using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'')));

-- ============ PRODUCT VARIANTS ============
-- A product can have multiple sizes/volumes, each with its own price + inventory.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  unit text,
  sku text unique,
  barcode text,
  selling_price numeric(12,2) not null,
  previous_price numeric(12,2),
  cost_price numeric(12,2),
  inventory_quantity int not null default 0,
  low_stock_threshold int not null default 5,
  in_stock boolean not null default true,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists variants_product_idx on public.product_variants(product_id);

-- ============ ADDRESSES ============
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default 'Home',
  department text not null,
  commune text not null,
  neighborhood text,
  street text not null,
  delivery_instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses(user_id);

-- ============ DELIVERY SETTINGS (single row for v1, ready for zones later) ============
create table if not exists public.delivery_settings (
  id int primary key default 1,
  standard_delivery_fee numeric(12,2) not null default 150,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.delivery_settings (id, standard_delivery_fee) values (1, 150)
  on conflict (id) do nothing;

-- Placeholder for future per-zone delivery fees
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text,
  commune text,
  fee numeric(12,2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ ORDERS ============
create sequence if not exists order_number_seq start 1000;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('RV-' || nextval('order_number_seq')::text),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  department text not null,
  commune text not null,
  neighborhood text,
  street text not null,
  delivery_instructions text,
  subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  payment_method payment_method not null default 'cash_on_delivery',
  payment_status payment_status not null default 'pending',
  status order_status not null default 'new',
  assigned_delivery_person text,
  estimated_delivery_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- ============ ORDER ITEMS ============
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_label text,
  unit_price numeric(12,2) not null,
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ============ updated_at triggers ============
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated on public.categories;
create trigger trg_categories_updated before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_variants_updated on public.product_variants;
create trigger trg_variants_updated before update on public.product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- auto-create profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone', 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep in_stock in sync with inventory_quantity
create or replace function public.sync_in_stock()
returns trigger as $$
begin
  new.in_stock = (new.inventory_quantity > 0);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_variant_stock_sync on public.product_variants;
create trigger trg_variant_stock_sync before insert or update of inventory_quantity
  on public.product_variants
  for each row execute function public.sync_in_stock();

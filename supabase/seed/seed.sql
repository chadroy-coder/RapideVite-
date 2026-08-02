-- RapideVite seed data: categories + 30+ sample products with variants
-- Run after migrations. Safe to re-run (idempotent via slugs/skus).

insert into public.categories (name, slug, sort_order) values
  ('Boissons', 'boissons', 1),
  ('Eau', 'eau', 2),
  ('Collations', 'collations', 3),
  ('Epicerie', 'epicerie', 4),
  ('Produits menagers', 'produits-menagers', 5),
  ('Soins personnels', 'soins-personnels', 6),
  ('Produits pour bebe', 'produits-bebe', 7),
  ('Produits surgeles', 'produits-surgeles', 8),
  ('Fruits et legumes', 'fruits-legumes', 9),
  ('Pain et petit-dejeuner', 'pain-petit-dejeuner', 10),
  ('Credit et services telephoniques', 'credit-telephone', 11),
  ('Promotions', 'promotions', 12)
on conflict (slug) do nothing;

-- Helper pattern: insert product then its default variant.
-- 1
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Coca-Cola', 'coca-cola', 'Boisson gazeuse classique', 'Coca-Cola',
    (select id from public.categories where slug='boissons'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, previous_price, cost_price, inventory_quantity, is_default)
select id, '355ml', 'can', 'BEV-COKE-355', 75, 85, 55, 120, true from p
on conflict (sku) do nothing;

-- 2
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Sprite', 'sprite', 'Boisson gazeuse au citron-lime', 'Sprite',
    (select id from public.categories where slug='boissons'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '355ml', 'can', 'BEV-SPRITE-355', 75, 55, 100, true from p
on conflict (sku) do nothing;

-- 3
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Jus Tampico', 'jus-tampico', 'Jus aux fruits tropicaux', 'Tampico',
    (select id from public.categories where slug='boissons'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '1L', 'bottle', 'BEV-TAMPICO-1L', 150, 110, 60, true from p
on conflict (sku) do nothing;

-- 4
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Malta', 'malta', 'Boisson de malt', 'Malta India',
    (select id from public.categories where slug='boissons'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '355ml', 'can', 'BEV-MALTA-355', 90, 65, 80, true from p
on conflict (sku) do nothing;

-- 5
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Cafe Rebo', 'cafe-rebo', 'Cafe haitien moulu', 'Rebo',
    (select id from public.categories where slug='boissons'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '400g', 'bag', 'BEV-CAFEREBO-400', 350, 260, 40, true from p
on conflict (sku) do nothing;

-- 6 water
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Culligan Eau', 'culligan-eau', 'Eau purifiee en bouteille', 'Culligan',
    (select id from public.categories where slug='eau'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '500ml', 'bottle', 'WTR-CULLIGAN-500', 25, 15, 300, true from p
on conflict (sku) do nothing;

-- 7
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Culligan Eau', 'culligan-eau-1gal', 'Eau purifiee - grand format', 'Culligan',
    (select id from public.categories where slug='eau'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '5gal', 'jug', 'WTR-CULLIGAN-5G', 250, 180, 25, true from p
on conflict (sku) do nothing;

-- 8
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Alaska Eau', 'alaska-eau', 'Eau en bouteille', 'Alaska',
    (select id from public.categories where slug='eau'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '1L', 'bottle', 'WTR-ALASKA-1L', 40, 28, 150, true from p
on conflict (sku) do nothing;

-- 9 snacks
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Chips Barbecue', 'chips-barbecue', 'Croustilles saveur barbecue', 'Lays',
    (select id from public.categories where slug='collations'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '184g', 'bag', 'SNK-LAYSBBQ-184', 175, 130, 70 , true from p
on conflict (sku) do nothing;

-- 10
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Doritos Nacho', 'doritos-nacho', 'Tortillas epicees au fromage', 'Doritos',
    (select id from public.categories where slug='collations'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '184g', 'bag', 'SNK-DORITOS-184', 180, 135, 65, true from p
on conflict (sku) do nothing;

-- 11
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Peanuts grilles', 'peanuts-grilles', 'Arachides grillees et salees', 'Local',
    (select id from public.categories where slug='collations'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '150g', 'bag', 'SNK-PEANUTS-150', 100, 65, 90, true from p
on conflict (sku) do nothing;

-- 12
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Oreo', 'oreo', 'Biscuits chocolat fourres a la creme', 'Oreo',
    (select id from public.categories where slug='collations'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '133g', 'pack', 'SNK-OREO-133', 150, 105, 85, true from p
on conflict (sku) do nothing;

-- 13 groceries
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Riz', 'riz', 'Riz blanc long grain', 'Local',
    (select id from public.categories where slug='epicerie'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '5lb', 'bag', 'GRO-RIZ-5LB', 320, 250, 100, true from p
on conflict (sku) do nothing;

-- 14
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Huile de cuisine', 'huile-cuisine', 'Huile vegetale', 'Marina',
    (select id from public.categories where slug='epicerie'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '1L', 'bottle', 'GRO-HUILE-1L', 280, 210, 70, true from p
on conflict (sku) do nothing;

-- 15
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Sucre blanc', 'sucre-blanc', 'Sucre granule', 'Local',
    (select id from public.categories where slug='epicerie'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '2lb', 'bag', 'GRO-SUCRE-2LB', 130, 95, 90, true from p
on conflict (sku) do nothing;

-- 16
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Farine', 'farine', 'Farine de ble tout usage', 'Gold Medal',
    (select id from public.categories where slug='epicerie'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '2lb', 'bag', 'GRO-FARINE-2LB', 140, 100, 75, true from p
on conflict (sku) do nothing;

-- 17
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Spaghetti', 'spaghetti', 'Pates alimentaires', 'Barilla',
    (select id from public.categories where slug='epicerie'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '454g', 'pack', 'GRO-SPAG-454', 175, 130, 60, true from p
on conflict (sku) do nothing;

-- 18 household
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Detergent liquide', 'detergent-liquide', 'Detergent pour lessive', 'Ariel',
    (select id from public.categories where slug='produits-menagers'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '1L', 'bottle', 'HH-ARIEL-1L', 260, 190, 55 , true from p
on conflict (sku) do nothing;

-- 19
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Eau de javel', 'eau-de-javel', 'Javellisant desinfectant', 'Clorox',
    (select id from public.categories where slug='produits-menagers'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '1L', 'bottle', 'HH-CLOROX-1L', 150, 105, 65, true from p
on conflict (sku) do nothing;

-- 20
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Papier hygienique', 'papier-hygienique', 'Papier de toilette double epaisseur', 'Charmin',
    (select id from public.categories where slug='produits-menagers'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '4 rouleaux', 'pack', 'HH-CHARMIN-4R', 220, 165, 80, true from p
on conflict (sku) do nothing;

-- 21 personal care
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Savon de bain', 'savon-de-bain', 'Savon hydratant', 'Dove',
    (select id from public.categories where slug='soins-personnels'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '106g', 'bar', 'PC-DOVE-106', 110, 75, 100, true from p
on conflict (sku) do nothing;

-- 22
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Dentifrice', 'dentifrice', 'Pate dentifrice au fluor', 'Colgate',
    (select id from public.categories where slug='soins-personnels'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '100ml', 'tube', 'PC-COLGATE-100', 150, 105, 90, true from p
on conflict (sku) do nothing;

-- 23
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Shampooing', 'shampooing', 'Shampooing hydratant', 'Pantene',
    (select id from public.categories where slug='soins-personnels'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '400ml', 'bottle', 'PC-PANTENE-400', 320, 240, 45, true from p
on conflict (sku) do nothing;

-- 24 baby
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Couches', 'couches', 'Couches pour bebe taille 3', 'Pampers',
    (select id from public.categories where slug='produits-bebe'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '30 unites', 'pack', 'BB-PAMPERS-30', 650, 500, 30, true from p
on conflict (sku) do nothing;

-- 25
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Lait pour bebe', 'lait-bebe', 'Lait en poudre pour nourrisson', 'Similac',
    (select id from public.categories where slug='produits-bebe'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '400g', 'can', 'BB-SIMILAC-400', 850, 650, 20, true from p
on conflict (sku) do nothing;

-- 26 frozen
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Poulet congele', 'poulet-congele', 'Cuisses de poulet congelees', 'Tyson',
    (select id from public.categories where slug='produits-surgeles'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '2lb', 'bag', 'FZ-POULET-2LB', 380, 290, 40, true from p
on conflict (sku) do nothing;

-- 27
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Legumes melanges congeles', 'legumes-melanges', 'Melange de legumes surgeles', 'Local',
    (select id from public.categories where slug='produits-surgeles'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '400g', 'bag', 'FZ-LEGUMES-400', 160, 115, 55, true from p
on conflict (sku) do nothing;

-- 28 produce
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Bananes', 'bananes', 'Bananes fraiches locales', 'Local',
    (select id from public.categories where slug='fruits-legumes'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '1lb', 'lb', 'PR-BANANE-1LB', 45, 25, 200, true from p
on conflict (sku) do nothing;

-- 29
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Tomates', 'tomates', 'Tomates fraiches', 'Local',
    (select id from public.categories where slug='fruits-legumes'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '1lb', 'lb', 'PR-TOMATE-1LB', 60, 35, 150, true from p
on conflict (sku) do nothing;

-- 30
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Avocat', 'avocat', 'Avocats murs', 'Local',
    (select id from public.categories where slug='fruits-legumes'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, 'unite', 'each', 'PR-AVOCAT-1', 35, 20, 180, true from p
on conflict (sku) do nothing;

-- 31 bread
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Pain haitien', 'pain-haitien', 'Pain traditionnel frais', 'Boulangerie locale',
    (select id from public.categories where slug='pain-petit-dejeuner'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, 'unite', 'each', 'BR-PAINHT-1', 50, 30, 100, true from p
on conflict (sku) do nothing;

-- 32
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Corn Flakes', 'corn-flakes', 'Cereales de petit-dejeuner', 'Kellogg''s',
    (select id from public.categories where slug='pain-petit-dejeuner'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '500g', 'box', 'BR-CORNFLK-500', 380, 290, 35, true from p
on conflict (sku) do nothing;

-- 33 phone credit
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, featured)
  values ('Recharge Digicel', 'recharge-digicel', 'Credit prepaye Digicel', 'Digicel',
    (select id from public.categories where slug='credit-telephone'), '/products/placeholder.svg', true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '100 HTG', 'credit', 'TEL-DIGICEL-100', 100, 100, 999, true from p
on conflict (sku) do nothing;

-- 34
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url)
  values ('Recharge Natcom', 'recharge-natcom', 'Credit prepaye Natcom', 'Natcom',
    (select id from public.categories where slug='credit-telephone'), '/products/placeholder.svg')
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, cost_price, inventory_quantity, is_default)
select id, '100 HTG', 'credit', 'TEL-NATCOM-100', 100, 100, 999, true from p
on conflict (sku) do nothing;

-- 35 promo item (references drinks category but flagged as promotion + also tagged for Promotions listing via promotion=true)
with p as (
  insert into public.products (name, slug, description, brand, category_id, image_url, promotion, featured)
  values ('Pack Coca-Cola x6', 'pack-coca-cola-x6', 'Pack de 6 canettes en promotion', 'Coca-Cola',
    (select id from public.categories where slug='boissons'), '/products/placeholder.svg', true, true)
  on conflict (slug) do update set name = excluded.name returning id)
insert into public.product_variants (product_id, size, unit, sku, selling_price, previous_price, cost_price, inventory_quantity, is_default)
select id, '6x355ml', 'pack', 'BEV-COKE-PACK6', 400, 480, 330, 50, true from p
on conflict (sku) do nothing;

-- Note: to create a test admin account, sign up normally via /register with
-- admin@rapidevite.ht, then run:
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'admin@rapidevite.ht');

-- Full category rework: replaces the old, fragmented category list with the
-- 21-category list requested. This migration supersedes 0007 (it re-does the
-- meat/deli merge with slug variants covering both the pre- and post-0007
-- state, so it's safe whether or not 0007 was already run).
--
-- Naming follows the rest of the app's convention of plain ASCII (no French
-- accents) to avoid encoding issues elsewhere in the codebase.

-- ---------- Viandes & charcuterie: merge all meat/deli variants ----------
update public.categories
set name = 'Viandes & charcuterie', slug = 'viandes-charcuterie'
where slug in ('viande-charcuterie', 'viande');

update public.products
set category_id = (select id from public.categories where slug = 'viandes-charcuterie')
where category_id in (
  select id from public.categories
  where slug in ('charcuterie-tranchee', 'charcuterie-saucisses', 'saucisses-hot-dogs', 'bacon')
);

delete from public.categories
where slug in ('charcuterie-tranchee', 'charcuterie-saucisses', 'saucisses-hot-dogs', 'bacon');

-- ---------- Boissons: merge Eau into Boissons ----------
update public.products
set category_id = (select id from public.categories where slug = 'boissons')
where category_id in (select id from public.categories where slug = 'eau');

delete from public.categories where slug = 'eau';

-- ---------- Credit et services telephoniques: remove entirely ----------
-- Deactivate rather than hard-delete the products, so existing order
-- history referencing them stays intact - they just disappear from the
-- storefront immediately (same effect as deleting, safer for order data).
update public.products
set active = false
where category_id in (select id from public.categories where slug = 'credit-telephone');

delete from public.categories where slug = 'credit-telephone';

-- ---------- Simple renames (existing category kept, name updated) ----------
update public.categories set name = 'Fruits & legumes' where slug = 'fruits-legumes';
update public.categories set name = 'Epicerie' where slug = 'epicerie';
update public.categories set name = 'Produits surgeles' where slug = 'produits-surgeles';
update public.categories set name = 'Pain & patisserie', slug = 'pain-patisserie' where slug = 'pain-petit-dejeuner';
update public.categories set name = 'Alcools & spiritueux', slug = 'alcools-spiritueux' where slug = 'alcool-spiritueux';
update public.categories set name = 'Collations & friandises', slug = 'collations-friandises' where slug = 'collations';
update public.categories set name = 'Produits menagers' where slug = 'produits-menagers';
update public.categories set name = 'Hygiene & soins personnels', slug = 'hygiene-soins-personnels' where slug = 'soins-personnels';
update public.categories set name = 'Produits pour bebe' where slug = 'produits-bebe';
update public.categories set name = 'Fleurs' where slug = 'fleurs';
update public.categories set name = 'Promotions' where slug = 'promotions';
update public.categories set name = 'Boissons' where slug = 'boissons';

-- ---------- New categories with no existing equivalent (created empty) ----------
insert into public.categories (name, slug, sort_order) values
  ('Produits laitiers & oeufs', 'produits-laitiers-oeufs', 4),
  ('Poissons & fruits de mer', 'poissons-fruits-de-mer', 6),
  ('Petit-dejeuner', 'petit-dejeuner', 9),
  ('Sante & pharmacie', 'sante-pharmacie', 16),
  ('Papier & produits jetables', 'papier-produits-jetables', 17),
  ('Cuisine & maison', 'cuisine-maison', 18),
  ('Produits pour animaux', 'produits-animaux', 19),
  ('Electronique & accessoires', 'electronique-accessoires', 20)
on conflict (slug) do nothing;

-- ---------- Final display order, matching the requested list ----------
update public.categories set sort_order = 1 where slug = 'promotions';
update public.categories set sort_order = 2 where slug = 'fruits-legumes';
update public.categories set sort_order = 3 where slug = 'epicerie';
update public.categories set sort_order = 4 where slug = 'produits-laitiers-oeufs';
update public.categories set sort_order = 5 where slug = 'viandes-charcuterie';
update public.categories set sort_order = 6 where slug = 'poissons-fruits-de-mer';
update public.categories set sort_order = 7 where slug = 'produits-surgeles';
update public.categories set sort_order = 8 where slug = 'pain-patisserie';
update public.categories set sort_order = 9 where slug = 'petit-dejeuner';
update public.categories set sort_order = 10 where slug = 'boissons';
update public.categories set sort_order = 11 where slug = 'alcools-spiritueux';
update public.categories set sort_order = 12 where slug = 'collations-friandises';
update public.categories set sort_order = 13 where slug = 'produits-menagers';
update public.categories set sort_order = 14 where slug = 'hygiene-soins-personnels';
update public.categories set sort_order = 15 where slug = 'produits-bebe';
update public.categories set sort_order = 16 where slug = 'sante-pharmacie';
update public.categories set sort_order = 17 where slug = 'papier-produits-jetables';
update public.categories set sort_order = 18 where slug = 'cuisine-maison';
update public.categories set sort_order = 19 where slug = 'produits-animaux';
update public.categories set sort_order = 20 where slug = 'electronique-accessoires';
update public.categories set sort_order = 21 where slug = 'fleurs';

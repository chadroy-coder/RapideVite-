-- Consolidate fragmented meat/deli categories into two:
--   viande-charcuterie -> "Viande" (fresh meat)
--   charcuterie-tranchee, saucisses-hot-dogs, bacon -> "Charcuterie et saucisses"
-- Products are reassigned to the surviving category before the redundant
-- rows are deleted, so nothing loses its category.

update public.categories
set name = 'Viande', slug = 'viande'
where slug = 'viande-charcuterie';

update public.categories
set name = 'Charcuterie et saucisses', slug = 'charcuterie-saucisses'
where slug = 'charcuterie-tranchee';

update public.products
set category_id = (select id from public.categories where slug = 'charcuterie-saucisses')
where category_id in (
  select id from public.categories where slug in ('saucisses-hot-dogs', 'bacon')
);

delete from public.categories where slug in ('saucisses-hot-dogs', 'bacon');

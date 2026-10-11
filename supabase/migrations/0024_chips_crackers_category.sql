-- Dedicated aisle for crackers, chips and salty snacks.
update public.categories set sort_order = sort_order + 1 where sort_order >= 20;
insert into public.categories (name, slug, sort_order) values ('Chips, crackers & snacks', 'chips-crackers', 20) on conflict (slug) do nothing;
update public.products set category_id = (select id from public.categories where slug = 'chips-crackers')
where category_id = (select id from public.categories where slug = 'collations-friandises')
  and name ~* 'popcorn|crackers|nut-thins|kettle cooked|good thins|tartines|galettes de riz';

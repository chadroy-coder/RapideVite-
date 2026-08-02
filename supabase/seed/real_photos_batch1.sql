-- Real stock photos (Pexels, free-license) applied to specific products by slug.
-- Safe to re-run. Products not listed here keep their category icon for now.

update public.products set image_url = 'https://images.pexels.com/photos/5860659/pexels-photo-5860659.jpeg'
  where slug in ('coca-cola', 'sprite', 'malta', 'pack-coca-cola-x6');

update public.products set image_url = 'https://images.pexels.com/photos/37539910/pexels-photo-37539910/free-photo-of-artisan-coffee-packaging-process-in-shop.jpeg'
  where slug = 'cafe-rebo';

update public.products set image_url = 'https://images.pexels.com/photos/31699476/pexels-photo-31699476/free-photo-of-close-up-of-plastic-bottles-with-green-caps.jpeg'
  where slug in ('alaska-eau', 'culligan-eau', 'culligan-eau-1gal');

update public.products set image_url = 'https://images.pexels.com/photos/13060679/pexels-photo-13060679.jpeg'
  where slug = 'chips-barbecue';

update public.products set image_url = 'https://images.pexels.com/photos/7033900/pexels-photo-7033900.jpeg'
  where slug = 'doritos-nacho';

update public.products set image_url = 'https://images.pexels.com/photos/14238105/pexels-photo-14238105.jpeg'
  where slug = 'riz';

update public.products set image_url = 'https://images.pexels.com/photos/21582446/pexels-photo-21582446/free-photo-of-plastic-bags-of-sugar-on-shelf-in-store.jpeg'
  where slug = 'sucre-blanc';

update public.products set image_url = 'https://images.pexels.com/photos/6294374/pexels-photo-6294374.jpeg'
  where slug = 'farine';

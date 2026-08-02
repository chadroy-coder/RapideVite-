-- Real isolated-on-white stock photos (Pexels, free license) - matches the
-- clean e-commerce product-shot style. Safe to re-run; overwrites batch1
-- entries with cleaner versions where found.

update public.products set image_url = 'https://images.pexels.com/photos/9462408/pexels-photo-9462408.jpeg'
  where slug in ('coca-cola', 'sprite', 'malta', 'pack-coca-cola-x6');

update public.products set image_url = 'https://images.pexels.com/photos/2479095/pexels-photo-2479095.jpeg'
  where slug in ('alaska-eau', 'culligan-eau', 'culligan-eau-1gal');

update public.products set image_url = 'https://images.pexels.com/photos/7033649/pexels-photo-7033649.jpeg'
  where slug = 'chips-barbecue';

update public.products set image_url = 'https://images.pexels.com/photos/36346843/pexels-photo-36346843/free-photo-of-close-up-of-uncooked-white-rice-grains.jpeg'
  where slug = 'riz';

update public.products set image_url = 'https://images.pexels.com/photos/41165/baby-cloth-clothing-color-41165.jpeg'
  where slug = 'couches';

update public.products set image_url = 'https://images.pexels.com/photos/5342631/pexels-photo-5342631.jpeg'
  where slug = 'bananes';

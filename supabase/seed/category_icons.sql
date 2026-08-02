-- Apply distinct category icon images to every product that still has the
-- generic placeholder image, based on its category. Safe to re-run.

update public.products p
set image_url = '/categories/' || c.slug || '.svg'
from public.categories c
where p.category_id = c.id
  and (p.image_url is null or p.image_url = '/products/placeholder.svg');

-- Also update category thumbnails themselves, so the category pills/cards look right too.
update public.categories set image_url = '/categories/' || slug || '.svg';

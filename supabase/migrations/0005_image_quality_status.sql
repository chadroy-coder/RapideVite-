-- Tracks whether a product's image has been verified as a real, clean,
-- front-facing packshot (as opposed to a shelf crop, blurry photo, or a
-- photo with no image at all). This is separate from is_draft_product:
-- a product can be verified/priced but still waiting on a better photo.
--
-- Values:
--   'approved'          - image reviewed and meets the quality bar
--   'needs_replacement' - has an image, but it does not meet the bar
--   'missing'           - no image at all
--
-- Nothing with image_quality_status != 'approved' should ever be treated
-- as ready for the storefront, regardless of is_draft_product.

alter table public.products
  add column if not exists image_quality_status text not null default 'missing'
    check (image_quality_status in ('approved', 'needs_replacement', 'missing'));

create index if not exists products_image_quality_idx on public.products(image_quality_status);

-- Backfill: any product that currently has no image_url is 'missing' by
-- definition (covers the legacy sample products, which were stripped of
-- their placeholder images earlier).
update public.products
set image_quality_status = 'missing'
where image_url is null or image_url = '';

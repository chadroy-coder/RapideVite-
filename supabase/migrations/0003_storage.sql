-- Storage bucket for product images
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product_images_staff_write" on storage.objects;
create policy "product_images_staff_write" on storage.objects
  for insert with check (
    bucket_id = 'product-images' and public.is_staff_or_admin()
  );

drop policy if exists "product_images_staff_update" on storage.objects;
create policy "product_images_staff_update" on storage.objects
  for update using (
    bucket_id = 'product-images' and public.is_staff_or_admin()
  );

drop policy if exists "product_images_staff_delete" on storage.objects;
create policy "product_images_staff_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images' and public.is_staff_or_admin()
  );

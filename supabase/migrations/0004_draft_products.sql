-- Draft product support for the Open Food Facts importer.
-- Draft products are visible to staff/admin (with a badge) but must never
-- appear to customers, regardless of the `active` flag.

alter table public.products
  add column if not exists is_draft_product boolean not null default false;

create index if not exists products_draft_idx on public.products(is_draft_product);

-- Replace the public product read policy so drafts are excluded for
-- everyone except staff/admin.
drop policy if exists "products_public_read_active" on public.products;
create policy "products_public_read_active" on public.products
  for select using (
    (active = true and is_draft_product = false) or public.is_staff_or_admin()
  );

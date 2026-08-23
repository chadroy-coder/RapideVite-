-- Manual payment methods (MonCash, NatCash, Sogebank transfer): customer
-- sends money directly to RapidVite's account, then uploads a screenshot of
-- the transaction as proof. The order stays payment_status = 'pending'
-- until an admin reviews the screenshot and marks it paid/failed.
--
-- Note: 'card' (Stripe) and 'cash_on_delivery' flows are untouched by this
-- migration - this only adds Sogebank as a third manual method alongside
-- the existing MonCash/NatCash, plus a place to store the proof image.

alter type payment_method add value if not exists 'sogebank';

alter table public.orders
  add column if not exists payment_proof_url text;

comment on column public.orders.payment_proof_url is
  'Storage path (in the payment-proofs bucket) of the customer-uploaded screenshot proving a MonCash/NatCash/Sogebank transfer. Null for card and cash_on_delivery orders.';

-- Private bucket - screenshots may contain personal financial info, so
-- unlike product-images this is never public. Reads happen server-side via
-- the service-role client generating short-lived signed URLs for admins.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "payment_proofs_staff_read" on storage.objects;
create policy "payment_proofs_staff_read" on storage.objects
  for select using (
    bucket_id = 'payment-proofs' and public.is_staff_or_admin()
  );

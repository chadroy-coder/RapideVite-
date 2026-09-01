-- Woulib requests can already collect a MonCash/NatCash/Sogebank payment
-- method choice (see 0019_woulib.sql), but nothing tracks whether that
-- manual transfer was ever verified - unlike grocery orders, which have
-- payment_status + payment_proof_url (see 0015_manual_payment_proof.sql).
-- This brings Woulib up to the same standard: a status column staff can
-- confirm/reject, and a place to store the customer's transfer screenshot.
--
-- Reuses the existing private "payment-proofs" storage bucket (its RLS
-- policy is scoped to bucket_id only, not to a path prefix) under a
-- woulib/<request id>/... prefix, so no new bucket or policy is needed.

alter table public.woulib_requests
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed'));

alter table public.woulib_requests
  add column if not exists payment_proof_url text;

comment on column public.woulib_requests.payment_status is
  'For moncash/natcash/sogebank requests: pending until staff verify the uploaded transfer screenshot, then paid or failed. Not meaningful for cash_on_delivery/card.';

comment on column public.woulib_requests.payment_proof_url is
  'Storage path (in the payment-proofs bucket, woulib/ prefix) of the customer-uploaded screenshot proving a MonCash/NatCash/Sogebank transfer. Null for card and cash_on_delivery requests.';

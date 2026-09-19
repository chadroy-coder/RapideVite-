-- Driver/Woulib magic links (orders.driver_access_token,
-- woulib_requests.driver_access_token) previously never expired and were
-- reusable indefinitely, even after the delivery/ride was already
-- delivered/completed - a real risk if a link is forwarded, screenshotted,
-- or just sits in someone's message history, since it grants GPS-broadcasting
-- and order-mutation access with no login at all.
--
-- Two layers of defense now: (1) application code (src/lib/actions/driver.ts,
-- src/lib/actions/woulib-driver.ts) rejects the token once the order/request
-- reaches a terminal status (delivered/cancelled, completed/cancelled) - the
-- normal case, since almost every link naturally reaches a terminal status
-- within hours; (2) this expiry timestamp is a backstop for the abnormal
-- case - an order/request that's abandoned mid-flow and never reaches a
-- terminal status - so the link can't stay valid forever regardless.
--
-- 72 hours is generous enough to cover any realistic single delivery/ride
-- (including a customer-side delay mid-flow) while still bounding exposure.

alter table public.orders
  add column if not exists driver_access_token_expires_at timestamptz
    default (now() + interval '72 hours');

alter table public.woulib_requests
  add column if not exists driver_access_token_expires_at timestamptz
    default (now() + interval '72 hours');

-- Backfill already-issued tokens with the same generous window starting now
-- (not retroactively, which would instantly expire in-flight deliveries).
update public.orders
set driver_access_token_expires_at = now() + interval '72 hours'
where driver_access_token_expires_at is null;

update public.woulib_requests
set driver_access_token_expires_at = now() + interval '72 hours'
where driver_access_token_expires_at is null;

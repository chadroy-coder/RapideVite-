-- RapidVit Plus+ subscription: $30/month, card only, unlimited (free)
-- delivery for the billing period. One row per user; the webhook (service
-- role, bypasses RLS) is the only writer - users can only read their own row.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'inactive', -- active, past_due, canceled, inactive
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_stripe_sub_idx on public.subscriptions(stripe_subscription_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_owner_read" on public.subscriptions;
create policy "subscriptions_owner_read" on public.subscriptions
  for select using (user_id = auth.uid());

drop policy if exists "subscriptions_staff_read" on public.subscriptions;
create policy "subscriptions_staff_read" on public.subscriptions
  for select using (public.is_staff_or_admin());

-- No insert/update/delete policy for regular users - only the webhook
-- (service-role client, bypasses RLS) writes to this table.

drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

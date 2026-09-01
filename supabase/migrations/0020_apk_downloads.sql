-- Tracks each time someone downloads the sideloaded APK from /telecharger
-- (set up while the Play Store listing is still pending review). One row
-- per download, logged by the /api/download-apk route handler via the
-- service-role client - no public insert policy needed since nothing but
-- that route ever writes here.

create table if not exists public.apk_downloads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.apk_downloads enable row level security;

drop policy if exists "apk_downloads_staff_read" on public.apk_downloads;
create policy "apk_downloads_staff_read" on public.apk_downloads
  for select using (public.is_staff_or_admin());
